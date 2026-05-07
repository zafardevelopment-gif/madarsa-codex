create extension if not exists "pgcrypto";

create type almahad_user_role as enum ('admin', 'staff');
create type almahad_attendance_status as enum ('present', 'absent');
create type almahad_leave_status as enum ('pending', 'approved', 'rejected');
create type almahad_collection_type as enum ('monthly_fee', 'donation');
create type almahad_donation_type as enum ('sadqa', 'zakat', 'fitrah', 'general');
create type almahad_salary_mode as enum ('fixed', 'collection_based');
create type almahad_handover_status as enum ('pending', 'approved', 'rejected');

create table public.almahad_users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  mobile text,
  role almahad_user_role not null default 'staff',
  base_salary numeric not null default 0,
  created_at timestamptz not null default now()
);

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
  user_id uuid not null references public.almahad_users(id) on delete cascade,
  date date not null,
  status almahad_attendance_status not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table public.almahad_leaves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.almahad_users(id) on delete cascade,
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
  collected_by uuid not null references public.almahad_users(id) on delete restrict,
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
  staff_id uuid not null references public.almahad_users(id) on delete restrict,
  amount numeric not null check (amount > 0),
  status almahad_handover_status not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  approved_by uuid references public.almahad_users(id) on delete set null,
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
  staff_id uuid not null references public.almahad_users(id) on delete restrict,
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

alter table public.almahad_users enable row level security;
alter table public.almahad_students enable row level security;
alter table public.almahad_attendance enable row level security;
alter table public.almahad_leaves enable row level security;
alter table public.almahad_collections enable row level security;
alter table public.almahad_handovers enable row level security;
alter table public.almahad_expenses enable row level security;
alter table public.almahad_payroll enable row level security;

create or replace function public.almahad_current_role()
returns almahad_user_role as $$
  select role from public.almahad_users where id = auth.uid();
$$ language sql stable security definer;

create policy "almahad users read own and admin read all"
on public.almahad_users for select using (id = auth.uid() or public.almahad_current_role() = 'admin');

create policy "almahad admin full users"
on public.almahad_users for all using (public.almahad_current_role() = 'admin') with check (public.almahad_current_role() = 'admin');

create policy "almahad admin full students"
on public.almahad_students for all using (public.almahad_current_role() = 'admin') with check (public.almahad_current_role() = 'admin');

create policy "almahad staff read students"
on public.almahad_students for select using (auth.uid() is not null);

create policy "almahad attendance scoped"
on public.almahad_attendance for all
using (user_id = auth.uid() or public.almahad_current_role() = 'admin')
with check (user_id = auth.uid() or public.almahad_current_role() = 'admin');

create policy "almahad leaves scoped"
on public.almahad_leaves for all
using (user_id = auth.uid() or public.almahad_current_role() = 'admin')
with check (user_id = auth.uid() or public.almahad_current_role() = 'admin');

create policy "almahad collections scoped"
on public.almahad_collections for all
using (collected_by = auth.uid() or public.almahad_current_role() = 'admin')
with check (collected_by = auth.uid() or public.almahad_current_role() = 'admin');

create policy "almahad handovers scoped"
on public.almahad_handovers for all
using (staff_id = auth.uid() or public.almahad_current_role() = 'admin')
with check (staff_id = auth.uid() or public.almahad_current_role() = 'admin');

create policy "almahad expenses admin only"
on public.almahad_expenses for all using (public.almahad_current_role() = 'admin') with check (public.almahad_current_role() = 'admin');

create policy "almahad payroll scoped"
on public.almahad_payroll for all
using (staff_id = auth.uid() or public.almahad_current_role() = 'admin')
with check (public.almahad_current_role() = 'admin');
