-- =========================================================
-- All4You V5.9.0 Kundenportal Basis
-- Einmal im Supabase SQL Editor ausführen.
-- Zweck:
-- - Kundenportal-Konten für Bestandskunden vorbereiten
-- - Bestehende Tickets einem Kundenkonto zuordnen
-- - Kunden sehen nach Login nur zugeordnete Aufträge
-- - Kunden können Nachrichten zum Auftrag schreiben
-- DBG: ALL4YOU-ROUTER-V5.9.0-CUSTOMER-PORTAL-BASIS
-- =========================================================

-- ---------------------------------------------------------
-- Sicherheitsprüfung: nur aktive Mitarbeiter dürfen Admin-RPCs nutzen
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
-- Kundenportal-Konten
-- auth_user_id darf zunächst leer sein. Sobald sich ein Supabase-Auth-Benutzer
-- mit gleicher E-Mail einloggt, wird er automatisch verbunden.
-- ---------------------------------------------------------
create table if not exists public.customer_portal_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique null,
  email text not null,
  display_name text not null,
  phone text null,
  company text null,
  notes text null,
  is_active boolean not null default true,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customer_portal_accounts_email_lower_idx
  on public.customer_portal_accounts (lower(email));

create index if not exists customer_portal_accounts_auth_user_id_idx
  on public.customer_portal_accounts (auth_user_id);

alter table public.customer_portal_accounts enable row level security;

-- ---------------------------------------------------------
-- Zuordnung Kundenkonto -> Anfrage/Ticket
-- ---------------------------------------------------------
create table if not exists public.customer_portal_request_links (
  id uuid primary key default gen_random_uuid(),
  customer_account_id uuid not null references public.customer_portal_accounts(id) on delete cascade,
  request_id uuid not null references public.requests(id) on delete cascade,
  linked_by uuid null,
  linked_at timestamptz not null default now(),
  note text null,
  unique (customer_account_id, request_id)
);

create index if not exists customer_portal_request_links_account_idx
  on public.customer_portal_request_links (customer_account_id);

create index if not exists customer_portal_request_links_request_idx
  on public.customer_portal_request_links (request_id);

alter table public.customer_portal_request_links enable row level security;

-- ---------------------------------------------------------
-- Admin: Kundenkonto anlegen/aktualisieren
-- ---------------------------------------------------------
create or replace function public.admin_upsert_customer_account(
  p_email text,
  p_display_name text default null,
  p_phone text default null,
  p_company text default null,
  p_notes text default null,
  p_auth_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_display_name text := trim(coalesce(p_display_name, ''));
  v_account public.customer_portal_accounts%rowtype;
begin
  if not public.is_active_dashboard_employee() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  if position('@' in v_email) = 0 then
    return jsonb_build_object('success', false, 'message', 'Bitte eine gültige E-Mail-Adresse eintragen.');
  end if;

  if length(v_display_name) < 2 then
    v_display_name := v_email;
  end if;

  select *
  into v_account
  from public.customer_portal_accounts
  where lower(email) = v_email
  limit 1;

  if v_account.id is null then
    insert into public.customer_portal_accounts (
      auth_user_id,
      email,
      display_name,
      phone,
      company,
      notes,
      created_by
    ) values (
      p_auth_user_id,
      v_email,
      v_display_name,
      nullif(trim(coalesce(p_phone, '')), ''),
      nullif(trim(coalesce(p_company, '')), ''),
      nullif(trim(coalesce(p_notes, '')), ''),
      auth.uid()
    ) returning * into v_account;
  else
    update public.customer_portal_accounts
    set
      auth_user_id = coalesce(p_auth_user_id, auth_user_id),
      display_name = v_display_name,
      phone = nullif(trim(coalesce(p_phone, phone, '')), ''),
      company = nullif(trim(coalesce(p_company, company, '')), ''),
      notes = nullif(trim(coalesce(p_notes, notes, '')), ''),
      is_active = true,
      updated_at = now()
    where id = v_account.id
    returning * into v_account;
  end if;

  return jsonb_build_object('success', true, 'account', to_jsonb(v_account));
end;
$$;

grant execute on function public.admin_upsert_customer_account(text, text, text, text, text, uuid) to authenticated;

-- ---------------------------------------------------------
-- Admin: Kundenkonten inklusive zugeordneter Tickets laden
-- ---------------------------------------------------------
create or replace function public.admin_list_customer_accounts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_accounts jsonb;
begin
  if not public.is_active_dashboard_employee() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    to_jsonb(a)
    || jsonb_build_object(
      'request_count', (
        select count(*)
        from public.customer_portal_request_links l
        where l.customer_account_id = a.id
      ),
      'requests', (
        select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc), '[]'::jsonb)
        from public.customer_portal_request_links l
        join public.requests r on r.id = l.request_id
        where l.customer_account_id = a.id
      )
    )
    order by a.created_at desc
  ), '[]'::jsonb)
  into v_accounts
  from public.customer_portal_accounts a;

  return jsonb_build_object('success', true, 'accounts', v_accounts);
end;
$$;

grant execute on function public.admin_list_customer_accounts() to authenticated;

