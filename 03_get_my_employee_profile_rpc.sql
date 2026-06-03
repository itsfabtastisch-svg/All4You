-- =========================================================
-- All4You Service München
-- Mitarbeiter für Dashboard-Login anlegen
--
-- 1. Supabase Dashboard öffnen
-- 2. Authentication > Users > Add user
-- 3. E-Mail und Passwort setzen
-- 4. User UID kopieren
-- 5. Unten AUTH_USER_ID_HIER_ERSETZEN, NAME und EMAIL anpassen
-- 6. SQL ausführen
-- =========================================================

insert into employees (
  auth_user_id,
  display_name,
  email,
  role,
  is_active
)
values (
  'AUTH_USER_ID_HIER_ERSETZEN',
  'Fabian',
  'MITARBEITER_EMAIL_HIER_ERSETZEN',
  'admin',
  true
)
on conflict (email)
do update set
  auth_user_id = excluded.auth_user_id,
  display_name = excluded.display_name,
  role = excluded.role,
  is_active = excluded.is_active,
  updated_at = now();
