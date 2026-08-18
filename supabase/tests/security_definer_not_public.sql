-- A API REST expõe o schema public; funções privilegiadas não devem residir nele.
do $$
declare
  exposed_functions integer;
begin
  select count(*)
    into exposed_functions
  from pg_proc procedures
  join pg_namespace namespaces on namespaces.oid = procedures.pronamespace
  where namespaces.nspname = 'public'
    and procedures.proname in ('handle_new_user', 'is_admin', 'is_operator');

  if exposed_functions <> 0 then
    raise exception 'Funções SECURITY DEFINER não podem permanecer no schema public';
  end if;
end;
$$;
