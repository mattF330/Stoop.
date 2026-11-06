-- Property photos (private bucket, images only) and free-text notes.
create table if not exists public.property_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  body text not null check (char_length(body) <= 5000),
  created_at timestamptz not null default now()
);
create table if not exists public.property_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  path text not null,
  caption text check (char_length(caption) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists property_notes_prop on public.property_notes(property_id);
create index if not exists property_photos_prop on public.property_photos(property_id);
alter table public.property_notes enable row level security;
alter table public.property_photos enable row level security;
create policy property_notes_own on public.property_notes for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy property_photos_own on public.property_photos for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-photos', 'property-photos', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg','image/png','image/webp'];
create policy photos_read_own on storage.objects for select using (bucket_id = 'property-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_insert_own on storage.objects for insert with check (bucket_id = 'property-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy photos_delete_own on storage.objects for delete using (bucket_id = 'property-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
