-- Company logos for invoice PDF/HTML rendering.

alter table public.companies
  add column if not exists logo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-logos',
  'company-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists company_logos_public_read on storage.objects;
create policy company_logos_public_read
on storage.objects
for select
to public
using (
  bucket_id = 'company-logos'
);

drop policy if exists company_logos_admin_insert on storage.objects;
create policy company_logos_admin_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'company-logos'
  and public.app_is_company_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner', 'admin']
  )
);

drop policy if exists company_logos_admin_update on storage.objects;
create policy company_logos_admin_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'company-logos'
  and public.app_is_company_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner', 'admin']
  )
)
with check (
  bucket_id = 'company-logos'
  and public.app_is_company_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner', 'admin']
  )
);

drop policy if exists company_logos_admin_delete on storage.objects;
create policy company_logos_admin_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'company-logos'
  and public.app_is_company_role(
    ((storage.foldername(name))[1])::uuid,
    array['owner', 'admin']
  )
);
