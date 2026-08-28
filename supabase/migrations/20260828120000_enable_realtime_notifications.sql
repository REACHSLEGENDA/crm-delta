-- Delta Capital CRM: publish the tables the app subscribes to in real time.
--
-- NotificationCenter listens for INSERTs on notifications (alert sound, toast)
-- and on messages (chat sound), and the chat screens stream new messages. None
-- of that fires unless the table belongs to the supabase_realtime publication,
-- so alerts only appeared after a manual page reload and the sounds never
-- played at all.
--
-- Row level security still applies to realtime: a subscriber only receives the
-- rows its policies already allow it to read.

begin;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array['notifications', 'messages', 'channels']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', target_table);
    end if;
  end loop;
end
$$;

-- Realtime sends only the primary key on UPDATE/DELETE unless the table
-- replicates its full row. The client reads fields such as user_id and
-- channel_id from the payload to decide whether the event is for this user.
alter table public.notifications replica identity full;
alter table public.messages replica identity full;

commit;
