-- Field CRM schema
-- Run in the Supabase SQL editor (or `supabase db push`).
-- Extends the existing property-maintenance tables with CRM + Zoho.

-- ========== Existing core (safe to re-run) ==========

create table if not exists sites (
  id text primary key,
  name text not null,
  address text,
  active boolean not null default true
);

create table if not exists people (
  id text primary key,
  name text not null,
  role text not null check (role in ('staff', 'contractor', 'manager')),
  email text,
  phone text,
  business_name text,
  staff_id text,
  active boolean not null default true,
  sort_order int not null default 0,
  auth_user_id uuid unique
);

create or replace view roster as
  select id, name, role, active, sort_order from people where active = true;

create table if not exists site_assignments (
  person_id text not null references people(id) on delete cascade,
  site_id text not null references sites(id) on delete cascade,
  primary key (person_id, site_id)
);

create table if not exists reports (
  id text primary key,
  date date not null,
  worker_name text,
  worker_type text,
  arrival text,
  departure text,
  hours numeric,
  tasks jsonb not null default '[]',
  photo_count int not null default 0,
  delays text,
  delay_explain text,
  delay_notes text,
  tomorrow text,
  full_check text,
  submitted_at timestamptz,
  site_id text references sites(id),
  photos jsonb not null default '[]',
  photo_paths text[] not null default '{}'
);

create index if not exists reports_date_idx on reports (date);
create index if not exists reports_site_idx on reports (site_id);

create table if not exists assigned_tasks (
  id text primary key,
  date date not null,
  task_text text not null,
  assigned_to text[] not null default '{}',
  created_at timestamptz,
  active boolean not null default true,
  start_time text,
  end_time text,
  acknowledged_by jsonb not null default '[]'
);

create table if not exists tasks (
  id text primary key,
  site_id text not null references sites(id),
  date date not null,
  title text not null,
  details text,
  priority text not null default 'normal',
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'blocked', 'done', 'cancelled')),
  scheduled_start text,
  scheduled_end text,
  actual_start timestamptz,
  actual_end timestamptz,
  completion_note text,
  status_changed_at timestamptz,
  created_by text references people(id),
  updated_by text references people(id),
  active boolean not null default true,
  updated_at timestamptz default now()
);

create table if not exists task_assignees (
  task_id text not null references tasks(id) on delete cascade,
  person_id text not null references people(id) on delete cascade,
  acknowledged_at timestamptz,
  primary key (task_id, person_id)
);

create table if not exists manager_schedule (
  id text primary key,
  owner_id text not null references people(id),
  date date not null,
  start_time text,
  end_time text,
  title text not null,
  notes text,
  created_by text references people(id),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'declined')),
  decided_at timestamptz,
  active boolean not null default true
);

-- ========== CRM ==========

