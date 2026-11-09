-- Capital reserve planner items and repeating reminders.
create table if not exists public.capital_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  name text not null check (char_length(name) <= 120),
  installed_year int not null check (installed_year between 1850 and 2100),
  lifespan_years int not null check (lifespan_years between 1 and 150),
  replacement_cost numeric not null check (replacement_cost >= 0),
  saved_so_far numeric not null default 0 check (saved_so_far >= 0),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists capital_items_prop on public.capital_items(property_id);
alter table public.capital_items enable row level security;
create policy capital_items_own on public.capital_items for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter table public.reminders add column if not exists repeat text not null default 'none' check (repeat in ('none','monthly','quarterly','yearly'));
