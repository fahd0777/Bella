-- =====================================================================
-- Bella — core schema
-- Every private table: owner_id -> auth.users, RLS owner-only, is_demo flag
-- =====================================================================
create extension if not exists pgcrypto with schema extensions;

-- ---------- helpers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;

-- ---------- profiles / settings ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  time_format text not null default '12h' check (time_format in ('12h','24h')),
  week_start smallint not null default 6 check (week_start between 0 and 6), -- 6 = Saturday
  currency text not null default 'EGP',
  theme text not null default 'light' check (theme in ('light','dark')),
  default_reminder_minutes int not null default 30,
  session_timeout_minutes int not null default 15,
  browser_notifications boolean not null default false,
  notify_appointments boolean not null default true,
  notify_followups boolean not null default true,
  notify_bills boolean not null default true,
  notify_tasks boolean not null default true,
  notify_children boolean not null default true,
  notify_household boolean not null default true,
  pin_hash text,                      -- bcrypt hash, never returned to client (column privilege revoked)
  show_wellness_in_menu boolean not null default true,
  monthly_budget numeric(14,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  module text not null check (module in ('tasks','appointments','expenses','clients','household')),
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, module, name)
);

-- ---------- real estate ----------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  whatsapp text,
  client_type text not null default 'buyer' check (client_type in ('buyer','seller','tenant','landlord','investor')),
  lead_source text,
  property_type text,
  preferred_area text,
  budget_min numeric(14,2),
  budget_max numeric(14,2),
  requirements text,
  notes text,
  priority text not null default 'normal' check (priority in ('urgent','high','normal','low')),
  status text not null default 'new' check (status in ('new','contacted','interested','properties_sent','viewing_scheduled','viewing_done','negotiation','closed_won','lost','later')),
  last_contact_at date,
  next_followup_date date,
  next_followup_time time,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ref_code text,
  title text not null,
  property_type text not null default 'apartment' check (property_type in ('apartment','villa','duplex','penthouse','commercial','office','land','other')),
  deal_type text not null default 'sale' check (deal_type in ('sale','rent')),
  location text,
  area text,
  size_sqm numeric(10,2),
  price numeric(14,2),
  bedrooms smallint,
  bathrooms smallint,
  floor text,
  finishing text,
  description text,
  owner_name text,
  owner_phone text,
  status text not null default 'available' check (status in ('available','reserved','sold','rented','unavailable')),
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.property_photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  relation text not null default 'shown' check (relation in ('interested','shown','offered','owner')),
  shown_at date default current_date,
  feedback text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, property_id, relation)
);

