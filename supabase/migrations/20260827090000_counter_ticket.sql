-- PDV de balcão: extensão aditiva do núcleo unificado, sem modificar pedidos existentes.

alter type public.payment_method add value if not exists 'debit_card';
alter type public.payment_provider add value if not exists 'counter_record';

alter table public.orders
  add column if not exists counter_ticket_date date,
  add column if not exists counter_ticket_number integer;

create unique index if not exists orders_counter_ticket_daily_unique
  on public.orders (counter_ticket_date, counter_ticket_number)
  where source_channel = 'COUNTER'
    and counter_ticket_date is not null
    and counter_ticket_number is not null;

create or replace function public.create_counter_order(
  p_code varchar,
  p_idempotency_key uuid,
  p_display_name varchar,
  p_subtotal_in_cents integer,
  p_total_in_cents integer,
  p_payment_method public.payment_method,
  p_items jsonb,
  p_actor_user_id uuid,
  p_print_station_code text default 'COZINHA'
)
returns table(
  order_id uuid,
  order_code varchar,
  order_created_at timestamptz,
  counter_ticket_date date,
  counter_ticket_number integer,
  reused boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_created record;
  v_order public.orders%rowtype;
  v_ticket_date date;
  v_ticket_number integer;
begin
  select * into v_created
  from public.create_unified_order(
    p_code => p_code,
    p_source_channel => 'COUNTER',
    p_idempotency_key => p_idempotency_key,
    p_external_provider => null,
    p_external_order_id => null,
    p_customer_name => coalesce(nullif(trim(p_display_name), ''), 'Cliente de balcão'),
    p_customer_phone => 'BALCAO',
    p_customer_phone_lookup => 'BALCAO',
    p_fulfillment_method => 'pickup',
    p_delivery_address => null,
    p_customer_notes => 'Pagamento registrado presencialmente no PDV.',
    p_subtotal_in_cents => p_subtotal_in_cents,
    p_delivery_fee_in_cents => 0,
    p_total_in_cents => p_total_in_cents,
    p_status => 'confirmado',
    p_payment_method => p_payment_method,
    p_payment_provider => 'counter_record',
    p_payment_status => 'confirmed',
    p_payment_reference => format('counter_%s', p_code),
    p_items => p_items,
    p_actor_user_id => p_actor_user_id,
    p_print_station_code => p_print_station_code
  );

  select * into v_order
  from public.orders
  where id = v_created.order_id
  for update;

  if v_created.reused then
    return query select v_order.id, v_order.code, v_order.created_at, v_order.counter_ticket_date, v_order.counter_ticket_number, true;
    return;
  end if;

  v_ticket_date := timezone('America/Sao_Paulo', now())::date;
  perform pg_advisory_xact_lock(hashtext('counter-ticket:' || v_ticket_date::text));

  select coalesce(max(counter_orders.counter_ticket_number), 0) + 1
  into v_ticket_number
  from public.orders as counter_orders
  where counter_orders.source_channel = 'COUNTER'
    and counter_orders.counter_ticket_date = v_ticket_date;

  update public.orders
  set counter_ticket_date = v_ticket_date,
      counter_ticket_number = v_ticket_number
  where id = v_order.id;

  insert into public.audit_logs (actor_user_id, source_channel, action, entity_type, entity_id, metadata)
  values (
    p_actor_user_id,
    'COUNTER',
    'counter.ticket_assigned',
    'order',
    v_order.id,
    jsonb_build_object('ticketDate', v_ticket_date, 'ticketNumber', v_ticket_number)
  );

  return query select v_order.id, v_order.code, v_order.created_at, v_ticket_date, v_ticket_number, false;
end;
$$;

revoke all on function public.create_counter_order(varchar, uuid, varchar, integer, integer, public.payment_method, jsonb, uuid, text) from public, anon, authenticated;
grant execute on function public.create_counter_order(varchar, uuid, varchar, integer, integer, public.payment_method, jsonb, uuid, text) to service_role;
