-- Estrutura inicial da Marmitas TB para Supabase Postgres.
-- Esta migração não importa dados nem cria cobranças.

create type public.app_role as enum ('customer', 'staff', 'admin');
create type public.fulfillment_method as enum ('delivery', 'pickup');
create type public.order_status as enum (
  'aguardando_pagamento',
  'confirmado',
  'em_preparo',
  'saiu_para_entrega',
  'pronto_para_retirada',
  'concluido',
  'cancelado'
);
create type public.payment_method as enum ('pix', 'credit_card', 'voucher', 'cash');
create type public.payment_provider as enum ('asaas_test', 'asaas');
create type public.payment_status as enum ('pending', 'confirmed', 'failed', 'cancelled', 'refunded');
create type public.print_job_status as enum ('queued', 'printed', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name varchar(120) not null,
  slug varchar(140) not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name varchar(180) not null,
  description text,
  image_path text,
  price_in_cents integer not null check (price_in_cents >= 0),
  original_price_in_cents integer check (original_price_in_cents is null or original_price_in_cents >= price_in_cents),
  is_active boolean not null default true,
  requires_configuration boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  group_name varchar(100) not null,
  label varchar(160) not null,
  price_delta_in_cents integer not null default 0,
  is_required boolean not null default false,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code varchar(32) not null unique,
  customer_user_id uuid references public.profiles(id) on delete set null,
  customer_name varchar(160) not null,
  customer_phone varchar(32) not null,
  customer_phone_lookup varchar(32) not null,
  fulfillment_method public.fulfillment_method not null,
  delivery_address text,
  customer_notes text,
  subtotal_in_cents integer not null check (subtotal_in_cents >= 0),
  delivery_fee_in_cents integer not null default 0 check (delivery_fee_in_cents >= 0),
  total_in_cents integer not null check (total_in_cents >= 0),
  status public.order_status not null default 'aguardando_pagamento',
  payment_method public.payment_method not null,
  payment_provider public.payment_provider not null default 'asaas_test',
  payment_status public.payment_status not null default 'pending',
  payment_reference varchar(160),
  payment_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((fulfillment_method = 'pickup' and delivery_address is null) or (fulfillment_method = 'delivery'))
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name varchar(180) not null,
  unit_price_in_cents integer not null check (unit_price_in_cents >= 0),
  quantity integer not null check (quantity > 0),
  configuration jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type varchar(80) not null,
  from_status public.order_status,
  to_status public.order_status,
  message text,
  created_at timestamptz not null default now()
);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider varchar(40) not null,
  external_event_id varchar(160) not null,
  order_id uuid references public.orders(id) on delete set null,
  event_type varchar(120) not null,
  payload jsonb not null,
  processed_at timestamptz not null default now(),
  unique (provider, external_event_id)
);

create table public.print_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.print_job_status not null default 'queued',
  attempts integer not null default 0 check (attempts >= 0),
  printer_name varchar(160),
  printed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.store_settings (
  setting_key varchar(120) primary key,
  setting_value jsonb not null,
  updated_by_user_id uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index products_category_id_idx on public.products(category_id);
create index product_options_product_id_idx on public.product_options(product_id);
create index orders_status_created_at_idx on public.orders(status, created_at desc);
create index orders_phone_lookup_created_at_idx on public.orders(customer_phone_lookup, created_at desc);
create index orders_customer_user_id_idx on public.orders(customer_user_id);
create index order_items_order_id_idx on public.order_items(order_id);
create index order_events_order_created_at_idx on public.order_events(order_id, created_at);
create index payment_events_order_processed_at_idx on public.payment_events(order_id, processed_at);
create index print_jobs_status_created_at_idx on public.print_jobs(status, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories
for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();
create trigger product_options_set_updated_at before update on public.product_options
for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();
create trigger store_settings_set_updated_at before update on public.store_settings
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role in ('staff', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_options enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.payment_events enable row level security;
alter table public.print_jobs enable row level security;
alter table public.store_settings enable row level security;

create policy "profiles leitura própria ou administrativa" on public.profiles
for select to authenticated
using (id = auth.uid() or public.is_admin());
create policy "administradores atualizam perfis" on public.profiles
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "catálogo público ativo" on public.categories
for select to anon, authenticated
using (is_active or public.is_operator());
create policy "operadores administram categorias" on public.categories
for all to authenticated
using (public.is_operator())
with check (public.is_operator());

create policy "produtos públicos ativos" on public.products
for select to anon, authenticated
using (is_active or public.is_operator());
create policy "operadores administram produtos" on public.products
for all to authenticated
using (public.is_operator())
with check (public.is_operator());

create policy "opções públicas ativas" on public.product_options
for select to anon, authenticated
using (is_active or public.is_operator());
create policy "operadores administram opções" on public.product_options
for all to authenticated
using (public.is_operator())
with check (public.is_operator());

create policy "operadores leem pedidos" on public.orders
for select to authenticated
using (public.is_operator() or customer_user_id = auth.uid());
create policy "operadores atualizam pedidos" on public.orders
for update to authenticated
using (public.is_operator())
with check (public.is_operator());

create policy "operadores leem itens" on public.order_items
for select to authenticated
using (
  public.is_operator()
  or exists (select 1 from public.orders where orders.id = order_items.order_id and orders.customer_user_id = auth.uid())
);
create policy "operadores leem eventos" on public.order_events
for select to authenticated
using (
  public.is_operator()
  or exists (select 1 from public.orders where orders.id = order_events.order_id and orders.customer_user_id = auth.uid())
);

create policy "operadores leem eventos de pagamento" on public.payment_events
for select to authenticated using (public.is_operator());
create policy "operadores leem comandas" on public.print_jobs
for select to authenticated using (public.is_operator());
create policy "operadores atualizam comandas" on public.print_jobs
for update to authenticated using (public.is_operator()) with check (public.is_operator());
create policy "operadores leem configurações" on public.store_settings
for select to authenticated using (public.is_operator());
create policy "administradores gerenciam configurações" on public.store_settings
for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marmitas-tb-assets',
  'marmitas-tb-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "imagens públicas da Marmitas TB" on storage.objects
for select to anon, authenticated
using (bucket_id = 'marmitas-tb-assets');
create policy "operadores enviam imagens da Marmitas TB" on storage.objects
for insert to authenticated
with check (bucket_id = 'marmitas-tb-assets' and public.is_operator());
create policy "operadores alteram imagens da Marmitas TB" on storage.objects
for update to authenticated
using (bucket_id = 'marmitas-tb-assets' and public.is_operator())
with check (bucket_id = 'marmitas-tb-assets' and public.is_operator());
create policy "operadores removem imagens da Marmitas TB" on storage.objects
for delete to authenticated
using (bucket_id = 'marmitas-tb-assets' and public.is_operator());
