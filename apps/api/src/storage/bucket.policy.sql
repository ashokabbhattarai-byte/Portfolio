-- Portfolio Storage Bucket: portfolio-storage
-- Run in Supabase Dashboard → SQL Editor. Creates public read, authenticated write.

-- 1. Create bucket if not exists (or via Dashboard → Storage → New bucket)
insert into storage.buckets (id, name, public)
values ('portfolio-storage', 'portfolio-storage', true)
on conflict (id) do nothing;

-- 2. Allow public read (CDN) – portfolio images are public
create policy "Public read portfolio-storage"
on storage.objects for select
using (bucket_id = 'portfolio-storage');

-- 3. Allow authenticated (service_role / anon with JWT) to insert/update/delete
create policy "Auth write portfolio-storage"
on storage.objects for insert
with check (bucket_id = 'portfolio-storage');

create policy "Auth update portfolio-storage"
on storage.objects for update
using (bucket_id = 'portfolio-storage');

create policy "Auth delete portfolio-storage"
on storage.objects for delete
using (bucket_id = 'portfolio-storage');

-- 4. Enable RLS (Supabase storage has RLS enabled by default)
-- Verify bucket is public for getPublicUrl edge cache:
-- Dashboard → Storage → portfolio-storage → Edit bucket → Public = true
