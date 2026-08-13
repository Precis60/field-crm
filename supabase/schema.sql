-- Field CRM schema
-- Run in the Supabase SQL editor (or `supabase db push`).
-- Extends the existing property-maintenance tables with CRM.

-- ========== Existing core (safe to re-run) ==========

create table if not exists sites (
  id text primary key,
  name text not null,
  address text,
  contact_name text,
  contact_phone text,
  contact_email text,
  active boolean not null default true,
  status text not null default 'active' check (status in ('speculative', 'active', 'archived'))
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
  position text,
  company text,
  email text,
  phone text,
  abn text,
  billing_address text,
  site_contact_id text references contacts(id) on delete set null,
  notes text,
  status text not null default 'active'
    check (status in ('active', 'prospect', 'inactive')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_name_idx on customers (name);

create table if not exists contacts (
  id text primary key,
  name text not null,
  company text,
  role text,
  email text,
  phone text,
  notes text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_name_idx on contacts (name);

create table if not exists projects (
  id text primary key,
  name text not null,
  customer_id text not null references customers(id),
  site_id text references sites(id),
  status text not null default 'lead'
    check (status in ('lead', 'quoted', 'approved', 'in_progress', 'on_hold', 'complete', 'cancelled')),
  state text not null default 'active'
    check (state in ('active', 'archived', 'completed')),
  description text,
  budget numeric,
  contact_id text references contacts(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_customer_idx on projects (customer_id);
create index if not exists projects_status_idx on projects (status);

create table if not exists suppliers (
  id text primary key,
  name text not null,
  contact_name text,
  phone text,
  email text,
  abn text,
  address text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists suppliers_name_idx on suppliers (name);

create table if not exists project_costs (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  description text not null,
  cost_type text not null default 'other'
    check (cost_type in ('labour', 'materials', 'plant', 'subcontractor', 'other')),
  supplier_id text references suppliers(id) on delete set null,
  quantity numeric not null default 1,
  unit_rate numeric not null default 0,
  amount numeric not null default 0,
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

create sequence if not exists invoice_number_seq start with 1;

create table if not exists invoices (
  id text primary key,
  invoice_number text unique not null default 'INV-' || to_char(nextval('invoice_number_seq'), 'FM000000'),
  project_id text references projects(id) on delete set null,
  customer_id text not null references customers(id),
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'paid', 'void', 'overdue')),
  terms text not null default 'Due on Receipt',
  currency text not null default 'AUD',
  subtotal numeric not null default 0,
  tax numeric not null default 0,
  total numeric not null default 0,
  notes text,
  issued_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table invoices add column if not exists active boolean not null default true;
alter table invoices add column if not exists paid_at timestamptz;

create index if not exists invoices_project_idx on invoices (project_id);
create index if not exists invoices_status_idx on invoices (status);
create index if not exists invoices_number_idx on invoices (invoice_number);

create table if not exists invoice_lines (
  id text primary key,
  invoice_id text not null references invoices(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1,
  unit_rate numeric not null default 0,
  amount numeric not null default 0,
  cost_type text
);


create table if not exists settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create index if not exists settings_key_idx on settings (key);

-- ========== RLS (managers write CRM; staff read little) ==========

alter table customers enable row level security;
alter table projects enable row level security;
alter table project_costs enable row level security;
alter table quotes enable row level security;
alter table invoices enable row level security;
alter table invoice_lines enable row level security;

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


create table if not exists site_task_categories (
  id text primary key,
  site_id text references sites(id) on delete set null,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table site_task_categories alter column site_id drop not null;

create index if not exists site_task_categories_site_idx on site_task_categories (site_id);

create table if not exists site_tasks (
  id text primary key,
  site_id text not null references sites(id) on delete cascade,
  category_id text references site_task_categories(id) on delete set null,
  name text not null,
  description text,
  due_date date,
  start_date date,
  end_date date,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'on_hold', 'complete', 'cancelled')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_tasks_site_idx on site_tasks (site_id);
create index if not exists site_tasks_category_idx on site_tasks (category_id);
create index if not exists site_tasks_status_idx on site_tasks (status);

create table if not exists site_notes (
  id text primary key,
  site_id text not null references sites(id) on delete cascade,
  title text not null,
  content text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_notes_site_idx on site_notes (site_id);

-- Suppliers RLS: managers manage suppliers.
alter table suppliers enable row level security;

grant select, insert, update, delete on suppliers to authenticated;

drop policy if exists suppliers_manager_all on suppliers;
create policy suppliers_manager_all on suppliers
  for all using (is_manager()) with check (is_manager());

-- Contacts RLS: managers manage contacts.
alter table contacts enable row level security;

grant select, insert, update, delete on contacts to authenticated;

drop policy if exists contacts_manager_all on contacts;
create policy contacts_manager_all on contacts
  for all using (is_manager()) with check (is_manager());

-- Settings RLS: managers manage business settings.
alter table settings enable row level security;

grant select, insert, update, delete on settings to authenticated;

drop policy if exists settings_manager_all on settings;
create policy settings_manager_all on settings
  for all using (is_manager()) with check (is_manager());

-- Site tasks RLS: managers manage site tasks and categories.
alter table site_task_categories enable row level security;
alter table site_tasks enable row level security;

grant select, insert, update, delete on site_task_categories to authenticated;
grant select, insert, update, delete on site_tasks to authenticated;

drop policy if exists site_task_categories_manager_all on site_task_categories;
create policy site_task_categories_manager_all on site_task_categories
  for all using (is_manager()) with check (is_manager());

drop policy if exists site_tasks_manager_all on site_tasks;
create policy site_tasks_manager_all on site_tasks
  for all using (is_manager()) with check (is_manager());

-- Site notes
-- (See table definition in the "Other reference tables" section.)

alter table site_notes enable row level security;

grant select, insert, update, delete on site_notes to authenticated;

drop policy if exists site_notes_manager_all on site_notes;
create policy site_notes_manager_all on site_notes
  for all using (is_manager()) with check (is_manager());

-- People RLS: users can access their own row by auth id or email fallback.
alter table people enable row level security;

grant select, insert, update, delete on people to authenticated;

drop policy if exists people_all on people;

create policy people_select on people
  for select using (
    is_manager()
    or auth.uid() = auth_user_id
    or auth.jwt()->>'email' = email
    or active = true
  );

create policy people_insert on people
  for insert with check (is_manager());

create policy people_update on people
  for update using (
    is_manager()
    or auth.uid() = auth_user_id
    or auth.jwt()->>'email' = email
  )
  with check (
    is_manager()
    or auth.uid() = auth_user_id
    or auth.jwt()->>'email' = email
  );

create policy people_delete on people
  for delete using (is_manager());


-- Storage bucket for work photos (create in dashboard if missing)
-- insert into storage.buckets (id, name, public) values ('work-photos', 'work-photos', false)
-- on conflict do nothing;

-- Manager seed data
insert into people (id, name, role, email, active, sort_order, auth_user_id)
values (
  'mgr-001',
  'Jamie Anderson',
  'manager',
  'jamie@projects-consultant.com',
  true,
  0,
  (select id from auth.users where email = 'jamie@projects-consultant.com' limit 1)
)
on conflict (id) do update set auth_user_id = COALESCE(people.auth_user_id, EXCLUDED.auth_user_id);

insert into people (id, name, role, business_name, active, sort_order)
values ('staff-lucas-anderson', 'Lucas Anderson', 'staff', 'Property Assistant', true, 10)
on conflict (id) do nothing;

-- Sync sites.active with sites.status
update sites set status = 'archived' where active = false and status != 'archived';

create or replace function sites_set_active()
returns trigger as $$
begin
  new.active := (new.status != 'archived');
  return new;
end;
$$ language plpgsql;

drop trigger if exists sites_active_sync on sites;
create trigger sites_active_sync
  before insert or update on sites
  for each row execute function sites_set_active();

-- Task and site permissions for staff/managers to assign and acknowledge
alter table tasks enable row level security;
grant select, insert, update, delete on tasks to authenticated;
drop policy if exists tasks_all on tasks;
create policy tasks_all on tasks
  for all using (auth.uid() is not null)
  with check (auth.uid() is not null);

alter table task_assignees enable row level security;
grant select, insert, update, delete on task_assignees to authenticated;
drop policy if exists task_assignees_all on task_assignees;
create policy task_assignees_all on task_assignees
  for all using (auth.uid() is not null)
  with check (auth.uid() is not null);

alter table assigned_tasks enable row level security;
grant select, insert, update, delete on assigned_tasks to authenticated;
drop policy if exists assigned_tasks_all on assigned_tasks;
create policy assigned_tasks_all on assigned_tasks
  for all using (auth.uid() is not null)
  with check (auth.uid() is not null);

alter table sites enable row level security;
grant select, insert, update, delete on sites to authenticated;

drop policy if exists sites_all on sites;
create policy sites_all on sites
  for all using (auth.uid() is not null)
  with check (auth.uid() is not null);

grant select on site_assignments to authenticated;

-- `roster` is a plain view over `people`, so it runs with the privileges of
-- its owner and bypasses `people`'s row-level security (this is intentional
-- — it only exposes id/name/role/active/sort_order, so unprivileged staff
-- can list names without a broader grant on `people`). Supabase grants new
-- objects to `anon`/`authenticated` by default, which for a view like this
-- would let anyone write straight through to `people`, bypassing RLS
-- entirely. Lock it down to read-only for signed-in users only.
revoke all on roster from public, anon, authenticated;
grant select on roster to authenticated;

-- Customer <-> site assignments (independent of projects)
create table if not exists customer_sites (
  customer_id text not null references customers(id) on delete cascade,
  site_id text not null references sites(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, site_id)
);

alter table customer_sites enable row level security;
grant select, insert, update, delete on customer_sites to authenticated;

drop policy if exists customer_sites_all on customer_sites;
create policy customer_sites_all on customer_sites
  for all using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Project timesheets with expenses and follow-up tasks
create table if not exists timesheets (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  person_id text references people(id) on delete set null,
  start_at timestamptz not null,
  end_at timestamptz,
  notes text,
  expenses jsonb not null default '[]'::jsonb,
  follow_ups jsonb not null default '[]'::jsonb,
  invoiced boolean not null default false,
  billable boolean not null default true,
  event_id text references events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists timesheets_project_idx on timesheets (project_id);

alter table timesheets enable row level security;
grant select, insert, update, delete on timesheets to authenticated;

drop policy if exists timesheets_all on timesheets;
create policy timesheets_all on timesheets
  for all using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Weekly calendar events
create table if not exists events (
  id text primary key,
  title text,
  site_id text,
  site_name text,
  project_name text,
  site_address text,
  site_contact text,
  contact_id text references contacts(id) on delete set null,
  notes text,
  planned_works text,
  works_completed text,
  follow_up text,
  category text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table events add column if not exists title text;

alter table events add column if not exists planned_works text;
alter table events add column if not exists works_completed text;
alter table events add column if not exists follow_up text;
alter table events add column if not exists status text not null default 'tentative';

alter table events drop constraint if exists events_status_check;
alter table events add constraint events_status_check
  check (status in ('tentative', 'booked', 'confirmed', 'in_progress', 'completed', 'project_connected', 'internal_works'));

create index if not exists events_start_at_idx on events (start_at);

alter table events enable row level security;
grant select, insert, update, delete on events to authenticated;

drop policy if exists events_all on events;
create policy events_all on events
  for all using (auth.uid() is not null)
  with check (auth.uid() is not null);
