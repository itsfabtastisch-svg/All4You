-- =========================================================
-- All4You Service München
-- V5.8.0 · Statuslink + Kundennachrichten Phase 1
--
-- Zweck:
-- - Kunden können nach Status-Verifizierung eine Nachricht zum Ticket senden.
-- - Kunden sehen öffentliche Team-/Kundennachrichten auf der Statusseite.
-- - Interne Notizen bleiben geschützt.
-- - Status-Uploads werden weiterhin sauber dem Ticket zugeordnet.
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
  v_messages jsonb;
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
      lower(coalesce(customer_email, '')) = v_verify
      or regexp_replace(coalesce(customer_phone, ''), '\D', '', 'g') = v_verify_phone
      or (
        position('@' in v_verify) > 0
        and position(
          v_verify in lower(coalesce(customer_email, '') || ' ' || coalesce(customer_phone, ''))
        ) > 0
      )
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

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'sender_type', sender_type,
        'sender_name', sender_name,
        'message', message,
        'created_at', created_at
      )
      order by created_at asc
    ),
    '[]'::jsonb
  )
  into v_messages
  from request_messages
  where request_id = v_request.id
    and coalesce(is_internal, false) = false;

  return jsonb_build_object(
    'success', true,
    'ticket_number', v_request.ticket_number,
    'service', v_request.service,
    'status', v_request.status,
    'summary', v_request.summary,
    'created_at', v_request.created_at,
    'updated_at', v_request.updated_at,
    'history', v_history,
    'messages', v_messages
  );
end;
$$;

grant execute on function public.get_public_request_status(text, text) to anon, authenticated;


create or replace function public.send_public_request_message(
  p_ticket_number text,
  p_verification text,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request requests%rowtype;
  v_ticket text := upper(trim(coalesce(p_ticket_number, '')));
  v_verify text := lower(trim(coalesce(p_verification, '')));
  v_verify_phone text := regexp_replace(coalesce(p_verification, ''), '\D', '', 'g');
  v_message text := trim(coalesce(p_message, ''));
begin
  if v_ticket = '' or v_verify = '' then
    return jsonb_build_object('success', false, 'message', 'Bitte Ticketnummer und E-Mail oder Telefonnummer eingeben.');
  end if;

  if length(v_message) < 2 then
    return jsonb_build_object('success', false, 'message', 'Bitte eine Nachricht eingeben.');
  end if;

  select *
  into v_request
  from requests
  where upper(ticket_number) = v_ticket
    and (
      lower(coalesce(customer_email, '')) = v_verify
      or regexp_replace(coalesce(customer_phone, ''), '\D', '', 'g') = v_verify_phone
      or (
        position('@' in v_verify) > 0
        and position(
          v_verify in lower(coalesce(customer_email, '') || ' ' || coalesce(customer_phone, ''))
        ) > 0
      )
      or (
        length(v_verify_phone) >= 6
        and position(
          v_verify_phone in regexp_replace(coalesce(customer_email, '') || ' ' || coalesce(customer_phone, ''), '\D', '', 'g')
        ) > 0
      )
    )
  limit 1;

  if v_request.id is null then
    return jsonb_build_object('success', false, 'message', 'Ticket wurde nicht gefunden oder die Verifizierung stimmt nicht.');
  end if;

  insert into request_messages (
    request_id,
    sender_type,
    sender_name,
    message,
    is_internal
  )
  values (
    v_request.id,
    'kunde',
    coalesce(nullif(trim(v_request.customer_name), ''), 'Kunde'),
    v_message,
    false
  );

  update requests
  set updated_at = now()
  where id = v_request.id;

  return jsonb_build_object('success', true, 'message', 'Nachricht wurde gespeichert.');
end;
$$;

grant execute on function public.send_public_request_message(text, text, text) to anon, authenticated;


create or replace function public.register_public_request_attachment(
  p_request_id uuid,
  p_public_status_token uuid,
  p_file_name text,
  p_file_path text,
  p_file_type text,
  p_mime_type text,
  p_file_size bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request requests%rowtype;
begin
  select *
  into v_request
  from requests
  where id = p_request_id
    and public_status_token = p_public_status_token
  limit 1;

  if v_request.id is null then
    return jsonb_build_object('success', false, 'message', 'Ticket konnte nicht verifiziert werden.');
  end if;

  insert into request_attachments (
    request_id,
    file_name,
    file_path,
    file_type,
    mime_type,
    file_size,
    uploaded_by,
    is_internal
  )
  values (
    v_request.id,
    nullif(trim(coalesce(p_file_name, '')), ''),
    nullif(trim(coalesce(p_file_path, '')), ''),
    coalesce(nullif(trim(coalesce(p_file_type, '')), ''), 'document'),
    coalesce(nullif(trim(coalesce(p_mime_type, '')), ''), 'application/octet-stream'),
    coalesce(p_file_size, 0),
    'kunde',
    false
  );

  update requests
  set updated_at = now()
  where id = v_request.id;

  return jsonb_build_object('success', true, 'message', 'Datei wurde dem Ticket zugeordnet.');
end;
$$;

grant execute on function public.register_public_request_attachment(uuid, uuid, text, text, text, text, bigint) to anon, authenticated;


create or replace function public.register_public_status_attachment(
  p_ticket_number text,
  p_verification text,
  p_file_name text,
  p_file_path text,
  p_file_type text,
  p_mime_type text,
  p_file_size bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request requests%rowtype;
  v_ticket text := upper(trim(coalesce(p_ticket_number, '')));
  v_verify text := lower(trim(coalesce(p_verification, '')));
  v_verify_phone text := regexp_replace(coalesce(p_verification, ''), '\D', '', 'g');
begin
  select *
  into v_request
  from requests
  where upper(ticket_number) = v_ticket
    and (
      lower(coalesce(customer_email, '')) = v_verify
      or regexp_replace(coalesce(customer_phone, ''), '\D', '', 'g') = v_verify_phone
      or (
        position('@' in v_verify) > 0
        and position(
          v_verify in lower(coalesce(customer_email, '') || ' ' || coalesce(customer_phone, ''))
        ) > 0
      )
      or (
        length(v_verify_phone) >= 6
        and position(
          v_verify_phone in regexp_replace(coalesce(customer_email, '') || ' ' || coalesce(customer_phone, ''), '\D', '', 'g')
        ) > 0
      )
    )
  limit 1;

  if v_request.id is null then
    return jsonb_build_object('success', false, 'message', 'Ticket wurde nicht gefunden oder die Verifizierung stimmt nicht.');
  end if;

  insert into request_attachments (
    request_id,
    file_name,
    file_path,
    file_type,
    mime_type,
    file_size,
    uploaded_by,
    is_internal
  )
  values (
    v_request.id,
    nullif(trim(coalesce(p_file_name, '')), ''),
    nullif(trim(coalesce(p_file_path, '')), ''),
    coalesce(nullif(trim(coalesce(p_file_type, '')), ''), 'document'),
    coalesce(nullif(trim(coalesce(p_mime_type, '')), ''), 'application/octet-stream'),
    coalesce(p_file_size, 0),
    'kunde',
    false
  );

  update requests
  set updated_at = now()
  where id = v_request.id;

  return jsonb_build_object('success', true, 'message', 'Datei wurde dem Ticket zugeordnet.');
end;
$$;

grant execute on function public.register_public_status_attachment(text, text, text, text, text, text, bigint) to anon, authenticated;
