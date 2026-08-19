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
    where active = true
      and role = 'manager'
      and (
        auth_user_id = auth.uid()
        or email = auth.jwt()->>'email'
      )
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
$$ language plpgsql set search_path = public;

drop trigger if exists sites_active_sync on sites;
create trigger sites_active_sync
  before insert or update on sites
  for each row execute function sites_set_active();

-- Maps the signed-in auth user to their people.id, the same pattern as
-- is_manager() — used to scope "my own" rows for workers.
create or replace function current_person_id() returns text
language sql stable security definer set search_path = public as $$
  select id from people
  where active = true
    and (
      auth_user_id = auth.uid()
      or email = auth.jwt()->>'email'
    )
  limit 1;
$$;

-- Task and site permissions for staff/managers to assign and acknowledge.
-- Workers read tasks/sites and update their own task status/acknowledgements,
-- but only managers create, assign, or delete.
alter table tasks enable row level security;
grant select, insert, update, delete on tasks to authenticated;
drop policy if exists tasks_all on tasks;
drop policy if exists tasks_select on tasks;
drop policy if exists tasks_insert on tasks;
drop policy if exists tasks_update on tasks;
drop policy if exists tasks_delete on tasks;
create policy tasks_select on tasks for select using (auth.uid() is not null);
create policy tasks_insert on tasks for insert with check (is_manager());
create policy tasks_update on tasks for update using (auth.uid() is not null) with check (auth.uid() is not null);
create policy tasks_delete on tasks for delete using (is_manager());

alter table task_assignees enable row level security;
grant select, insert, update, delete on task_assignees to authenticated;
drop policy if exists task_assignees_all on task_assignees;
drop policy if exists task_assignees_select on task_assignees;
drop policy if exists task_assignees_insert on task_assignees;
drop policy if exists task_assignees_update on task_assignees;
drop policy if exists task_assignees_delete on task_assignees;
create policy task_assignees_select on task_assignees for select using (auth.uid() is not null);
create policy task_assignees_insert on task_assignees for insert with check (is_manager());
create policy task_assignees_update on task_assignees for update using (is_manager()) with check (is_manager());
create policy task_assignees_delete on task_assignees for delete using (is_manager());

alter table assigned_tasks enable row level security;
grant select, insert, update, delete on assigned_tasks to authenticated;
drop policy if exists assigned_tasks_all on assigned_tasks;
drop policy if exists assigned_tasks_select on assigned_tasks;
drop policy if exists assigned_tasks_insert on assigned_tasks;
drop policy if exists assigned_tasks_update on assigned_tasks;
drop policy if exists assigned_tasks_delete on assigned_tasks;
create policy assigned_tasks_select on assigned_tasks for select using (auth.uid() is not null);
create policy assigned_tasks_update on assigned_tasks for update using (auth.uid() is not null) with check (auth.uid() is not null);
create policy assigned_tasks_insert on assigned_tasks for insert with check (is_manager());
create policy assigned_tasks_delete on assigned_tasks for delete using (is_manager());

alter table sites enable row level security;
grant select, insert, update, delete on sites to authenticated;
drop policy if exists sites_all on sites;
drop policy if exists sites_select on sites;
drop policy if exists sites_insert on sites;
drop policy if exists sites_update on sites;
drop policy if exists sites_delete on sites;
create policy sites_select on sites for select using (auth.uid() is not null);
create policy sites_insert on sites for insert with check (is_manager());
create policy sites_update on sites for update using (is_manager()) with check (is_manager());
create policy sites_delete on sites for delete using (is_manager());

