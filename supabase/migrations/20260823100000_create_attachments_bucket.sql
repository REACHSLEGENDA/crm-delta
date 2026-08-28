-- Delta Capital CRM: create the storage bucket the app has been writing to.
--
-- src/lib/attachments.ts uploads chat files, note attachments and deal documents
-- to a bucket named "attachments". That bucket only ever existed in the upstream
-- atomic-crm migration, which this database was never built from, so every
-- upload failed. Only "compliance_docs" had been created.
--
-- Kept private: files are reached through signed URLs, never a public path.

begin;

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do update set public = false;

drop policy if exists "Active users read attachments" on storage.objects;
create policy "Active users read attachments"
on storage.objects for select to authenticated
using (bucket_id = 'attachments' and public.is_active_user(auth.uid()));

drop policy if exists "Active users upload attachments" on storage.objects;
create policy "Active users upload attachments"
on storage.objects for insert to authenticated
with check (bucket_id = 'attachments' and public.is_active_user(auth.uid()));

-- Only the uploader clears their own file; admins can clean up anything.
drop policy if exists "Owners delete attachments" on storage.objects;
create policy "Owners delete attachments"
on storage.objects for delete to authenticated
using (
  bucket_id = 'attachments'
  and public.is_active_user(auth.uid())
  and (
    owner_id = auth.uid()::text
    or public.get_user_role(auth.uid()) = 'SUPERADMIN'
  )
);

commit;
