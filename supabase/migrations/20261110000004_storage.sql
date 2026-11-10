-- DöngüPazar: Storage kovaları ve politikaları
-- Dosya yolu kuralı: <company_id>/<dosya-adı>. İlk klasör firmanın id'sidir.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-images', 'listing-images', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('company-logos', 'company-logos', true, 2097152,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Kovalar herkese açık (public) olduğu için okuma, açık URL üzerinden yapılır;
-- listelemeyi engellemek için select politikası tanımlanmadı.

create policy "storage_company_files_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('listing-images', 'company-logos')
    and public.owns_company(((storage.foldername(name))[1])::uuid)
  );

create policy "storage_company_files_update" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('listing-images', 'company-logos')
    and public.owns_company(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id in ('listing-images', 'company-logos')
    and public.owns_company(((storage.foldername(name))[1])::uuid)
  );

create policy "storage_company_files_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('listing-images', 'company-logos')
    and (
      public.owns_company(((storage.foldername(name))[1])::uuid)
      or public.is_admin()
    )
  );
