-- =====================================================================
-- Bella — security: RLS, single-owner lock, triggers, private RPCs, storage
-- =====================================================================

-- ---------- RLS + owner policies + updated_at + owner index on every private table ----------
do $$
declare t text;
begin
  foreach t in array array[
    'categories','clients','properties','property_photos','client_properties','client_interactions',
    'children','school_schedules','lessons','homework','exams','child_activities',
    'appointments','reminders','tasks','household_tasks','shopping_items','inventory_items',
    'maintenance_records','bills','expenses','income','budgets','notes',
    'period_records','wellness_records','notifications','user_settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format($p$create policy owner_select on public.%I for select to authenticated using (owner_id = (select auth.uid()))$p$, t);
    execute format($p$create policy owner_insert on public.%I for insert to authenticated with check (owner_id = (select auth.uid()))$p$, t);
    execute format($p$create policy owner_update on public.%I for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))$p$, t);
    execute format($p$create policy owner_delete on public.%I for delete to authenticated using (owner_id = (select auth.uid()))$p$, t);
    execute format('create trigger trg_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    if t <> 'user_settings' then
      execute format('create index if not exists %I on public.%I (owner_id)', t || '_owner_idx', t);
    end if;
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- profiles: keyed by id
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
create policy owner_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy owner_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create trigger trg_updated_at before update on public.profiles for each row execute function public.set_updated_at();
revoke all on public.profiles from anon;

-- pin_hash is never readable/writable directly from the client
revoke select, insert, update on public.user_settings from authenticated;
grant select (owner_id, time_format, week_start, currency, theme, default_reminder_minutes, session_timeout_minutes,
  browser_notifications, notify_appointments, notify_followups, notify_bills, notify_tasks, notify_children,
  notify_household, show_wellness_in_menu, monthly_budget, created_at, updated_at) on public.user_settings to authenticated;
grant update (time_format, week_start, currency, theme, default_reminder_minutes, session_timeout_minutes,
  browser_notifications, notify_appointments, notify_followups, notify_bills, notify_tasks, notify_children,
  notify_household, show_wellness_in_menu, monthly_budget) on public.user_settings to authenticated;

-- ---------- FK indexes ----------
create index on public.property_photos (property_id);
create index on public.client_properties (client_id);
create index on public.client_properties (property_id);
create index on public.client_interactions (client_id, occurred_at desc);
create index on public.client_interactions (property_id);
create index on public.school_schedules (child_id);
create index on public.lessons (child_id);
create index on public.homework (child_id);
create index on public.exams (child_id);
create index on public.child_activities (child_id);
create index on public.appointments (owner_id, start_date);
create index on public.appointments (client_id);
create index on public.appointments (property_id);
create index on public.appointments (child_id);
create index on public.tasks (client_id);
create index on public.expenses (owner_id, spent_on);
create index on public.expenses (client_id);
create index on public.expenses (property_id);
create index on public.income (client_id);
create index on public.notes (client_id);
create index on public.clients (owner_id, next_followup_date);
create index on public.bills (owner_id, due_date);

-- ---------- single-owner lock: only ONE account may ever exist ----------
create or replace function public.enforce_single_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from auth.users) then
    raise exception 'Bella is a private app: an owner account already exists';
  end if;
  return new;
end; $$;
create trigger bella_single_owner before insert on auth.users
  for each row execute function public.enforce_single_owner();

create or replace function public.handle_new_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  insert into public.user_settings (owner_id) values (new.id);
  return new;
end; $$;
create trigger bella_on_owner_created after insert on auth.users
  for each row execute function public.handle_new_owner();

-- anon may only learn whether setup was already done (a boolean, nothing else)
create or replace function public.owner_exists()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users);
$$;
revoke all on function public.owner_exists() from public;
grant execute on function public.owner_exists() to anon, authenticated;

-- ---------- PIN lock for the private wellness module ----------
create or replace function public.has_pin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select pin_hash is not null from public.user_settings where owner_id = auth.uid()), false);
$$;

create or replace function public.set_pin(new_pin text, current_pin text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare h text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if new_pin is not null and new_pin !~ '^[0-9]{4,6}$' then raise exception 'PIN must be 4-6 digits'; end if;
  select pin_hash into h from public.user_settings where owner_id = auth.uid();
  if h is not null and (current_pin is null or extensions.crypt(current_pin, h) <> h) then
    return false;
  end if;
  update public.user_settings
     set pin_hash = case when new_pin is null then null else extensions.crypt(new_pin, extensions.gen_salt('bf')) end
   where owner_id = auth.uid();
  return true;
end; $$;

create or replace function public.verify_pin(pin text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare h text;
begin
  select pin_hash into h from public.user_settings where owner_id = auth.uid();
  if h is null then return true; end if;
  return extensions.crypt(pin, h) = h;
end; $$;

-- ---------- account deletion (cascades to every owned row) ----------
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from auth.users where id = auth.uid();
end; $$;

revoke all on function public.has_pin(), public.set_pin(text, text), public.verify_pin(text), public.delete_my_account() from public, anon;
grant execute on function public.has_pin(), public.set_pin(text, text), public.verify_pin(text), public.delete_my_account() to authenticated;
revoke all on function public.enforce_single_owner(), public.handle_new_owner() from public, anon, authenticated;

-- ---------- private storage bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 5242880, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

create policy media_owner_select on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy media_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy media_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy media_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
