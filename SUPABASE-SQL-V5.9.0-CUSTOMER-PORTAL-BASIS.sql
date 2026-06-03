-- =========================================================
-- All4You V5.8.14 Dashboard Archiv/Löschen Fix
-- Einmal im Supabase SQL Editor ausführen.
-- Zweck:
-- - Archivieren, Wiederherstellen, Statuswechsel und Löschen über sichere RPC-Funktionen
-- - Umgeht RLS-/REST-PATCH-Probleme im Dashboard, ohne öffentliche Formulare zu verändern
-- DBG: ALL4YOU-ROUTER-V5.8.14-DASHBOARD-ARCHIVE-DELETE-FIX
-- =========================================================

alter table public.requests
  add column if not exists archived_at timestamptz null;

alter table public.requests
  add column if not exists archived_by uuid null;

alter table public.requests
  add column if not exists archive_reason text null;

create index if not exists requests_archived_at_idx
  on public.requests (archived_at);

create index if not exists requests_active_created_idx
  on public.requests (created_at desc)
  where archived_at is null;

create index if not exists requests_archive_created_idx
  on public.requests (archived_at desc)
  where archived_at is not null;

-- ---------------------------------------------------------
-- Sicherheitsprüfung: nur aktive Mitarbeiter dürfen Dashboard-Aktionen ausführen
-- ---------------------------------------------------------
create or replace function public.is_active_dashboard_employee()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees e
    where e.auth_user_id = auth.uid()
      and coalesce(e.is_active, false) = true
  );
$$;

grant execute on function public.is_active_dashboard_employee() to authenticated;

-- ---------------------------------------------------------
-- Ticket archivieren
-- ---------------------------------------------------------
create or replace function public.admin_archive_request(
  p_request_id uuid,
  p_reason text default 'Manuell archiviert'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.requests%rowtype;
begin
  if not public.is_active_dashboard_employee() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  update public.requests
  set
    archived_at = coalesce(archived_at, now()),
    archived_by = auth.uid(),
    archive_reason = nullif(trim(coalesce(p_reason, 'Manuell archiviert')), '')
  where id = p_request_id
  returning * into v_request;

  if v_request.id is null then
    return jsonb_build_object('success', false, 'message', 'Ticket wurde nicht gefunden.');
  end if;

  return jsonb_build_object('success', true, 'request', to_jsonb(v_request));
end;
$$;

grant execute on function public.admin_archive_request(uuid, text) to authenticated;

-- ---------------------------------------------------------
-- Ticket aus Archiv zurückholen
-- ---------------------------------------------------------
create or replace function public.admin_restore_request(
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.requests%rowtype;
begin
  if not public.is_active_dashboard_employee() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  update public.requests
  set
    archived_at = null,
    archived_by = null,
    archive_reason = null
  where id = p_request_id
  returning * into v_request;

  if v_request.id is null then
    return jsonb_build_object('success', false, 'message', 'Archiv-Ticket wurde nicht gefunden.');
  end if;

  return jsonb_build_object('success', true, 'request', to_jsonb(v_request));
end;
$$;

grant execute on function public.admin_restore_request(uuid) to authenticated;

-- ---------------------------------------------------------
-- Ticketstatus ändern
-- Bei Status erledigt/abgeschlossen wird automatisch archiviert.
-- ---------------------------------------------------------
create or replace function public.admin_update_request_status(
  p_request_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.requests%rowtype;
  v_status text := lower(trim(coalesce(p_status, '')));
begin
  if not public.is_active_dashboard_employee() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if length(v_status) < 2 then
    return jsonb_build_object('success', false, 'message', 'Kein gültiger Status übergeben.');
  end if;

  if v_status in ('erledigt', 'abgeschlossen') then
    update public.requests
    set
      status = 'erledigt',
      archived_at = coalesce(archived_at, now()),
      archived_by = auth.uid(),
      archive_reason = 'Automatisch archiviert nach Status abgeschlossen.'
    where id = p_request_id
    returning * into v_request;
  else
    update public.requests
    set status = v_status
    where id = p_request_id
    returning * into v_request;
  end if;

  if v_request.id is null then
    return jsonb_build_object('success', false, 'message', 'Ticket wurde nicht gefunden.');
  end if;

  return jsonb_build_object('success', true, 'request', to_jsonb(v_request));
end;
$$;

grant execute on function public.admin_update_request_status(uuid, text) to authenticated;

-- ---------------------------------------------------------
-- Ticket endgültig löschen
-- Für Test-/Fehlanfragen. Normale abgeschlossene Aufträge bitte archivieren.
-- Storage-Dateien werden hier NICHT direkt aus storage.objects gelöscht,
-- weil Supabase direkte SQL-Löschungen dort blockiert.
-- Die Datenbank-Zuordnungen werden aber sauber entfernt.
-- ---------------------------------------------------------
create or replace function public.admin_delete_request(
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.requests%rowtype;
  v_ticket text;
  v_customer_id uuid;
begin
  if not public.is_active_dashboard_employee() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select *
  into v_request
  from public.requests
  where id = p_request_id
  limit 1;

  if v_request.id is null then
    return jsonb_build_object('success', false, 'message', 'Ticket wurde nicht gefunden oder ist bereits gelöscht.');
  end if;

  v_ticket := v_request.ticket_number;
  v_customer_id := v_request.customer_id;

  delete from public.request_messages
  where request_id = p_request_id;

  delete from public.request_status_history
  where request_id = p_request_id;

  delete from public.request_attachments
  where request_id = p_request_id;

  delete from public.requests
  where id = p_request_id;

  if v_customer_id is not null then
    delete from public.customers c
    where c.id = v_customer_id
      and not exists (
        select 1
        from public.requests r
        where r.customer_id = c.id
      );
  end if;

  return jsonb_build_object(
    'success', true,
    'deleted_request_id', p_request_id,
    'ticket_number', v_ticket,
    'message', 'Ticket wurde endgültig gelöscht.'
  );
end;
$$;

grant execute on function public.admin_delete_request(uuid) to authenticated;

-- ---------------------------------------------------------
-- Kontrollausgabe
-- ---------------------------------------------------------
select
  'V5.8.14 Dashboard Archiv/Löschen RPCs installiert' as status,
  routine_name,
  routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'is_active_dashboard_employee',
    'admin_archive_request',
    'admin_restore_request',
    'admin_update_request_status',
    'admin_delete_request'
  )
order by routine_name;