create table if not exists customers (
  id text primary key,
  name text not null,
  company text,
  email text,
  phone text,
  abn text,
  billing_address text,
  notes text,
  status text not null default 'active'
    check (status in ('active', 'prospect', 'inactive')),
  active boolean not null default true,
  zoho_contact_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_name_idx on customers (name);

create table if not exists projects (
  id text primary key,
  name text not null,
  customer_id text not null references customers(id),
  site_id text references sites(id),
  status text not null default 'lead'
    check (status in ('lead', 'quoted', 'approved', 'in_progress', 'on_hold', 'complete', 'cancelled')),
  description text,
  budget numeric,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_customer_idx on projects (customer_id);
create index if not exists projects_status_idx on projects (status);

create table if not exists project_costs (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  description text not null,
  cost_type text not null default 'other'
    check (cost_type in ('labour', 'materials', 'plant', 'subcontractor', 'other')),
  quantity numeric not null default 1,
  unit_rate numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists project_costs_project_idx on project_costs (project_id);

create table if not exists quotes (
  id text primary key,
  project_id text references projects(id) on delete set null,
  customer_id text not null references customers(id),
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'declined', 'expired')),
  subtotal numeric not null default 0,
  tax numeric not null default 0,
  total numeric not null default 0,
  notes text,
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invoices (
  id text primary key,
  project_id text references projects(id) on delete set null,
  customer_id text not null references customers(id),
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'paid', 'void', 'overdue')),
  currency text not null default 'AUD',
  subtotal numeric not null default 0,
  tax numeric not null default 0,
  total numeric not null default 0,
  notes text,
  zoho_invoice_id text,
  zoho_synced_at timestamptz,
  issued_at timestamptz,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_project_idx on invoices (project_id);
create index if not exists invoices_status_idx on invoices (status);

create table if not exists invoice_lines (
  id text primary key,
  invoice_id text not null references invoices(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1,
  unit_rate numeric not null default 0,
  amount numeric not null default 0,
  cost_type text
);

-- ========== Zoho bridge ==========

-- Refresh tokens must NEVER be selected by the anon/authenticated client.
-- Only the edge function (service role) reads token columns.
create table if not exists zoho_connections (
  id text primary key default gen_random_uuid()::text,
  org_name text,
  region text not null default 'au',
  status text not null default 'disconnected'
    check (status in ('connected', 'disconnected', 'error')),
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  connected_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create table if not exists zoho_sync_log (
  id bigserial primary key,
  action text not null,
  status text not null,
  payload jsonb,
  error text,
  created_at timestamptz not null default now()
);

-- ========== RLS (managers write CRM; staff read little) ==========

alter table customers enable row level security;
alter table projects enable row level security;
alter table project_costs enable row level security;
alter table quotes enable row level security;
alter table invoices enable row level security;
alter table invoice_lines enable row level security;
alter table zoho_connections enable row level security;
alter table zoho_sync_log enable row level security;

-- Helper: is the signed-in user a manager?
create or replace function is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from people
    where auth_user_id = auth.uid() and role = 'manager' and active = true
  );
$$;

drop policy if exists customers_manager_all on customers;
create policy customers_manager_all on customers
  for all using (is_manager()) with check (is_manager());

drop policy if exists projects_manager_all on projects;
create policy projects_manager_all on projects
  for all using (is_manager()) with check (is_manager());

drop policy if exists project_costs_manager_all on project_costs;
create policy project_costs_manager_all on project_costs
  for all using (is_manager()) with check (is_manager());

drop policy if exists quotes_manager_all on quotes;
create policy quotes_manager_all on quotes
  for all using (is_manager()) with check (is_manager());

drop policy if exists invoices_manager_all on invoices;
create policy invoices_manager_all on invoices
  for all using (is_manager()) with check (is_manager());

drop policy if exists invoice_lines_manager_all on invoice_lines;
create policy invoice_lines_manager_all on invoice_lines
  for all using (is_manager()) with check (is_manager());

-- Clients may read connection status fields only (tokens blocked by column grants below).
drop policy if exists zoho_connections_manager_read on zoho_connections;
create policy zoho_connections_manager_read on zoho_connections
  for select using (is_manager());

drop policy if exists zoho_connections_manager_update_status on zoho_connections;
create policy zoho_connections_manager_update_status on zoho_connections
  for update using (is_manager()) with check (is_manager());

drop policy if exists zoho_sync_log_manager_all on zoho_sync_log;
create policy zoho_sync_log_manager_all on zoho_sync_log
  for all using (is_manager()) with check (is_manager());

-- Strip token columns from the authenticated role; service_role (edge fn) keeps them.
revoke select on zoho_connections from authenticated, anon;
grant select (id, org_name, region, status, connected_at, last_error, created_at)
  on zoho_connections to authenticated;
grant update (status, last_error) on zoho_connections to authenticated;

-- Storage bucket for work photos (create in dashboard if missing)
-- insert into storage.buckets (id, name, public) values ('work-photos', 'work-photos', false)
-- on conflict do nothing;
