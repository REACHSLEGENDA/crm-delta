-- supabase/migrations/006_delete_user_by_admin.sql
-- Function to allow SUPERADMIN or MANAGER to delete users from auth.users

create or replace function public.delete_user_by_admin(target_user_id uuid)
returns void as $$
begin
  -- Security check: Ensure the caller is an authenticated SUPERADMIN or MANAGER
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('SUPERADMIN', 'MANAGER')
  ) then
    raise exception 'No autorizado: Solo SUPERADMIN o MANAGER pueden eliminar usuarios.';
  end if;

  -- Delete from auth.users (Cascades to public.profiles)
  delete from auth.users where id = target_user_id;
end;
$$ language plpgsql security definer;