-- ---------------------------------------------------------
-- Admin: Ticket zu Kundenkonto zuordnen
-- ---------------------------------------------------------
create or replace function public.admin_link_customer_request(
  p_account_id uuid,
  p_request_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.customer_portal_accounts%rowtype;
  v_request public.requests%rowtype;
begin
  if not public.is_active_dashboard_employee() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select * into v_account from public.customer_portal_accounts where id = p_account_id limit 1;
  if v_account.id is null then
    return jsonb_build_object('success', false, 'message', 'Kundenkonto wurde nicht gefunden.');
  end if;

  select * into v_request from public.requests where id = p_request_id limit 1;
  if v_request.id is null then
    return jsonb_build_object('success', false, 'message', 'Ticket wurde nicht gefunden.');
  end if;

  insert into public.customer_portal_request_links (
    customer_account_id,
    request_id,
    linked_by,
    note
  ) values (
    p_account_id,
    p_request_id,
    auth.uid(),
    nullif(trim(coalesce(p_note, '')), '')
  )
  on conflict (customer_account_id, request_id) do update
  set linked_at = now(), linked_by = auth.uid(), note = excluded.note;

  return jsonb_build_object('success', true, 'message', 'Ticket wurde dem Kundenkonto zugeordnet.');
end;
$$;

grant execute on function public.admin_link_customer_request(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------
-- Admin: Ticket-Zuordnung entfernen
-- ---------------------------------------------------------
create or replace function public.admin_unlink_customer_request(
  p_account_id uuid,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_dashboard_employee() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  delete from public.customer_portal_request_links
  where customer_account_id = p_account_id
    and request_id = p_request_id;

  return jsonb_build_object('success', true, 'message', 'Ticket-Zuordnung wurde entfernt.');
end;
$$;

grant execute on function public.admin_unlink_customer_request(uuid, uuid) to authenticated;

-- ---------------------------------------------------------
-- Kunde: eigenes Portal laden
-- Zuordnung erfolgt entweder über auth_user_id oder über gleiche Login-E-Mail.
-- ---------------------------------------------------------
create or replace function public.get_my_customer_portal()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_account public.customer_portal_accounts%rowtype;
  v_requests jsonb;
begin
  if v_auth_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select *
  into v_account
  from public.customer_portal_accounts a
  where (a.auth_user_id = v_auth_uid or (a.auth_user_id is null and lower(a.email) = v_email) or lower(a.email) = v_email)
    and coalesce(a.is_active, true) = true
  order by case when a.auth_user_id = v_auth_uid then 0 else 1 end
  limit 1;

  if v_account.id is null then
    return jsonb_build_object('success', false, 'message', 'Für dieses Login ist kein aktives Kundenkonto freigeschaltet.');
  end if;

  if v_account.auth_user_id is null then
    update public.customer_portal_accounts
    set auth_user_id = v_auth_uid, updated_at = now()
    where id = v_account.id
    returning * into v_account;
  end if;

  select coalesce(jsonb_agg(
    to_jsonb(r)
    || jsonb_build_object(
      'messages', (
        select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at asc), '[]'::jsonb)
        from public.request_messages m
        where m.request_id = r.id
          and coalesce(m.is_internal, false) = false
      )
    )
    order by r.created_at desc
  ), '[]'::jsonb)
  into v_requests
  from public.customer_portal_request_links l
  join public.requests r on r.id = l.request_id
  where l.customer_account_id = v_account.id;

  return jsonb_build_object(
    'success', true,
    'account', to_jsonb(v_account),
    'requests', v_requests
  );
end;
$$;

grant execute on function public.get_my_customer_portal() to authenticated;

-- ---------------------------------------------------------
-- Kunde: Nachricht zu eigenem Auftrag senden
-- ---------------------------------------------------------
create or replace function public.customer_portal_send_message(
  p_request_id uuid,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_account public.customer_portal_accounts%rowtype;
  v_message public.request_messages%rowtype;
  v_clean text := trim(coalesce(p_message, ''));
begin
  if v_auth_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if length(v_clean) < 2 then
    return jsonb_build_object('success', false, 'message', 'Bitte eine Nachricht eintragen.');
  end if;

  select *
  into v_account
  from public.customer_portal_accounts a
  where (a.auth_user_id = v_auth_uid or lower(a.email) = v_email)
    and coalesce(a.is_active, true) = true
  limit 1;

  if v_account.id is null then
    return jsonb_build_object('success', false, 'message', 'Kein aktives Kundenkonto gefunden.');
  end if;

  if not exists (
    select 1
    from public.customer_portal_request_links l
    where l.customer_account_id = v_account.id
      and l.request_id = p_request_id
  ) then
    return jsonb_build_object('success', false, 'message', 'Dieser Auftrag ist Ihrem Kundenkonto nicht zugeordnet.');
  end if;

  insert into public.request_messages (
    request_id,
    sender_type,
    sender_name,
    message,
    is_internal
  ) values (
    p_request_id,
    'kunde',
    coalesce(nullif(v_account.display_name, ''), v_account.email, 'Kunde'),
    v_clean,
    false
  )
  returning * into v_message;

  return jsonb_build_object('success', true, 'message', to_jsonb(v_message));
end;
$$;

grant execute on function public.customer_portal_send_message(uuid, text) to authenticated;

-- ---------------------------------------------------------
-- Kontrollausgabe
-- ---------------------------------------------------------
select
  'V5.9.0 Kundenportal Basis installiert' as status,
  routine_name,
  routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'admin_upsert_customer_account',
    'admin_list_customer_accounts',
    'admin_link_customer_request',
    'admin_unlink_customer_request',
    'get_my_customer_portal',
    'customer_portal_send_message'
  )
order by routine_name;
