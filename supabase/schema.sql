create extension if not exists "pgcrypto";

create type almahad_user_role as enum ('admin', 'staff');
create type almahad_attendance_status as enum ('present', 'absent');
create type almahad_leave_status as enum ('pending', 'approved', 'rejected');
create type almahad_collection_type as enum ('monthly_fee', 'donation');
create type almahad_donation_type as enum ('sadqa', 'zakat', 'fitrah', 'general');
create type almahad_salary_mode as enum ('fixed', 'collection_based');
create type almahad_handover_status as enum ('pending', 'approved', 'rejected');

-- Simple accounts table (no Supabase Auth dependency)
create table public.almahad_accounts (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  name text not null,
  mobile text,
  role almahad_user_role not null default 'staff',
  base_salary numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Default admin account (password: Admin@1234)
insert into public.almahad_accounts (username, password_hash, name, role)
values ('admin', crypt('Admin@1234', gen_salt('bf')), 'Admin', 'admin');

create table public.almahad_students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  guardian_name text not null,
  phone text not null,
  monthly_fee numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.almahad_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.almahad_accounts(id) on delete cascade,
  date date not null,
  status almahad_attendance_status not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table public.almahad_leaves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.almahad_accounts(id) on delete cascade,
  from_date date not null,
  to_date date not null,
  reason text not null,
  status almahad_leave_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.almahad_collections (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.almahad_students(id) on delete set null,
  name text not null,
  amount numeric not null check (amount >= 0),
  date date not null,
  type almahad_collection_type not null,
  donation_type almahad_donation_type,
  collected_by uuid not null references public.almahad_accounts(id) on delete restrict,
  is_handed_over boolean not null default false,
  handed_over_amount numeric not null default 0 check (handed_over_amount >= 0),
  remaining_amount numeric not null default 0 check (remaining_amount >= 0),
  created_at timestamptz not null default now(),
  constraint almahad_donation_type_required check (
    (type = 'donation' and donation_type is not null)
    or (type = 'monthly_fee' and donation_type is null)
  )
);

create table public.almahad_handovers (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.almahad_collections(id) on delete cascade,
  staff_id uuid not null references public.almahad_accounts(id) on delete restrict,
  amount numeric not null check (amount > 0),
  status almahad_handover_status not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  approved_by uuid references public.almahad_accounts(id) on delete set null,
  approved_at timestamptz
);

create table public.almahad_expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric not null check (amount >= 0),
  date date not null,
  paid_to text not null,
  created_at timestamptz not null default now()
);

create table public.almahad_payroll (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.almahad_accounts(id) on delete restrict,
  month text not null,
  base_salary numeric not null default 0,
  total_collection numeric not null default 0,
  salary_mode almahad_salary_mode not null,
  final_salary numeric not null default 0,
  created_at timestamptz not null default now()
);

create or replace function public.almahad_sync_collection_remaining()
returns trigger as $$
begin
  new.remaining_amount := greatest(new.amount - new.handed_over_amount, 0);
  new.is_handed_over := new.remaining_amount = 0;
  return new;
end;
$$ language plpgsql;

create trigger almahad_collections_remaining_before_insert_update
before insert or update on public.almahad_collections
for each row execute function public.almahad_sync_collection_remaining();

-- Login function: returns account row if username+password match
create or replace function public.almahad_login(p_username text, p_password text)
returns table(id uuid, username text, name text, role almahad_user_role, mobile text, base_salary numeric)
language sql stable security definer as $$
  select id, username, name, role, mobile, base_salary
  from public.almahad_accounts
  where username = lower(trim(p_username))
    and password_hash = crypt(p_password, password_hash);
$$;

-- Create staff account (called by admin)
create or replace function public.almahad_create_account(
  p_username text, p_password text, p_name text,
  p_mobile text, p_role almahad_user_role, p_base_salary numeric
)
returns table(id uuid)
language sql security definer as $$
  insert into public.almahad_accounts (username, password_hash, name, mobile, role, base_salary)
  values (lower(trim(p_username)), crypt(p_password, gen_salt('bf')), p_name, p_mobile, p_role, p_base_salary)
  returning id;
$$;

-- Change password function
create or replace function public.almahad_change_password(p_id uuid, p_new_password text)
returns void language sql security definer as $$
  update public.almahad_accounts
  set password_hash = crypt(p_new_password, gen_salt('bf'))
  where id = p_id;
$$;

-- RLS disabled — app uses service role key for all DB calls
alter table public.almahad_accounts disable row level security;
alter table public.almahad_students disable row level security;
alter table public.almahad_attendance disable row level security;
alter table public.almahad_leaves disable row level security;
alter table public.almahad_collections disable row level security;
alter table public.almahad_handovers disable row level security;
alter table public.almahad_expenses disable row level security;
alter table public.almahad_payroll disable row level security;
