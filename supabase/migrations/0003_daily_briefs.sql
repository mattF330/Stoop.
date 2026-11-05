-- One shared briefing per day (same text for everyone). Written only by the news-brief Edge Function (service role).
create table if not exists public.daily_briefs (
  brief_date date primary key,
  source text not null check (source in ('ai','rules')),
  body jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.daily_briefs enable row level security;
create policy daily_briefs_read on public.daily_briefs for select to authenticated using (true);
