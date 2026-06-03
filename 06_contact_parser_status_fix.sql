-- =========================================================
-- All4You Service München
-- v4.3.1 Kundenstatus-Seite
-- Öffentliche Statusabfrage mit Ticketnummer + E-Mail ODER Telefon
-- Robust auch dann, wenn ältere Anfragen E-Mail und Telefon gemeinsam in einem Feld gespeichert haben.
-- Keine internen Notizen, keine Mitarbeiterdaten.
-- =========================================================

create or replace function public.get_public_request_status(
  p_ticket_number text,
  p_verification text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request requests%rowtype;
  v_history jsonb;
  v_ticket text := upper(trim(coalesce(p_ticket_number, '')));
  v_verify text := lower(trim(coalesce(p_verification, '')));
  v_verify_phone text := regexp_replace(coalesce(p_verification, ''), '\D', '', 'g');
begin
  if v_ticket = '' or v_verify = '' then
    return jsonb_build_object(
      'success', false,
      'message', 'Bitte Ticketnummer und E-Mail oder Telefonnummer eingeben.'
    );
  end if;

  select *
  into v_request
  from requests
  where upper(ticket_number) = v_ticket
    and (
      -- Normale neue Speicherung: E-Mail separat
      lower(coalesce(customer_email, '')) = v_verify

      -- Normale neue Speicherung: Telefon separat
      or regexp_replace(coalesce(customer_phone, ''), '\D', '', 'g') = v_verify_phone

      -- Robust für ältere Datensätze: E-Mail wurde zusammen mit Telefon in customer_email/customer_phone gespeichert
      or (
        position('@' in v_verify) > 0
        and position(
          v_verify in lower(coalesce(customer_email, '') || ' ' || coalesce(customer_phone, ''))
        ) > 0
      )

      -- Robust für ältere Datensätze: Telefonnummer wurde zusammen mit E-Mail in einem Feld gespeichert
      or (
        length(v_verify_phone) >= 6
        and position(
          v_verify_phone in regexp_replace(coalesce(customer_email, '') || ' ' || coalesce(customer_phone, ''), '\D', '', 'g')
        ) > 0
      )
    )
  limit 1;

  if v_request.id is null then
    return jsonb_build_object(
      'success', false,
      'message', 'Ticket wurde nicht gefunden oder die Verifizierung stimmt nicht.'
    );
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'old_status', old_status,
        'new_status', new_status,
        'note', note,
        'created_at', created_at
      )
      order by created_at asc
    ),
    '[]'::jsonb
  )
  into v_history
  from request_status_history
  where request_id = v_request.id;

  return jsonb_build_object(
    'success', true,
    'ticket_number', v_request.ticket_number,
    'service', v_request.service,
    'status', v_request.status,
    'summary', v_request.summary,
    'created_at', v_request.created_at,
    'updated_at', v_request.updated_at,
    'history', v_history
  );
end;
$$;

grant execute on function public.get_public_request_status(text, text) to anon, authenticated;