-- site_assignments previously had RLS enabled with NO policy at all, which
-- silently denied everyone (including the "which sites is this worker
-- assigned to" lookup the app depends on). Managers see/manage every
-- assignment; workers can see their own.
grant select, insert, update, delete on site_assignments to authenticated;
drop policy if exists site_assignments_all on site_assignments;
drop policy if exists site_assignments_select on site_assignments;
drop policy if exists site_assignments_write on site_assignments;
drop policy if exists site_assignments_update on site_assignments;
drop policy if exists site_assignments_delete on site_assignments;
create policy site_assignments_select on site_assignments for select using (is_manager() or person_id = current_person_id());
create policy site_assignments_write on site_assignments for insert with check (is_manager());
create policy site_assignments_update on site_assignments for update using (is_manager()) with check (is_manager());
create policy site_assignments_delete on site_assignments for delete using (is_manager());

-- manager_schedule previously had RLS enabled with NO policy at all, which
-- silently denied everyone (the manager schedule feature was broken).
-- Manager-only: only managers use the manager schedule.
alter table manager_schedule enable row level security;
grant select, insert, update, delete on manager_schedule to authenticated;
drop policy if exists manager_schedule_select on manager_schedule;
drop policy if exists manager_schedule_insert on manager_schedule;
drop policy if exists manager_schedule_update on manager_schedule;
drop policy if exists manager_schedule_delete on manager_schedule;
create policy manager_schedule_select on manager_schedule for select to authenticated using (is_manager());
create policy manager_schedule_insert on manager_schedule for insert to authenticated with check (is_manager());
create policy manager_schedule_update on manager_schedule for update to authenticated using (is_manager()) with check (is_manager());
create policy manager_schedule_delete on manager_schedule for delete to authenticated using (is_manager());

-- reports previously had RLS enabled with NO policy at all, which silently
-- denied everyone (workers could not submit reports, managers could not view
-- them). Workers can submit/read/edit reports; only managers can delete.
alter table reports enable row level security;
grant select, insert, update, delete on reports to authenticated;
drop policy if exists reports_select on reports;
drop policy if exists reports_insert on reports;
drop policy if exists reports_update on reports;
drop policy if exists reports_delete on reports;
create policy reports_select on reports for select to authenticated using (auth.uid() is not null);
create policy reports_insert on reports for insert to authenticated with check (auth.uid() is not null);
create policy reports_update on reports for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy reports_delete on reports for delete to authenticated using (is_manager());

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

-- Manager-only: customer<->site links are only ever read/written from the
-- manager-facing CRM (Admin panel), never by worker accounts.
drop policy if exists customer_sites_all on customer_sites;
create policy customer_sites_all on customer_sites
  for all using (is_manager())
  with check (is_manager());

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

-- Manager-only: timesheets are only ever read/written from the manager CRM
-- (Projects/Invoices tabs), never by worker accounts.
drop policy if exists timesheets_all on timesheets;
create policy timesheets_all on timesheets
  for all using (is_manager())
  with check (is_manager());

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
  check (status in ('tentative', 'booked', 'confirmed', 'in_progress', 'completed', 'completed_follow_up', 'project_connected', 'project_connect_follow_up', 'internal_works', 'family'));

create index if not exists events_start_at_idx on events (start_at);

alter table events enable row level security;
grant select, insert, update, delete on events to authenticated;

-- Manager-only: calendar events are only ever read/written from the manager
-- CRM (Calendar tab), never by worker accounts.
drop policy if exists events_all on events;
create policy events_all on events
  for all using (is_manager())
  with check (is_manager());

-- ========== Password vault ==========
-- Zero-knowledge design: the server (and anyone with DB access, including a
-- leaked service-role key or a Supabase support engineer) never sees a
-- plaintext password, username, URL, or note. Every item is encrypted in the
-- browser with AES-GCM before it is ever sent over the network, using a key
-- derived (PBKDF2, 300k iterations) from a master passphrase that is never
-- stored or transmitted anywhere. Only `title` stays in plaintext so the
-- list can be browsed without unlocking the vault.
--
-- If the master passphrase is lost, the data is unrecoverable by design —
-- there is no reset path, since a reset path would be a backdoor.

create table if not exists vault_config (
  id text primary key default 'default',
  salt text not null,
  verifier_iv text not null,
  verifier_ciphertext text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vault_items (
  id text primary key,
  title text not null,
  iv text not null,
  ciphertext text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vault_items_title_idx on vault_items (title);

alter table vault_config enable row level security;
alter table vault_items enable row level security;
grant select, insert, update, delete on vault_config to authenticated;
grant select, insert, update, delete on vault_items to authenticated;
-- Supabase grants new tables to `anon` by default; RLS already blocks
-- unauthenticated access, but revoke the grant anyway for defense in depth.
revoke all on vault_config from anon;
revoke all on vault_items from anon;

drop policy if exists vault_config_manager_all on vault_config;
create policy vault_config_manager_all on vault_config
  for all using (is_manager()) with check (is_manager());

drop policy if exists vault_items_manager_all on vault_items;
create policy vault_items_manager_all on vault_items
  for all using (is_manager()) with check (is_manager());

-- ========== Extended CRM features ==========

-- Events: recurring event support
alter table events add column if not exists recurrence_rule text;
alter table events add column if not exists recurrence_end_date date;
alter table events add column if not exists parent_event_id text;
alter table events add column if not exists recurrence_interval int default 1;

-- Sites: access details
alter table sites add column if not exists access_code text;
alter table sites add column if not exists key_location text;
alter table sites add column if not exists parking_notes text;
alter table sites add column if not exists alarm_instructions text;
alter table sites add column if not exists site_map_url text;

-- Invoices: deposits, late fees, recurring, Stripe, split billing
alter table invoices add column if not exists deposit_amount numeric default 0;
alter table invoices add column if not exists deposit_paid_at timestamptz;
alter table invoices add column if not exists late_fee_amount numeric default 0;
alter table invoices add column if not exists late_fee_applied_at timestamptz;
alter table invoices add column if not exists recurring boolean default false;
alter table invoices add column if not exists recurring_frequency text;
alter table invoices add column if not exists parent_invoice_id text;
alter table invoices add column if not exists stripe_payment_intent_id text;
alter table invoices add column if not exists stripe_paid_at timestamptz;
alter table invoices add column if not exists split_info jsonb;
alter table invoices add column if not exists tax_rate numeric default 0.1;

-- Quotes: online approval, versioning, tiers
alter table quotes add column if not exists approval_token text;
alter table quotes add column if not exists approved_at timestamptz;
alter table quotes add column if not exists approved_by text;
alter table quotes add column if not exists version int default 1;
alter table quotes add column if not exists parent_quote_id text;
alter table quotes add column if not exists tiers jsonb;
alter table quotes add column if not exists follow_up_sent_at timestamptz;

-- Timesheets: approval workflow
alter table timesheets add column if not exists approval_status text default 'pending'
  check (approval_status in ('pending', 'approved', 'rejected'));
alter table timesheets add column if not exists approved_by text;
alter table timesheets add column if not exists approved_at timestamptz;
alter table timesheets add column if not exists break_minutes int default 0;

-- Customers: tags, satisfaction, referrals
alter table customers add column if not exists tags text[] default '{}';
alter table customers add column if not exists satisfaction_rating int;
alter table customers add column if not exists referred_by text;

-- Projects: actual costs, templates, permits
alter table projects add column if not exists actual_cost numeric default 0;
alter table projects add column if not exists template_id text;
alter table projects add column if not exists permit_number text;
alter table projects add column if not exists permit_expiry date;
alter table projects add column if not exists inspection_date date;

-- People: hourly rates
alter table people add column if not exists hourly_rate numeric;
alter table people add column if not exists overtime_rate numeric;

-- Customer communication timeline
create table if not exists customer_communications (
  id text primary key,
  customer_id text not null references customers(id) on delete cascade,
  type text not null default 'note' check (type in ('email', 'phone', 'sms', 'meeting', 'note', 'visit')),
  direction text check (direction in ('inbound', 'outbound')),
  subject text,
  body text,
  event_id text references events(id) on delete set null,
  created_by text references people(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists customer_communications_customer_idx on customer_communications (customer_id);
create index if not exists customer_communications_created_idx on customer_communications (created_at desc);
alter table customer_communications enable row level security;
grant select, insert, update, delete on customer_communications to authenticated;
drop policy if exists customer_communications_all on customer_communications;
create policy customer_communications_all on customer_communications
  for all using (is_manager()) with check (is_manager());

-- Customer tags
create table if not exists customer_tags (
  id text primary key,
  name text not null unique,
  color text default '#64748b',
  created_at timestamptz not null default now()
);
alter table customer_tags enable row level security;
grant select, insert, update, delete on customer_tags to authenticated;
drop policy if exists customer_tags_all on customer_tags;
create policy customer_tags_all on customer_tags
  for all using (is_manager()) with check (is_manager());

-- Customer documents
create table if not exists customer_documents (
  id text primary key,
  customer_id text not null references customers(id) on delete cascade,
  name text not null,
  file_url text not null,
  file_type text,
  file_size bigint,
  uploaded_at timestamptz not null default now()
);
create index if not exists customer_documents_customer_idx on customer_documents (customer_id);
alter table customer_documents enable row level security;
grant select, insert, update, delete on customer_documents to authenticated;
drop policy if exists customer_documents_all on customer_documents;
create policy customer_documents_all on customer_documents
  for all using (is_manager()) with check (is_manager());

-- Project milestones
create table if not exists project_milestones (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  name text not null,
  description text,
  due_date date,
  completed boolean default false,
  completed_at timestamptz,
  sort_order int default 0,
  created_at timestamptz not null default now()
);
create index if not exists project_milestones_project_idx on project_milestones (project_id);
alter table project_milestones enable row level security;
grant select, insert, update, delete on project_milestones to authenticated;
drop policy if exists project_milestones_all on project_milestones;
create policy project_milestones_all on project_milestones
  for all using (is_manager()) with check (is_manager());

-- Project templates
create table if not exists project_templates (
  id text primary key,
  name text not null,
  description text,
  default_budget numeric,
  default_status text default 'lead',
  template_data jsonb default '{}',
  created_at timestamptz not null default now()
);
alter table project_templates enable row level security;
grant select, insert, update, delete on project_templates to authenticated;
drop policy if exists project_templates_all on project_templates;
create policy project_templates_all on project_templates
  for all using (is_manager()) with check (is_manager());

-- Change orders
create table if not exists change_orders (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  description text not null,
  reason text,
  cost_impact numeric default 0,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'implemented')),
  approved_by text references people(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists change_orders_project_idx on change_orders (project_id);
alter table change_orders enable row level security;
grant select, insert, update, delete on change_orders to authenticated;
drop policy if exists change_orders_all on change_orders;
create policy change_orders_all on change_orders
  for all using (is_manager()) with check (is_manager());

-- Quote line items
create table if not exists quote_lines (
  id text primary key,
  quote_id text not null references quotes(id) on delete cascade,
  description text not null,
  quantity numeric default 1,
  unit_rate numeric default 0,
  amount numeric default 0,
  tier text default 'standard',
  cost_type text,
  sort_order int default 0
);
create index if not exists quote_lines_quote_idx on quote_lines (quote_id);
alter table quote_lines enable row level security;
grant select, insert, update, delete on quote_lines to authenticated;
drop policy if exists quote_lines_all on quote_lines;
create policy quote_lines_all on quote_lines
  for all using (is_manager()) with check (is_manager());

-- Site photos gallery
create table if not exists site_photos (
  id text primary key,
  site_id text not null references sites(id) on delete cascade,
  url text not null,
  caption text,
  area text,
  taken_at date,
  created_at timestamptz not null default now()
);
create index if not exists site_photos_site_idx on site_photos (site_id);
alter table site_photos enable row level security;
grant select, insert, update, delete on site_photos to authenticated;
drop policy if exists site_photos_all on site_photos;
create policy site_photos_all on site_photos for all using (is_manager()) with check (is_manager());

-- Inspection templates
create table if not exists inspection_templates (
  id text primary key,
  name text not null,
  items jsonb not null default '[]',
  active boolean default true,
  created_at timestamptz not null default now()
);
alter table inspection_templates enable row level security;
grant select, insert, update, delete on inspection_templates to authenticated;
drop policy if exists inspection_templates_all on inspection_templates;
create policy inspection_templates_all on inspection_templates for all using (is_manager()) with check (is_manager());

-- Inspections
create table if not exists inspections (
  id text primary key,
  site_id text not null references sites(id) on delete cascade,
  template_id text references inspection_templates(id) on delete set null,
  inspector text,
  inspected_at timestamptz not null default now(),
  results jsonb not null default '[]',
  status text default 'pending' check (status in ('pending', 'passed', 'failed', 'needs_review')),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists inspections_site_idx on inspections (site_id);
alter table inspections enable row level security;
grant select, insert, update, delete on inspections to authenticated;
drop policy if exists inspections_all on inspections;
create policy inspections_all on inspections for all using (is_manager()) with check (is_manager());

-- Site assets / equipment tracking
create table if not exists site_assets (
  id text primary key,
  site_id text not null references sites(id) on delete cascade,
  name text not null,
  category text,
  model text,
  serial text,
  manufacturer text,
  install_date date,
  warranty_expiry date,
  service_history jsonb default '[]',
  notes text,
  active boolean default true,
  created_at timestamptz not null default now()
);
create index if not exists site_assets_site_idx on site_assets (site_id);
alter table site_assets enable row level security;
grant select, insert, update, delete on site_assets to authenticated;
drop policy if exists site_assets_all on site_assets;
create policy site_assets_all on site_assets for all using (is_manager()) with check (is_manager());

-- Maintenance contracts
create table if not exists maintenance_contracts (
  id text primary key,
  site_id text references sites(id) on delete set null,
  customer_id text references customers(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  frequency text check (frequency in ('weekly', 'fortnightly', 'monthly', 'quarterly', 'biannual', 'annual')),
  amount numeric default 0,
  terms text,
  active boolean default true,
  created_at timestamptz not null default now()
);
create index if not exists maintenance_contracts_site_idx on maintenance_contracts (site_id);
create index if not exists maintenance_contracts_customer_idx on maintenance_contracts (customer_id);
alter table maintenance_contracts enable row level security;
grant select, insert, update, delete on maintenance_contracts to authenticated;
drop policy if exists maintenance_contracts_all on maintenance_contracts;
create policy maintenance_contracts_all on maintenance_contracts for all using (is_manager()) with check (is_manager());

-- Violation tracking
create table if not exists violations (
  id text primary key,
  site_id text not null references sites(id) on delete cascade,
  date date not null,
  description text not null,
  photo_url text,
  status text default 'open' check (status in ('open', 'notified', 'resolved', 'appealed')),
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now()
);
create index if not exists violations_site_idx on violations (site_id);
alter table violations enable row level security;
grant select, insert, update, delete on violations to authenticated;
drop policy if exists violations_all on violations;
create policy violations_all on violations for all using (is_manager()) with check (is_manager());

-- Time clock entries
create table if not exists time_clock_entries (
  id text primary key,
  person_id text not null references people(id) on delete cascade,
  clock_in timestamptz not null,
  clock_out timestamptz,
  gps_lat_in numeric,
  gps_lng_in numeric,
  gps_lat_out numeric,
  gps_lng_out numeric,
  break_minutes int default 0,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists time_clock_person_idx on time_clock_entries (person_id);
create index if not exists time_clock_clock_in_idx on time_clock_entries (clock_in desc);
alter table time_clock_entries enable row level security;
grant select, insert, update, delete on time_clock_entries to authenticated;
drop policy if exists time_clock_select on time_clock_entries;
drop policy if exists time_clock_insert on time_clock_entries;
drop policy if exists time_clock_update on time_clock_entries;
drop policy if exists time_clock_delete on time_clock_entries;
create policy time_clock_select on time_clock_entries for select using (is_manager() or person_id = current_person_id());
create policy time_clock_insert on time_clock_entries for insert with check (auth.uid() is not null);
create policy time_clock_update on time_clock_entries for update using (is_manager() or person_id = current_person_id()) with check (auth.uid() is not null);
create policy time_clock_delete on time_clock_entries for delete using (is_manager());

-- Email templates
create table if not exists email_templates (
  id text primary key,
  name text not null,
  subject text,
  body text,
  category text default 'general',
  created_at timestamptz not null default now()
);
alter table email_templates enable row level security;
grant select, insert, update, delete on email_templates to authenticated;
drop policy if exists email_templates_all on email_templates;
create policy email_templates_all on email_templates for all using (is_manager()) with check (is_manager());

-- Email logs
create table if not exists email_logs (
  id text primary key,
  customer_id text references customers(id) on delete set null,
  template_id text references email_templates(id) on delete set null,
  subject text,
  body text,
  to_email text,
  status text default 'sent' check (status in ('sent', 'failed', 'bounced', 'opened')),
  sent_at timestamptz not null default now()
);
create index if not exists email_logs_customer_idx on email_logs (customer_id);
alter table email_logs enable row level security;
grant select, insert, update, delete on email_logs to authenticated;
drop policy if exists email_logs_all on email_logs;
create policy email_logs_all on email_logs for all using (is_manager()) with check (is_manager());

-- SMS logs
create table if not exists sms_logs (
  id text primary key,
  customer_id text references customers(id) on delete set null,
  to_phone text,
  message text,
  status text default 'sent' check (status in ('sent', 'failed', 'delivered')),
  sent_at timestamptz not null default now()
);
create index if not exists sms_logs_customer_idx on sms_logs (customer_id);
alter table sms_logs enable row level security;
grant select, insert, update, delete on sms_logs to authenticated;
drop policy if exists sms_logs_all on sms_logs;
create policy sms_logs_all on sms_logs for all using (is_manager()) with check (is_manager());

-- In-app notifications
create table if not exists notifications (
  id text primary key,
  person_id text references people(id) on delete cascade,
  type text not null,
  title text,
  message text,
  link text,
  read boolean default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_person_idx on notifications (person_id);
create index if not exists notifications_unread_idx on notifications (person_id) where read = false;
alter table notifications enable row level security;
grant select, insert, update, delete on notifications to authenticated;
drop policy if exists notifications_all on notifications;
create policy notifications_select on notifications for select using (is_manager() or person_id = current_person_id());
create policy notifications_insert on notifications for insert with check (is_manager());
create policy notifications_update on notifications for update using (is_manager() or person_id = current_person_id()) with check (auth.uid() is not null);
create policy notifications_delete on notifications for delete using (is_manager());

-- Inventory items
create table if not exists inventory_items (
  id text primary key,
  name text not null,
  sku text,
  category text,
  supplier_id text references suppliers(id) on delete set null,
  cost numeric default 0,
  price numeric default 0,
  stock_level numeric default 0,
  min_stock numeric default 0,
  unit text default 'each',
  location text,
  active boolean default true,
  created_at timestamptz not null default now()
);
create index if not exists inventory_name_idx on inventory_items (name);
create index if not exists inventory_sku_idx on inventory_items (sku);
alter table inventory_items enable row level security;
grant select, insert, update, delete on inventory_items to authenticated;
drop policy if exists inventory_items_all on inventory_items;
create policy inventory_items_all on inventory_items for all using (is_manager()) with check (is_manager());

-- Purchase orders
create table if not exists purchase_orders (
  id text primary key,
  po_number text,
  supplier_id text references suppliers(id) on delete set null,
  status text default 'draft' check (status in ('draft', 'sent', 'partial', 'received', 'cancelled')),
  total numeric default 0,
  notes text,
  ordered_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists purchase_orders_supplier_idx on purchase_orders (supplier_id);
alter table purchase_orders enable row level security;
grant select, insert, update, delete on purchase_orders to authenticated;
drop policy if exists purchase_orders_all on purchase_orders;
create policy purchase_orders_all on purchase_orders for all using (is_manager()) with check (is_manager());

-- Purchase order items
create table if not exists purchase_order_items (
  id text primary key,
  po_id text not null references purchase_orders(id) on delete cascade,
  inventory_id text references inventory_items(id) on delete set null,
  description text,
  quantity numeric default 1,
  unit_cost numeric default 0,
  amount numeric default 0
);
create index if not exists purchase_order_items_po_idx on purchase_order_items (po_id);
alter table purchase_order_items enable row level security;
grant select, insert, update, delete on purchase_order_items to authenticated;
drop policy if exists purchase_order_items_all on purchase_order_items;
create policy purchase_order_items_all on purchase_order_items for all using (is_manager()) with check (is_manager());

-- Material usage per project
create table if not exists material_usage (
  id text primary key,
  project_id text not null references projects(id) on delete cascade,
  inventory_id text references inventory_items(id) on delete set null,
  description text,
  quantity numeric default 1,
  unit_cost numeric default 0,
  amount numeric default 0,
  used_at timestamptz not null default now()
);
create index if not exists material_usage_project_idx on material_usage (project_id);
alter table material_usage enable row level security;
grant select, insert, update, delete on material_usage to authenticated;
drop policy if exists material_usage_all on material_usage;
create policy material_usage_all on material_usage for all using (is_manager()) with check (is_manager());

-- Audit log
create table if not exists audit_log (
  id text primary key,
  table_name text not null,
  record_id text,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_data jsonb,
  new_data jsonb,
  user_id uuid,
  user_email text,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_table_idx on audit_log (table_name);
create index if not exists audit_log_record_idx on audit_log (record_id);
create index if not exists audit_log_created_idx on audit_log (created_at desc);
alter table audit_log enable row level security;
grant select, insert, update, delete on audit_log to authenticated;
drop policy if exists audit_log_select on audit_log;
drop policy if exists audit_log_insert on audit_log;
drop policy if exists audit_log_delete on audit_log;
create policy audit_log_select on audit_log for select using (is_manager());
create policy audit_log_insert on audit_log for insert with check (auth.uid() is not null);
create policy audit_log_delete on audit_log for delete using (is_manager());

-- Email campaigns
create table if not exists email_campaigns (
  id text primary key,
  name text not null,
  subject text,
  body text,
  recipient_tags text[],
  status text default 'draft' check (status in ('draft', 'sending', 'sent', 'scheduled')),
  sent_count int default 0,
  open_count int default 0,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
alter table email_campaigns enable row level security;
grant select, insert, update, delete on email_campaigns to authenticated;
drop policy if exists email_campaigns_all on email_campaigns;
create policy email_campaigns_all on email_campaigns for all using (is_manager()) with check (is_manager());

-- Referrals
create table if not exists referrals (
  id text primary key,
  referrer_customer_id text references customers(id) on delete set null,
  referred_customer_id text references customers(id) on delete set null,
  date date not null default current_date,
  reward text,
  status text default 'pending' check (status in ('pending', 'rewarded', 'expired')),
  created_at timestamptz not null default now()
);
alter table referrals enable row level security;
grant select, insert, update, delete on referrals to authenticated;
drop policy if exists referrals_all on referrals;
create policy referrals_all on referrals for all using (is_manager()) with check (is_manager());

-- Loyalty program
create table if not exists loyalty_programs (
  id text primary key,
  customer_id text not null references customers(id) on delete cascade,
  points int default 0,
  tier text default 'bronze' check (tier in ('bronze', 'silver', 'gold', 'platinum')),
  enrolled_at timestamptz not null default now()
);
create index if not exists loyalty_customer_idx on loyalty_programs (customer_id);
alter table loyalty_programs enable row level security;
grant select, insert, update, delete on loyalty_programs to authenticated;
drop policy if exists loyalty_programs_all on loyalty_programs;
create policy loyalty_programs_all on loyalty_programs for all using (is_manager()) with check (is_manager());

-- Lead capture forms
create table if not exists lead_capture_forms (
  id text primary key,
  name text not null,
  fields jsonb default '[]',
  redirect_url text,
  active boolean default true,
  created_at timestamptz not null default now()
);
alter table lead_capture_forms enable row level security;
grant select, insert, update, delete on lead_capture_forms to authenticated;
drop policy if exists lead_capture_forms_all on lead_capture_forms;
create policy lead_capture_forms_all on lead_capture_forms for all using (is_manager()) with check (is_manager());

-- Lead submissions
create table if not exists lead_submissions (
  id text primary key,
  form_id text references lead_capture_forms(id) on delete set null,
  data jsonb not null default '{}',
  status text default 'new' check (status in ('new', 'contacted', 'qualified', 'converted', 'rejected')),
  converted_customer_id text references customers(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists lead_submissions_form_idx on lead_submissions (form_id);
alter table lead_submissions enable row level security;
grant select, insert, update, delete on lead_submissions to authenticated;
drop policy if exists lead_submissions_all on lead_submissions;
create policy lead_submissions_all on lead_submissions for all using (is_manager()) with check (is_manager());

-- Calendar sync config
create table if not exists calendar_sync_config (
  id text primary key default 'default',
  provider text check (provider in ('google', 'outlook', 'ical')),
  sync_token text,
  last_synced_at timestamptz,
  enabled boolean default false,
  updated_at timestamptz not null default now()
);
alter table calendar_sync_config enable row level security;
grant select, insert, update, delete on calendar_sync_config to authenticated;
drop policy if exists calendar_sync_config_all on calendar_sync_config;
create policy calendar_sync_config_all on calendar_sync_config for all using (is_manager()) with check (is_manager());

-- Webhook endpoints
create table if not exists webhook_endpoints (
  id text primary key,
  url text not null,
  events text[] default '{}',
  secret text,
  active boolean default true,
  created_at timestamptz not null default now()
);
alter table webhook_endpoints enable row level security;
grant select, insert, update, delete on webhook_endpoints to authenticated;
drop policy if exists webhook_endpoints_all on webhook_endpoints;
create policy webhook_endpoints_all on webhook_endpoints for all using (is_manager()) with check (is_manager());

-- ========== Customer Support & Service Portal ==========

-- Portal users: links auth.users to customers
create table if not exists portal_users (
  id uuid primary key default auth.uid(),
  customer_id text not null references customers(id) on delete cascade,
  email text not null,
  name text,
  phone text,
  invited_at timestamptz not null default now(),
  last_login_at timestamptz,
  active boolean not null default true,
  unique(email)
);
create index if not exists portal_users_customer_idx on portal_users (customer_id);
create index if not exists portal_users_email_idx on portal_users (email);

-- Support tickets
create table if not exists support_tickets (
  id text primary key,
  customer_id text not null references customers(id) on delete cascade,
  portal_user_id uuid references portal_users(id) on delete set null,
  ticket_number text unique not null default 'TCK-' || to_char(nextval('invoice_number_seq'), 'FM000000'),
  subject text not null,
  description text,
  type text not null default 'support' check (type in ('service_request', 'sales_enquiry', 'support', 'complaint')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'new' check (status in ('new', 'open', 'in_progress', 'awaiting_customer', 'resolved', 'closed')),
  assigned_to text references people(id) on delete set null,
  related_project_id text references projects(id) on delete set null,
  related_site_id text references sites(id) on delete set null,
  related_invoice_id text references invoices(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  closed_at timestamptz
);
create index if not exists support_tickets_customer_idx on support_tickets (customer_id);
create index if not exists support_tickets_status_idx on support_tickets (status);
create index if not exists support_tickets_assigned_idx on support_tickets (assigned_to);

-- Ticket messages (conversation thread)
create table if not exists ticket_messages (
  id text primary key,
  ticket_id text not null references support_tickets(id) on delete cascade,
  author_id uuid,
  author_type text not null default 'customer' check (author_type in ('customer', 'staff', 'manager')),
  author_name text,
  body text not null,
  attachments jsonb not null default '[]',
  internal_note boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists ticket_messages_ticket_idx on ticket_messages (ticket_id);
create index if not exists ticket_messages_created_idx on ticket_messages (created_at);

-- Ticket attachments metadata
create table if not exists ticket_attachments (
  id text primary key,
  ticket_id text not null references support_tickets(id) on delete cascade,
  message_id text references ticket_messages(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  file_size bigint,
  file_type text,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists ticket_attachments_ticket_idx on ticket_attachments (ticket_id);

-- Portal helper: is the signed-in user a portal user?
create or replace function is_portal_user() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from portal_users
    where active = true
      and id = auth.uid()
  );
$$;
revoke execute on function is_portal_user() from anon;

-- Portal helper: get the customer_id for the signed-in portal user
create or replace function current_portal_customer_id() returns text
language sql stable security definer set search_path = public as $$
  select customer_id from portal_users
  where active = true and id = auth.uid()
  limit 1;
$$;
revoke execute on function current_portal_customer_id() from anon;

-- RLS: portal_users
alter table portal_users enable row level security;
grant select, insert, update, delete on portal_users to authenticated;
revoke all on portal_users from anon;
drop policy if exists portal_users_select on portal_users;
drop policy if exists portal_users_insert on portal_users;
drop policy if exists portal_users_update on portal_users;
drop policy if exists portal_users_delete on portal_users;
create policy portal_users_select on portal_users for select using (is_manager() or id = auth.uid());
create policy portal_users_insert on portal_users for insert with check (is_manager());
create policy portal_users_update on portal_users for update using (is_manager() or id = auth.uid()) with check (is_manager() or id = auth.uid());
create policy portal_users_delete on portal_users for delete using (is_manager());

-- RLS: support_tickets
alter table support_tickets enable row level security;
grant select, insert, update, delete on support_tickets to authenticated;
revoke all on support_tickets from anon;
drop policy if exists support_tickets_select on support_tickets;
drop policy if exists support_tickets_insert on support_tickets;
drop policy if exists support_tickets_update on support_tickets;
drop policy if exists support_tickets_delete on support_tickets;
create policy support_tickets_select on support_tickets for select using (is_manager() or customer_id = current_portal_customer_id());
create policy support_tickets_insert on support_tickets for insert with check (is_manager() or customer_id = current_portal_customer_id());
create policy support_tickets_update on support_tickets for update using (is_manager()) with check (is_manager());
create policy support_tickets_delete on support_tickets for delete using (is_manager());

-- RLS: ticket_messages
alter table ticket_messages enable row level security;
grant select, insert, update, delete on ticket_messages to authenticated;
revoke all on ticket_messages from anon;
drop policy if exists ticket_messages_select on ticket_messages;
drop policy if exists ticket_messages_insert on ticket_messages;
drop policy if exists ticket_messages_update on ticket_messages;
drop policy if exists ticket_messages_delete on ticket_messages;
create policy ticket_messages_select on ticket_messages for select
  using (
    is_manager()
    or (
      internal_note = false
      and ticket_id in (select id from support_tickets where customer_id = current_portal_customer_id())
    )
  );
create policy ticket_messages_insert on ticket_messages for insert
  with check (
    is_manager()
    or (
      internal_note = false
      and ticket_id in (select id from support_tickets where customer_id = current_portal_customer_id())
    )
  );
create policy ticket_messages_update on ticket_messages for update using (is_manager()) with check (is_manager());
create policy ticket_messages_delete on ticket_messages for delete using (is_manager());

-- RLS: ticket_attachments
alter table ticket_attachments enable row level security;
grant select, insert, update, delete on ticket_attachments to authenticated;
revoke all on ticket_attachments from anon;
drop policy if exists ticket_attachments_select on ticket_attachments;
drop policy if exists ticket_attachments_insert on ticket_attachments;
drop policy if exists ticket_attachments_update on ticket_attachments;
drop policy if exists ticket_attachments_delete on ticket_attachments;
create policy ticket_attachments_select on ticket_attachments for select
  using (is_manager() or ticket_id in (select id from support_tickets where customer_id = current_portal_customer_id()));
create policy ticket_attachments_insert on ticket_attachments for insert
  with check (is_manager() or ticket_id in (select id from support_tickets where customer_id = current_portal_customer_id()));
create policy ticket_attachments_update on ticket_attachments for update using (is_manager()) with check (is_manager());
create policy ticket_attachments_delete on ticket_attachments for delete using (is_manager());

-- Portal users get read-only access to their own customer/invoice/project records
drop policy if exists customers_portal_select on customers;
create policy customers_portal_select on customers
  for select using (is_manager() or id = current_portal_customer_id());
drop policy if exists invoices_portal_select on invoices;
create policy invoices_portal_select on invoices
  for select using (is_manager() or customer_id = current_portal_customer_id());
drop policy if exists projects_portal_select on projects;
create policy projects_portal_select on projects
  for select using (is_manager() or customer_id = current_portal_customer_id());
drop policy if exists invoice_lines_portal_select on invoice_lines;
create policy invoice_lines_portal_select on invoice_lines
  for select using (is_manager() or invoice_id in (select id from invoices where customer_id = current_portal_customer_id()));
