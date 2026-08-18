-- Processa o evento Asaas uma única vez e libera o pedido somente após confirmação.
-- A função é destinada exclusivamente à service_role das funções Vercel.
create or replace function public.process_asaas_webhook_event(
  p_event_id text,
  p_event_type text,
  p_payment_id text,
  p_payload jsonb
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment_event_id uuid;
  v_order public.orders%rowtype;
begin
  insert into public.payment_events (
    provider,
    external_event_id,
    event_type,
    payload
  ) values (
    'asaas',
    p_event_id,
    coalesce(nullif(p_event_type, ''), 'UNKNOWN'),
    p_payload
  )
  on conflict (provider, external_event_id) do nothing
  returning id into v_payment_event_id;

  if v_payment_event_id is null then
    return 'duplicate';
  end if;

  if p_event_type not in ('PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED')
    or nullif(p_payment_id, '') is null then
    return 'processed';
  end if;

  select * into v_order
  from public.orders
  where payment_provider = 'asaas'
    and payment_reference = p_payment_id
  for update;

  if not found then
    return 'processed';
  end if;

  update public.payment_events
  set order_id = v_order.id
  where id = v_payment_event_id;

  if v_order.payment_status = 'confirmed' then
    return 'processed';
  end if;

  update public.orders
  set
    status = 'confirmado',
    payment_status = 'confirmed',
    payment_confirmed_at = now()
  where id = v_order.id;

  insert into public.order_events (
    order_id,
    event_type,
    from_status,
    to_status,
    message
  ) values (
    v_order.id,
    'asaas_payment_received',
    v_order.status,
    'confirmado',
    'Pagamento oficial confirmado pelo webhook do Asaas; pedido liberado para preparo.'
  );

  insert into public.print_jobs (order_id, status)
  values (v_order.id, 'queued');

  return 'processed';
end;
$$;

revoke all on function public.process_asaas_webhook_event(text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.process_asaas_webhook_event(text, text, text, jsonb)
  to service_role;
