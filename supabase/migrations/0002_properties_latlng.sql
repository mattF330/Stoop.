alter table public.properties add column if not exists lat double precision check (lat between 40 and 41.5), add column if not exists lng double precision check (lng between -75 and -73);
