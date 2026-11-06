-- Owner tools: reminders (dates the user enters), maintenance log, vacancy tracking, rent history.
-- All rows are private to their owner via RLS.

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  kind text not null default 'other' check (kind in ('insurance','rate_reset','inspection','other')),
  title text not null,
  due_date date not null,
  notes text,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reminders_user_due_idx on public.reminders (user_id, due_date);
create index reminders_property_idx on public.reminders (property_id);
create trigger reminders_updated before update on public.reminders for each row execute function public.set_updated_at();

create table public.maintenance_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  logged_on date not null default current_date,
  title text not null,
  contractor text,
  category text,
  cost numeric not null default 0 check (cost >= 0),
  counts_in_costs boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index maintenance_property_idx on public.maintenance_log (property_id, logged_on desc);
create trigger maintenance_updated before update on public.maintenance_log for each row execute function public.set_updated_at();

create table public.vacancies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  start_date date not null,
  end_date date,
  monthly_rent numeric not null default 0 check (monthly_rent >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
create index vacancies_property_idx on public.vacancies (property_id, start_date desc);
create index vacancies_unit_idx on public.vacancies (unit_id);
create trigger vacancies_updated before update on public.vacancies for each row execute function public.set_updated_at();

create table public.rent_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  effective_date date not null default current_date,
  monthly_rent numeric not null default 0 check (monthly_rent >= 0),
  tenant_name text,
  lease_end date,
  note text,
  created_at timestamptz not null default now()
);
create index rent_history_unit_idx on public.rent_history (unit_id, effective_date desc);

alter table public.reminders enable row level security;
alter table public.maintenance_log enable row level security;
alter table public.vacancies enable row level security;
alter table public.rent_history enable row level security;
create policy reminders_own on public.reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy maintenance_own on public.maintenance_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy vacancies_own on public.vacancies for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy rent_history_own on public.rent_history for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
