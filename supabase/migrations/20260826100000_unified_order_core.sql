-- Núcleo unificado de pedidos da Marmitas TB.
-- Migração aditiva: preserva pedidos, itens, eventos e trabalhos de impressão existentes.

do $$
begin
  create type public.order_source_channel as enum (
    'OWN_APP',
    'KIOSK',
    'COUNTER',
    'IFOOD',
    'PHONE',
    'WHATSAPP',
    'INTERNAL'
  );
exception
  when duplicate_object then null;
end
$$;

alter table public.orders
  add column if not exists source_channel public.order_source_channel,
  add column if not exists external_provider text,
  add column if not exists external_order_id text,
  add column if not exists idempotency_key uuid;

update public.orders set source_channel = 'OWN_APP' where source_channel is null;

alter table public.orders
  alter column source_channel set not null;

create unique index if not exists orders_source_idempotency_unique
  on public.orders (source_channel, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists orders_external_provider_id_unique
  on public.orders (external_provider, external_order_id)
  where external_provider is not null and external_order_id is not null;

create index if not exists orders_source_created_at_idx
  on public.orders (source_channel, created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  source_channel public.order_source_channel,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_created_at_idx
  on public.audit_logs (entity_type, entity_id, created_at desc);

create table if not exists public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  attempts integer not null default 0 check (attempts >= 0),
  published_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index if not exists outbox_events_pending_idx
  on public.outbox_events (created_at asc)
  where published_at is null;

create table if not exists public.print_stations (
  code text primary key,
  name text not null,
  purpose text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.print_stations (code, name, purpose)
values
  ('COZINHA', 'Cozinha', 'Produção de alimentos'),
  ('EMBALAGEM', 'Embalagem', 'Bebidas e sobremesas'),
  ('BALCAO', 'Balcão', 'Comprovantes e atendimento'),
  ('CAIXA', 'Caixa', 'Financeiro e fechamento'),
  ('ENTREGA', 'Entrega', 'Expedição')
on conflict (code) do nothing;

alter table public.print_jobs
  add column if not exists station_code text not null default 'COZINHA',
  add column if not exists document_type text not null default 'ORDER',
  add column if not exists priority integer not null default 50,
  add column if not exists dedupe_key text,
  add column if not exists last_error text;

do $$
begin
  alter table public.print_jobs
    add constraint print_jobs_priority_range check (priority between 0 and 100) not valid;
exception
  when duplicate_object then null;
end
$$;

alter table public.print_jobs
  validate constraint print_jobs_priority_range;

create unique index if not exists print_jobs_dedupe_key_unique
  on public.print_jobs (dedupe_key)
  where dedupe_key is not null;

create index if not exists print_jobs_queue_priority_idx
  on public.print_jobs (status, priority desc, created_at asc);

alter table public.audit_logs enable row level security;
alter table public.outbox_events enable row level security;
alter table public.print_stations enable row level security;

create policy "operadores leem auditoria" on public.audit_logs
for select to authenticated using (private.is_operator());

create policy "operadores leem estações de impressão" on public.print_stations
for select to authenticated using (private.is_operator());

create policy "administradores gerenciam estações de impressão" on public.print_stations
for all to authenticated using (private.is_admin()) with check (private.is_admin());

create or replace function public.create_unified_order(
  p_code varchar,
  p_source_channel public.order_source_channel,
  p_idempotency_key uuid,
  p_external_provider text,
  p_external_order_id text,
  p_customer_name varchar,
  p_customer_phone varchar,
  p_customer_phone_lookup varchar,
  p_fulfillment_method public.fulfillment_method,
  p_delivery_address text,
  p_customer_notes text,
  p_subtotal_in_cents integer,
  p_delivery_fee_in_cents integer,
  p_total_in_cents integer,
  p_status public.order_status,
  p_payment_method public.payment_method,
  p_payment_provider public.payment_provider,
  p_payment_status public.payment_status,
  p_payment_reference varchar,
  p_items jsonb,
  p_actor_user_id uuid default null,
  p_print_station_code text default 'COZINHA'
)
returns table(order_id uuid, order_code varchar, order_created_at timestamptz, reused boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item jsonb;
  v_priority integer := case when p_source_channel = 'COUNTER' then 100 else 50 end;
begin
  if p_idempotency_key is not null then
    select * into v_order
    from public.orders
    where source_channel = p_source_channel
      and idempotency_key = p_idempotency_key;

    if found then
      return query select v_order.id, v_order.code, v_order.created_at, true;
      return;
    end if;
  end if;

  insert into public.orders (
    code,
    customer_name,
    customer_phone,
    customer_phone_lookup,
    fulfillment_method,
    delivery_address,
    customer_notes,
    subtotal_in_cents,
    delivery_fee_in_cents,
    total_in_cents,
    status,
    payment_method,
    payment_provider,
    payment_status,
    payment_reference,
    source_channel,
    external_provider,
    external_order_id,
    idempotency_key
  ) values (
    p_code,
    p_customer_name,
    p_customer_phone,
    p_customer_phone_lookup,
    p_fulfillment_method,
    p_delivery_address,
    p_customer_notes,
    p_subtotal_in_cents,
    p_delivery_fee_in_cents,
    p_total_in_cents,
    p_status,
    p_payment_method,
    p_payment_provider,
    p_payment_status,
    p_payment_reference,
    p_source_channel,
    nullif(p_external_provider, ''),
    nullif(p_external_order_id, ''),
    p_idempotency_key
  ) on conflict (source_channel, idempotency_key) where idempotency_key is not null do nothing
  returning * into v_order;

  if not found then
    select * into v_order
    from public.orders
    where source_channel = p_source_channel
      and idempotency_key = p_idempotency_key;

    return query select v_order.id, v_order.code, v_order.created_at, true;
    return;
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      unit_price_in_cents,
      quantity,
      configuration,
      notes
    ) values (
      v_order.id,
      nullif(v_item ->> 'productId', '')::uuid,
      v_item ->> 'productName',
      (v_item ->> 'unitPriceInCents')::integer,
      (v_item ->> 'quantity')::integer,
      coalesce(v_item -> 'configuration', '[]'::jsonb),
      nullif(v_item ->> 'note', '')
    );
  end loop;

  insert into public.order_events (order_id, actor_user_id, event_type, to_status, message)
  values (
    v_order.id,
    p_actor_user_id,
    'created',
    v_order.status,
    format('Pedido recebido pelo canal %s.', p_source_channel)
  );

  insert into public.audit_logs (actor_user_id, source_channel, action, entity_type, entity_id, metadata)
  values (
    p_actor_user_id,
    p_source_channel,
    'order.created',
    'order',
    v_order.id,
    jsonb_build_object('code', v_order.code, 'status', v_order.status)
  );

  insert into public.outbox_events (event_key, event_type, aggregate_type, aggregate_id, payload)
  values (
    format('OrderCreated:%s', v_order.id),
    'OrderCreated',
    'order',
    v_order.id,
    jsonb_build_object('orderId', v_order.id, 'sourceChannel', p_source_channel)
  );

  if v_order.status = 'confirmado' then
    insert into public.print_jobs (order_id, station_code, document_type, priority, dedupe_key, status)
    values (
      v_order.id,
      p_print_station_code,
      'ORDER',
      v_priority,
      format('order:%s:station:%s:document:ORDER', v_order.id, p_print_station_code),
      'queued'
    ) on conflict (dedupe_key) where dedupe_key is not null do nothing;

    insert into public.outbox_events (event_key, event_type, aggregate_type, aggregate_id, payload)
    values (
      format('PrintJobCreated:%s:%s', v_order.id, p_print_station_code),
      'PrintJobCreated',
      'order',
      v_order.id,
      jsonb_build_object('orderId', v_order.id, 'stationCode', p_print_station_code, 'priority', v_priority)
    ) on conflict (event_key) do nothing;
  end if;

  return query select v_order.id, v_order.code, v_order.created_at, false;
end;
$$;

revoke all on function public.create_unified_order(
  varchar,
  public.order_source_channel,
  uuid,
  text,
  text,
  varchar,
  varchar,
  varchar,
  public.fulfillment_method,
  text,
  text,
  integer,
  integer,
  integer,
  public.order_status,
  public.payment_method,
  public.payment_provider,
  public.payment_status,
  varchar,
  jsonb,
  uuid,
  text
) from public, anon, authenticated;

grant execute on function public.create_unified_order(
  varchar,
  public.order_source_channel,
  uuid,
  text,
  text,
  varchar,
  varchar,
  varchar,
  public.fulfillment_method,
  text,
  text,
  integer,
  integer,
  integer,
  public.order_status,
  public.payment_method,
  public.payment_provider,
  public.payment_status,
  varchar,
  jsonb,
  uuid,
  text
) to service_role;
