-- =========================================================
-- All4You V5.9.6 Dashboard Status Four Fix
-- Einmal im Supabase SQL Editor ausführen.
-- Zweck:
-- - Statuswechsel im Mitarbeiterportal wieder funktionsfähig machen
-- - request_status-Enum korrekt casten
-- - Dashboard-Status auf vier aktive Werte begrenzen:
--   neu, in_bearbeitung, rueckfrage_offen, erledigt
-- - Bei erledigt/abgeschlossen automatisch archivieren
-- DBG: ALL4YOU-V5.9.6-DASHBOARD-STATUS-FOUR-FIX
-- =========================================================

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
  v_enum_status public.request_status;
begin
  if not public.is_active_dashboard_employee() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  -- Alte/alternative Bezeichnungen sauber auf das neue 4er-Modell mappen.
  v_status := case v_status
    when 'abgeschlossen' then 'erledigt'
    when 'in_pruefung' then 'in_bearbeitung'
    when 'in prüfung' then 'in_bearbeitung'
    when 'rueckfrage' then 'rueckfrage_offen'
    when 'rueckfragen' then 'rueckfrage_offen'
    when 'rückfrage' then 'rueckfrage_offen'
    when 'rückfragen' then 'rueckfrage_offen'
    else v_status
  end;

  if v_status not in ('neu', 'in_bearbeitung', 'rueckfrage_offen', 'erledigt') then
    return jsonb_build_object(
      'success', false,
      'message', 'Dieser Status ist im Mitarbeiterportal nicht freigegeben.'
    );
  end if;

  -- Wichtig: status ist in der Datenbank ein request_status-Enum.
  -- Ohne Cast entsteht der Fehler: column "status" is of type request_status but expression is of type text.
  v_enum_status := v_status::public.request_status;

  if v_enum_status = 'erledigt'::public.request_status then
    update public.requests
    set
      status = v_enum_status,
      archived_at = coalesce(archived_at, now()),
      archived_by = auth.uid(),
      archive_reason = 'Automatisch archiviert nach Status abgeschlossen.'
    where id = p_request_id
    returning * into v_request;
  else
    update public.requests
    set
      status = v_enum_status,
      updated_at = now()
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
