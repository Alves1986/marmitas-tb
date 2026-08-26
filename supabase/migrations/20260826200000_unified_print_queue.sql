-- Reimpressões unificadas: preserva a fila existente e torna cada solicitação rastreável.

create or replace function public.requeue_print_job(
  p_order_id uuid,
  p_actor_user_id uuid,
  p_reason text,
  p_station_code text default 'COZINHA'
)
returns table(print_job_id uuid, print_job_status public.print_job_status, print_job_priority integer, print_job_created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_job public.print_jobs%rowtype;
  v_priority integer;
begin
  if length(trim(p_reason)) < 3 then
    raise exception 'O motivo da reimpressão é obrigatório.';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Pedido não encontrado.';
  end if;

  v_priority := case when v_order.source_channel = 'COUNTER' then 100 else 50 end;

  insert into public.print_jobs (order_id, station_code, document_type, priority, dedupe_key, status)
  values (
    v_order.id,
    coalesce(nullif(trim(p_station_code), ''), 'COZINHA'),
    'ORDER_REPRINT',
    v_priority,
    format('reprint:%s:%s', v_order.id, gen_random_uuid()),
    'queued'
  )
  returning * into v_job;

  insert into public.order_events (order_id, actor_user_id, event_type, message)
  values (
    v_order.id,
    p_actor_user_id,
    'print_requeued',
    format('Reimpressão solicitada pela equipe. Motivo: %s', trim(p_reason))
  );

  insert into public.audit_logs (actor_user_id, source_channel, action, entity_type, entity_id, metadata)
  values (
    p_actor_user_id,
    v_order.source_channel,
    'print.requeued',
    'print_job',
    v_job.id,
    jsonb_build_object('orderId', v_order.id, 'reason', trim(p_reason), 'stationCode', v_job.station_code, 'priority', v_job.priority)
  );

  insert into public.outbox_events (event_key, event_type, aggregate_type, aggregate_id, payload)
  values (
    format('PrintJobCreated:%s', v_job.id),
    'PrintJobCreated',
    'print_job',
    v_job.id,
    jsonb_build_object('printJobId', v_job.id, 'orderId', v_order.id, 'stationCode', v_job.station_code, 'priority', v_job.priority, 'reprint', true)
  );

  return query select v_job.id, v_job.status, v_job.priority, v_job.created_at;
end;
$$;

revoke all on function public.requeue_print_job(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.requeue_print_job(uuid, uuid, text, text) to service_role;
