-- Permite que a política pública de catálogo avalie o papel do visitante.
-- A função permanece no schema private, que não é exposto pelo PostgREST.
grant usage on schema private to anon;
grant execute on function private.is_operator() to anon;
