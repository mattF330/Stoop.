-- Stoop initial schema. Safe for a brand-new Supabase project. No secrets in this file.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  theme text not null default 'light' check (theme in ('light','dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, display_name) values (new.id, split_part(new.email,'@',1)) on conflict do nothing; return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Data-source disclaimer acknowledgments
create table public.terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  unique (user_id, terms_version)
);

-- Properties (user-declared ownership)
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text,
  address text not null,
  borough text,
  bbl text,
  bin text,
  property_type text,
  is_condo_coop boolean not null default false,
  units_residential int,
  year_built int,
  purchase_price numeric,
  purchase_date date,
  current_value numeric,
  current_value_note text,
  cash_invested numeric,
  vacancy_pct numeric not null default 5,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index properties_user_bbl_key on public.properties (user_id, bbl) where bbl is not null and is_condo_coop = false;
create index properties_user_idx on public.properties (user_id);
create trigger properties_updated before update on public.properties for each row execute function public.set_updated_at();

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  lender text,
  principal numeric not null check (principal >= 0),
  rate_pct numeric not null check (rate_pct >= 0),
  term_years numeric not null check (term_years > 0),
  start_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index loans_property_idx on public.loans (property_id);
create trigger loans_updated before update on public.loans for each row execute function public.set_updated_at();

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  category text not null,
  annual_amount numeric not null check (annual_amount >= 0),
  is_estimate boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index expenses_property_idx on public.expenses (property_id);
create trigger expenses_updated before update on public.expenses for each row execute function public.set_updated_at();

create table public.units (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  label text not null,
  tenant_name text,
  monthly_rent numeric not null default 0 check (monthly_rent >= 0),
  lease_end date,
  is_stabilized boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index units_property_idx on public.units (property_id);
create trigger units_updated before update on public.units for each row execute function public.set_updated_at();

-- Real monthly snapshots (replaces modeled history charts)
create table public.property_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  snapshot_month date not null,
  value numeric, debt_balance numeric, rent_collected numeric, expenses_paid numeric,
  created_at timestamptz not null default now(),
  unique (property_id, snapshot_month)
);

-- Per-lot public record cache (shared, written only by Edge Functions with service role)
create table public.public_records_cache (
  bbl text not null,
  source text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (bbl, source)
);

-- News
create table public.news_items (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  title text not null,
  source_name text not null,
  published_at timestamptz,
  excerpt text,
  topics text[] not null default '{}',
  score numeric not null default 0,
  fetched_at timestamptz not null default now()
);
create index news_published_idx on public.news_items (published_at desc);

-- RLS
alter table public.profiles enable row level security;
alter table public.terms_acceptances enable row level security;
alter table public.properties enable row level security;
alter table public.loans enable row level security;
alter table public.expenses enable row level security;
alter table public.units enable row level security;
alter table public.property_snapshots enable row level security;
alter table public.public_records_cache enable row level security;
alter table public.news_items enable row level security;

create policy profiles_own on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy terms_own on public.terms_acceptances for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy properties_own on public.properties for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy loans_own on public.loans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy expenses_own on public.expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy units_own on public.units for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy snapshots_own on public.property_snapshots for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Cache and news: signed-in users may read; only the service role (Edge Functions) writes.
create policy cache_read on public.public_records_cache for select to authenticated using (true);
create policy news_read on public.news_items for select to authenticated using (true);
