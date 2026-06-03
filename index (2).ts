-- =========================================================
-- All4You V6.0.0 ObjektPortal Safe Standalone SQL
-- Einmal im Supabase SQL Editor ausführen.
--
-- Zweck:
-- - Grundtabellen für das All4You ObjektPortal
-- - Kunde -> Objekt -> Einheit/Bereich -> Reinigungsintervall
-- - Admin/Chef kann Objekte und Einheiten anlegen
-- - Kunde sieht eigene Objekte im Kundenportal
--
-- Noch NICHT enthalten:
-- - QR-Code-Check-in
-- - Bilddokumentation
-- - Abschlussberichte
-- - kontrollierte Kundenhinweise
--
-- DBG: ALL4YOU-V6.0.0-OBJECTPORTAL-SAFE-STANDALONE-SQL
-- =========================================================

-- ---------------------------------------------------------
-- Sicherheit: Mitarbeiterprüfung bereitstellen, falls V5.9.0 noch nicht erneut lief
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
-- Kundeinstellungen / Paketlogik für das ObjektPortal
-- ---------------------------------------------------------
create table if not exists public.object_portal_customer_settings (
  id uuid primary key default gen_random_uuid(),
  customer_account_id uuid not null unique references public.customer_portal_accounts(id) on delete cascade,
  package_key text not null default 'basic',
  monthly_price numeric(10,2) null,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  notes text null,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists object_portal_customer_settings_customer_idx
  on public.object_portal_customer_settings(customer_account_id);

alter table public.object_portal_customer_settings enable row level security;

-- ---------------------------------------------------------
-- Objekte
-- ---------------------------------------------------------
create table if not exists public.object_portal_objects (
  id uuid primary key default gen_random_uuid(),
  customer_account_id uuid not null references public.customer_portal_accounts(id) on delete cascade,
  name text not null,
  object_type text null,
  street text null,
  zip text null,
  city text null,
  address_extra text null,
  status text not null default 'active',
  notes text null,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists object_portal_objects_customer_idx
  on public.object_portal_objects(customer_account_id);

create index if not exists object_portal_objects_status_idx
  on public.object_portal_objects(status);

alter table public.object_portal_objects enable row level security;

-- ---------------------------------------------------------
-- Einheiten / Bereiche / Räume
-- ---------------------------------------------------------
create table if not exists public.object_portal_units (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.object_portal_objects(id) on delete cascade,
  name text not null,
  unit_type text null,
  floor text null,
  cleaning_interval text null,
  weekday_hint text null,
  time_hint text null,
  status text not null default 'active',
  notes text null,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists object_portal_units_object_idx
  on public.object_portal_units(object_id);

create index if not exists object_portal_units_status_idx
  on public.object_portal_units(status);

alter table public.object_portal_units enable row level security;

-- ---------------------------------------------------------
-- Admin/Chef: ObjektPortal-Daten laden
-- ---------------------------------------------------------
create or replace function public.admin_list_object_portal()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customers jsonb;
  v_objects jsonb;
  v_stats jsonb;
begin
  if not public.is_active_dashboard_employee() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(
    to_jsonb(a)
    || jsonb_build_object(
      'package_key', coalesce(s.package_key, 'basic'),
      'monthly_price', s.monthly_price,
      'features', coalesce(s.features, '{}'::jsonb),
      'object_portal_active', coalesce(s.is_active, false),
      'object_count', (
        select count(*)
        from public.object_portal_objects o
        where o.customer_account_id = a.id
      )
    )
    order by a.created_at desc
  ), '[]'::jsonb)
  into v_customers
  from public.customer_portal_accounts a
  left join public.object_portal_customer_settings s
    on s.customer_account_id = a.id
  where coalesce(a.is_active, true) = true;

  select coalesce(jsonb_agg(
    to_jsonb(o)
    || jsonb_build_object(
      'customer', (
        to_jsonb(a)
        || jsonb_build_object(
          'package_key', coalesce(s.package_key, 'basic'),
          'monthly_price', s.monthly_price,
          'features', coalesce(s.features, '{}'::jsonb)
        )
      ),
      'units', (
        select coalesce(jsonb_agg(to_jsonb(u) order by u.created_at asc), '[]'::jsonb)
        from public.object_portal_units u
        where u.object_id = o.id
      )
    )
    order by o.created_at desc
  ), '[]'::jsonb)
  into v_objects
  from public.object_portal_objects o
  join public.customer_portal_accounts a
    on a.id = o.customer_account_id
  left join public.object_portal_customer_settings s
    on s.customer_account_id = a.id;

  select jsonb_build_object(
    'objects', (select count(*) from public.object_portal_objects),
    'units', (select count(*) from public.object_portal_units),
    'active_customers', (select count(*) from public.object_portal_customer_settings where coalesce(is_active, true) = true)
  )
  into v_stats;

  return jsonb_build_object(
    'success', true,
    'customers', v_customers,
    'objects', v_objects,
    'stats', v_stats
  );
end;
$$;

grant execute on function public.admin_list_object_portal() to authenticated;

-- ---------------------------------------------------------
-- Admin/Chef: Objekt anlegen + Paketgrundlage setzen
-- ---------------------------------------------------------
create or replace function public.admin_create_object_portal_object(
  p_customer_account_id uuid,
  p_name text,
  p_object_type text default null,
  p_street text default null,
  p_zip text default null,
  p_city text default null,
  p_status text default 'active',
  p_notes text default null,
  p_package_key text default 'basic',
  p_monthly_price numeric default null,
  p_initial_unit_name text default null,
  p_initial_unit_type text default null,
  p_initial_cleaning_interval text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customer_portal_accounts%rowtype;
  v_object public.object_portal_objects%rowtype;
  v_unit_name text := trim(coalesce(p_initial_unit_name, ''));
  v_package text := lower(trim(coalesce(p_package_key, 'basic')));
  v_status text := lower(trim(coalesce(p_status, 'active')));
begin
  if not public.is_active_dashboard_employee() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select *
  into v_customer
  from public.customer_portal_accounts
  where id = p_customer_account_id
    and coalesce(is_active, true) = true
  limit 1;

  if v_customer.id is null then
    return jsonb_build_object('success', false, 'message', 'Kundenkonto wurde nicht gefunden oder ist inaktiv.');
  end if;

  if length(trim(coalesce(p_name, ''))) < 2 then
    return jsonb_build_object('success', false, 'message', 'Bitte einen gültigen Objektnamen eintragen.');
  end if;

  if v_package not in ('basic', 'plus', 'pro', 'custom') then
    v_package := 'basic';
  end if;

  if v_status not in ('active', 'paused', 'draft') then
    v_status := 'active';
  end if;

  insert into public.object_portal_customer_settings (
    customer_account_id,
    package_key,
    monthly_price,
    created_by,
    updated_at
  ) values (
    p_customer_account_id,
    v_package,
    p_monthly_price,
    auth.uid(),
    now()
  )
  on conflict (customer_account_id) do update
  set
    package_key = excluded.package_key,
    monthly_price = excluded.monthly_price,
    is_active = true,
    updated_at = now();

  insert into public.object_portal_objects (
    customer_account_id,
    name,
    object_type,
    street,
    zip,
    city,
    status,
    notes,
    created_by
  ) values (
    p_customer_account_id,
    trim(p_name),
    nullif(trim(coalesce(p_object_type, '')), ''),
    nullif(trim(coalesce(p_street, '')), ''),
    nullif(trim(coalesce(p_zip, '')), ''),
    nullif(trim(coalesce(p_city, '')), ''),
    v_status,
    nullif(trim(coalesce(p_notes, '')), ''),
    auth.uid()
  )
  returning * into v_object;

  if length(v_unit_name) >= 2 then
    insert into public.object_portal_units (
      object_id,
      name,
      unit_type,
      cleaning_interval,
      created_by
    ) values (
      v_object.id,
      v_unit_name,
      nullif(trim(coalesce(p_initial_unit_type, '')), ''),
      nullif(trim(coalesce(p_initial_cleaning_interval, '')), ''),
      auth.uid()
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'message', 'Objekt wurde gespeichert.',
    'object', to_jsonb(v_object)
  );
end;
$$;

grant execute on function public.admin_create_object_portal_object(
  uuid, text, text, text, text, text, text, text, text, numeric, text, text, text
) to authenticated;

-- ---------------------------------------------------------
-- Admin/Chef: Einheit / Bereich ergänzen
-- ---------------------------------------------------------
create or replace function public.admin_create_object_portal_unit(
  p_object_id uuid,
  p_name text,
  p_unit_type text default null,
  p_cleaning_interval text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_object public.object_portal_objects%rowtype;
  v_unit public.object_portal_units%rowtype;
begin
  if not public.is_active_dashboard_employee() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select *
  into v_object
  from public.object_portal_objects
  where id = p_object_id
  limit 1;

  if v_object.id is null then
    return jsonb_build_object('success', false, 'message', 'Objekt wurde nicht gefunden.');
  end if;

  if length(trim(coalesce(p_name, ''))) < 2 then
    return jsonb_build_object('success', false, 'message', 'Bitte einen gültigen Namen für die Einheit eintragen.');
  end if;

  insert into public.object_portal_units (
    object_id,
    name,
    unit_type,
    cleaning_interval,
    notes,
    created_by
  ) values (
    p_object_id,
    trim(p_name),
    nullif(trim(coalesce(p_unit_type, '')), ''),
    nullif(trim(coalesce(p_cleaning_interval, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    auth.uid()
  )
  returning * into v_unit;

  return jsonb_build_object(
    'success', true,
    'message', 'Einheit wurde gespeichert.',
    'unit', to_jsonb(v_unit)
  );
end;
$$;

grant execute on function public.admin_create_object_portal_unit(uuid, text, text, text, text) to authenticated;

-- ---------------------------------------------------------
-- Kunde: eigene ObjektPortal-Daten laden
-- ---------------------------------------------------------
create or replace function public.get_my_object_portal()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_account public.customer_portal_accounts%rowtype;
  v_settings public.object_portal_customer_settings%rowtype;
  v_objects jsonb;
begin
  if v_auth_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select *
  into v_account
  from public.customer_portal_accounts a
  where (a.auth_user_id = v_auth_uid or lower(a.email) = v_email)
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

  select *
  into v_settings
  from public.object_portal_customer_settings
  where customer_account_id = v_account.id
    and coalesce(is_active, true) = true
  limit 1;

  select coalesce(jsonb_agg(
    to_jsonb(o)
    || jsonb_build_object(
      'units', (
        select coalesce(jsonb_agg(to_jsonb(u) order by u.created_at asc), '[]'::jsonb)
        from public.object_portal_units u
        where u.object_id = o.id
          and coalesce(u.status, 'active') <> 'archived'
      )
    )
    order by o.created_at desc
  ), '[]'::jsonb)
  into v_objects
  from public.object_portal_objects o
  where o.customer_account_id = v_account.id
    and coalesce(o.status, 'active') <> 'archived';

  return jsonb_build_object(
    'success', true,
    'account', to_jsonb(v_account),
    'settings', coalesce(to_jsonb(v_settings), '{}'::jsonb),
    'objects', v_objects
  );
end;
$$;

grant execute on function public.get_my_object_portal() to authenticated;

-- ---------------------------------------------------------
-- Kontrollausgabe
-- ---------------------------------------------------------
select
  'V6.0.0 ObjektPortal Foundation installiert' as status,
  routine_name,
  routine_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'admin_list_object_portal',
    'admin_create_object_portal_object',
    'admin_create_object_portal_unit',
    'get_my_object_portal'
  )
order by routine_name;
