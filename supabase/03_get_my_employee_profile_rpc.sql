-- =========================================================
-- All4You Service München
-- Dashboard Auth RPC Fix
-- Mitarbeiterprofil sicher über aktuelle Auth-Session laden
-- =========================================================

create or replace function public.get_my_employee_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee employees%rowtype;
begin
  select *
  into v_employee
  from employees
  where auth_user_id = auth.uid()
    and is_active = true
  limit 1;

  if v_employee.id is null then
    return jsonb_build_object(
      'success', false,
      'message', 'Kein aktives Mitarbeiterprofil gefunden.',
      'auth_uid', auth.uid()
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'id', v_employee.id,
    'display_name', v_employee.display_name,
    'email', v_employee.email,
    'role', v_employee.role,
    'is_active', v_employee.is_active,
    'auth_uid', auth.uid()
  );
end;
$$;

grant execute on function public.get_my_employee_profile() to authenticated;
