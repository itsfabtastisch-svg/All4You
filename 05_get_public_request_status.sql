-- =========================================================
-- All4You Service München
-- v4.2 E-Mail-Benachrichtigung
-- Anfrage für Team-Benachrichtigung sicher per Token laden
-- =========================================================

create or replace function public.get_request_for_notification(
  p_request_id uuid,
  p_public_status_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request requests%rowtype;
  v_message text;
begin
  select *
  into v_request
  from requests
  where id = p_request_id
    and public_status_token = p_public_status_token
  limit 1;

  if v_request.id is null then
    return jsonb_build_object(
      'success', false,
      'message', 'Anfrage wurde nicht gefunden oder Token ist ungültig.'
    );
  end if;

  select message
  into v_message
  from request_messages
  where request_id = v_request.id
  order by created_at asc
  limit 1;

  return jsonb_build_object(
    'success', true,
    'id', v_request.id,
    'ticket_number', v_request.ticket_number,
    'service', v_request.service,
    'source', v_request.source,
    'status', v_request.status,
    'priority', v_request.priority,
    'customer_name', v_request.customer_name,
    'customer_email', v_request.customer_email,
    'customer_phone', v_request.customer_phone,
    'subject', v_request.subject,
    'summary', v_request.summary,
    'details', v_request.details,
    'message', v_message,
    'created_at', v_request.created_at
  );
end;
$$;

grant execute on function public.get_request_for_notification(uuid, uuid) to anon, authenticated;
