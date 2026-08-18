-- Corrige a exposição de funções SECURITY DEFINER no schema public.
create schema if not exists private;
revoke all on schema private from public;

alter function public.handle_new_user() set schema private;
alter function public.is_operator() set schema private;
alter function public.is_admin() set schema private;

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.is_operator() from public, anon;
revoke all on function private.is_admin() from public, anon;

grant usage on schema private to authenticated;
grant execute on function private.is_operator() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.handle_new_user() to supabase_auth_admin;
