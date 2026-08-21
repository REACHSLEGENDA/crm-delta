-- Workspace capabilities requested for the Delta Capital CRM redesign.
-- Additive and backward-compatible: existing rows keep their current behavior.

alter table public.deals
  add column if not exists currency text not null default 'USD',
  add column if not exists expected_closing_date date,
  add column if not exists closed_at timestamptz,
  add column if not exists close_reason text,
  add column if not exists loss_reason text;

alter table public.activities
  add column if not exists title text,
  add column if not exists due_at timestamptz,
  add column if not exists reminder_at timestamptz,
  add column if not exists status text not null default 'pending',
  add column if not exists completed_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default timezone('utc'::text, now());

update public.activities
set title = coalesce(nullif(title, ''), left(description, 120))
where title is null or title = '';

update public.activities
set status = 'completed',
    completed_at = coalesce(completed_at, created_at)
where due_at is null;

alter table public.activities
  drop constraint if exists activities_status_check;
alter table public.activities
  add constraint activities_status_check
  check (status in ('pending', 'completed', 'postponed', 'cancelled'));

alter table public.notes
  add column if not exists attachments jsonb not null default '[]'::jsonb;

alter table public.messages
  add column if not exists attachments jsonb not null default '[]'::jsonb;

alter table public.channels
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.notifications
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_activities_due_at
  on public.activities (due_at)
  where status in ('pending', 'postponed');
create index if not exists idx_activities_user_status
  on public.activities (user_id, status);
create index if not exists idx_deals_expected_closing_date
  on public.deals (expected_closing_date);

drop policy if exists "Users can update own activities" on public.activities;
create policy "Users can update own activities"
on public.activities for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own activities" on public.activities;
create policy "Users can delete own activities"
on public.activities for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can delete own notes" on public.notes;
create policy "Users can delete own notes"
on public.notes for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can create private channels" on public.channels;
create policy "Users can create private channels"
on public.channels for insert to authenticated
with check (
  public.is_active_user()
  and type::text = 'privado'
  and created_by = auth.uid()
  and auth.uid() = any(coalesce(members, '{}'::uuid[]))
);

drop policy if exists "Creators manage private channels" on public.channels;
create policy "Creators manage private channels"
on public.channels for update to authenticated
using (type::text = 'privado' and created_by = auth.uid())
with check (
  type::text = 'privado'
  and created_by = auth.uid()
  and auth.uid() = any(coalesce(members, '{}'::uuid[]))
);

drop policy if exists "Creators delete private channels" on public.channels;
create policy "Creators delete private channels"
on public.channels for delete to authenticated
using (type::text = 'privado' and created_by = auth.uid());

create or replace function public.touch_activity_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

revoke all on function public.touch_activity_updated_at() from public, anon, authenticated;

drop trigger if exists touch_activity_updated_at_trigger on public.activities;
create trigger touch_activity_updated_at_trigger
before update on public.activities
for each row execute function public.touch_activity_updated_at();
