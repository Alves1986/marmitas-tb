begin;

select plan(6);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.orders'::regclass),
  'orders usa RLS'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles usa RLS'
);

select is_empty(
  'select * from public.orders',
  'anon não lê pedidos'
);

select is_empty(
  'select * from public.print_jobs',
  'anon não lê a fila de impressão'
);

select has_table('public', 'categories', 'categories existe');
select has_table('public', 'products', 'products existe');

select * from finish();

rollback;
