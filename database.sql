create extension if not exists "pgcrypto";

create type user_role as enum ('admin', 'staff');
create type attendance_status as enum ('present', 'absent');
create type leave_status as enum ('pending', 'approved', 'rejected');
create type collection_type as enum ('monthly_fee', 'donation');
create type donation_type as enum ('sadqa', 'zakat', 'fitrah', 'general');
create type salary_mode as enum ('fixed', 'collection_based');
create type handover_status as enum ('pending', 'approved', 'rejected');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  role user_role not null default 'staff',
  base_salary numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  guardian_name text not null,
  phone text not null,
  monthly_fee numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  status attendance_status not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table public.leaves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  from_date date not null,
  to_date date not null,
  reason text not null,
  status leave_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete set null,
  name text not null,
  amount numeric not null check (amount >= 0),
  date date not null,
  type collection_type not null,
  donation_type donation_type,
  collected_by uuid not null references public.users(id) on delete restrict,
  is_handed_over boolean not null default false,
  handed_over_amount numeric not null default 0 check (handed_over_amount >= 0),
  remaining_amount numeric not null default 0 check (remaining_amount >= 0),
  created_at timestamptz not null default now(),
  constraint donation_type_required check (
    (type = 'donation' and donation_type is not null)
    or (type = 'monthly_fee' and donation_type is null)
  )
);

create table public.handovers (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  staff_id uuid not null references public.users(id) on delete restrict,
  amount numeric not null check (amount > 0),
  status handover_status not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric not null check (amount >= 0),
  date date not null,
  paid_to text not null,
  created_at timestamptz not null default now()
);

create table public.payroll (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.users(id) on delete restrict,
  month text not null,
  base_salary numeric not null default 0,
  total_collection numeric not null default 0,
  salary_mode salary_mode not null,
  final_salary numeric not null default 0,
  created_at timestamptz not null default now()
);

create or replace function public.sync_collection_remaining()
returns trigger as $$
begin
  new.remaining_amount := greatest(new.amount - new.handed_over_amount, 0);
  new.is_handed_over := new.remaining_amount = 0;
  return new;
end;
$$ language plpgsql;

create trigger collections_remaining_before_insert_update
before insert or update on public.collections
for each row execute function public.sync_collection_remaining();

alter table public.users enable row level security;
alter table public.students enable row level security;
alter table public.attendance enable row level security;
alter table public.leaves enable row level security;
alter table public.collections enable row level security;
alter table public.handovers enable row level security;
alter table public.expenses enable row level security;
alter table public.payroll enable row level security;

create or replace function public.current_role()
returns user_role as $$
  select role from public.users where id = auth.uid();
$$ language sql stable security definer;

create policy "users can read own profile and admins read all"
on public.users for select using (id = auth.uid() or public.current_role() = 'admin');

create policy "admin full users"
on public.users for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy "admin full students"
on public.students for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy "staff read students"
on public.students for select using (auth.uid() is not null);

create policy "attendance scoped"
on public.attendance for all
using (user_id = auth.uid() or public.current_role() = 'admin')
with check (user_id = auth.uid() or public.current_role() = 'admin');

create policy "leaves scoped"
on public.leaves for all
using (user_id = auth.uid() or public.current_role() = 'admin')
with check (user_id = auth.uid() or public.current_role() = 'admin');

create policy "collections scoped"
on public.collections for all
using (collected_by = auth.uid() or public.current_role() = 'admin')
with check (collected_by = auth.uid() or public.current_role() = 'admin');

create policy "handovers scoped"
on public.handovers for all
using (staff_id = auth.uid() or public.current_role() = 'admin')
with check (staff_id = auth.uid() or public.current_role() = 'admin');

create policy "expenses admin only"
on public.expenses for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy "payroll scoped"
on public.payroll for all
using (staff_id = auth.uid() or public.current_role() = 'admin')
with check (public.current_role() = 'admin');