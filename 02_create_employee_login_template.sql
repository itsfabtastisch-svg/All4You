-- =========================================================
-- All4You Service München
-- Supabase RPC v1
-- Öffentliche Webseiten-Anfragen sicher anlegen
-- =========================================================

create or replace function public.create_public_request(
  p_service service_type,
  p_customer_name text,
  p_customer_email text default null,
  p_customer_phone text default null,
  p_subject text default null,
  p_summary text default null,
  p_details jsonb default '{}'::jsonb,
  p_source request_source default 'wizard',
  p_initial_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_request requests%rowtype;
begin
  if length(trim(coalesce(p_customer_name, ''))) < 2 then
    raise exception 'customer_name_required';
  end if;

  if (
    length(trim(coalesce(p_customer_email, ''))) = 0
    and length(trim(coalesce(p_customer_phone, ''))) = 0
  ) then
    raise exception 'contact_required';
  end if;

  insert into customers (
    name,
    email,
    phone
  )
  values (
    trim(p_customer_name),
    nullif(trim(coalesce(p_customer_email, '')), ''),
    nullif(trim(coalesce(p_customer_phone, '')), '')
  )
  returning id into v_customer_id;

  insert into requests (
    service,
    source,
    customer_id,
    customer_name,
    customer_email,
    customer_phone,
    subject,
    summary,
    details
  )
  values (
    p_service,
    p_source,
    v_customer_id,
    trim(p_customer_name),
    nullif(trim(coalesce(p_customer_email, '')), ''),
    nullif(trim(coalesce(p_customer_phone, '')), ''),
    nullif(trim(coalesce(p_subject, '')), ''),
    nullif(trim(coalesce(p_summary, '')), ''),
    coalesce(p_details, '{}'::jsonb)
  )
  returning * into v_request;

  if length(trim(coalesce(p_initial_message, ''))) > 0 then
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
      trim(p_customer_name),
      trim(p_initial_message),
      false
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'id', v_request.id,
    'ticket_number', v_request.ticket_number,
    'status', v_request.status,
    'public_status_token', v_request.public_status_token
  );
end;
$$;

revoke all on function public.create_public_request(
  service_type,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  request_source,
  text
) from public;

grant execute on function public.create_public_request(
  service_type,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  request_source,
  text
) to anon, authenticated;