create table public.client_interactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  kind text not null default 'call' check (kind in ('call','meeting','message','followup','offer','viewing','note','status_change')),
  summary text not null,
  occurred_at timestamptz not null default now(),
  property_id uuid references public.properties(id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- children ----------
create table public.children (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  gender text not null default 'son' check (gender in ('son','daughter')),
  birthday date,
  school text,
  grade text,
  photo_path text,
  emergency_contact text,
  medical_notes text,
  notes text,
  color text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.school_schedules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday (JS getDay)
  school_name text,
  start_time time not null,
  end_time time not null,
  activities text,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  subject text not null,
  teacher_name text,
  teacher_phone text,
  location text,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time,
  transport_notes text,
  cost numeric(12,2),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','partial')),
  reminder_minutes int,
  notes text,
  active boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.homework (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  title text not null,
  subject text,
  due_date date,
  priority text not null default 'normal' check (priority in ('urgent','high','normal','low')),
  status text not null default 'not_started' check (status in ('not_started','in_progress','done')),
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  subject text not null,
  exam_date date not null,
  exam_time time,
  prep_notes text,
  study_tasks text,
  reminder_minutes int,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.child_activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  title text not null,
  kind text not null default 'other' check (kind in ('sports','club','school_event','trip','birthday','other')),
  activity_date date,
  start_time time,
  location text,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- calendar ----------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'personal' check (category in ('real_estate','personal','children','school','lessons','household','medical','social','shopping','other')),
  start_date date not null,
  start_time time,
  end_time time,
  location text,
  notes text,
  priority text not null default 'normal' check (priority in ('urgent','high','normal','low')),
  reminder_minutes int,
  repeat text not null default 'none' check (repeat in ('none','daily','weekly','monthly')),
  repeat_until date,
  status text not null default 'scheduled' check (status in ('scheduled','done','cancelled')),
  client_id uuid references public.clients(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  child_id uuid references public.children(id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  remind_at timestamptz not null,
  notes text,
  done boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- tasks ----------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'personal' check (category in ('personal','work','real_estate','children','household','shopping','health','other')),
  due_date date,
  due_time time,
  priority text not null default 'normal' check (priority in ('urgent','high','normal','low')),
  status text not null default 'not_started' check (status in ('not_started','in_progress','done','deferred')),
  reminder_minutes int,
  repeat text not null default 'none' check (repeat in ('none','daily','weekly','monthly')),
  completed_at timestamptz,
  notes text,
  client_id uuid references public.clients(id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- household ----------
create table public.household_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'cleaning' check (category in ('cleaning','laundry','kitchen','organization','shopping','maintenance','other')),
  due_date date,
  priority text not null default 'normal' check (priority in ('urgent','high','normal','low')),
  assigned_to text,
  repeat text not null default 'none' check (repeat in ('none','daily','weekly','monthly','custom')),
  repeat_every_days int,
  status text not null default 'not_started' check (status in ('not_started','in_progress','done')),
  completed_at timestamptz,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  quantity text,
  category text not null default 'groceries' check (category in ('groceries','cleaning','personal_care','children','household','other')),
  est_price numeric(12,2),
  purchased boolean not null default false,
  purchased_at timestamptz,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  quantity numeric(10,2) not null default 0,
  min_quantity numeric(10,2) not null default 1,
  unit text,
  category text not null default 'groceries' check (category in ('groceries','cleaning','personal_care','children','household','other')),
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item text not null,
  maintenance_type text,
  last_date date,
  next_date date,
  technician text,
  technician_phone text,
  cost numeric(12,2),
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- money ----------
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'other' check (category in ('electricity','water','gas','internet','mobile','school','lessons','rent','installments','other')),
  amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  due_date date not null,
  status text not null default 'unpaid' check (status in ('unpaid','paid','partial')),
  paid_date date,
  repeat text not null default 'none' check (repeat in ('none','monthly','yearly')),
  reminder_days int default 2,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  category text not null default 'other' check (category in ('household','children','education','lessons','real_estate','personal','shopping','bills','medical','transport','other')),
  spent_on date not null default current_date,
  description text,
  payment_method text default 'cash' check (payment_method in ('cash','card','wallet','transfer','instapay','other')),
  notes text,
  client_id uuid references public.clients(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.income (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount >= 0),
  source text not null,
  category text not null default 'commission' check (category in ('commission','salary','rent','gift','other')),
  received_on date not null default current_date,
  notes text,
  client_id uuid references public.clients(id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null, -- expense category or 'total'
  monthly_limit numeric(12,2) not null check (monthly_limit >= 0),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, category)
);

-- ---------- notes ----------
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text,
  content text not null default '',
  category text not null default 'personal' check (category in ('personal','idea','work','client','household','shopping','important','journal')),
  tags text[] not null default '{}',
  favorite boolean not null default false,
  archived boolean not null default false,
  note_date date not null default current_date,
  client_id uuid references public.clients(id) on delete set null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- private wellness ----------
create table public.period_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  start_date date not null,
  end_date date,
  flow text check (flow in ('light','medium','heavy')),
  symptoms text[] not null default '{}',
  pain_level smallint check (pain_level between 0 and 10),
  mood text,
  energy smallint check (energy between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create table public.wellness_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  record_date date not null default current_date,
  mood text,
  sleep_hours numeric(4,1),
  energy smallint check (energy between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- notifications ----------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_key text not null,           -- e.g. appt:<id>:<date>  (dedupe)
  title text not null,
  body text,
  link text,
  kind text not null default 'general',
  due_at timestamptz not null default now(),
  read boolean not null default false,
  dismissed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, source_key)
);
