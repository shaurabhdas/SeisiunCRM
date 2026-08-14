-- Email signature feature. Replaces the dead "Write New Email" button
-- (a no-op since Compose already starts blank) with a per-user saved
-- signature that's auto-prepended when a new email is started. Additive
-- only.

alter table public.user_profiles
  add column if not exists signature_html text;

-- Public bucket: signature images (logos/headshots) must render for
-- external recipients opening the sent email in their own client, unlike
-- email-attachments (private, embedded as MIME attachments at send time).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('signature-images', 'signature-images', true, 5242880, array['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload signature images" on storage.objects;
create policy "Authenticated users can upload signature images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'signature-images');

drop policy if exists "Anyone can view signature images" on storage.objects;
create policy "Anyone can view signature images"
on storage.objects for select
to public
using (bucket_id = 'signature-images');

drop policy if exists "Uploaders can delete their signature images" on storage.objects;
create policy "Uploaders can delete their signature images"
on storage.objects for delete
to authenticated
using (bucket_id = 'signature-images' and owner = auth.uid());
