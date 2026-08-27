-- Migração aditiva do núcleo de estoque. Não altera pedidos, pagamentos ou impressão.

do $$
begin
  create type public.inventory_unit as enum ('kg', 'g', 'L', 'mL', 'unidade');
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.inventory_movement_type as enum (
    'ENTRY',
    'INTERNAL_CONSUMPTION',
    'LOSS',
    'ADJUSTMENT'
  );
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name varchar(160) not null check (char_length(trim(name)) > 0),
  unit public.inventory_unit not null,
  minimum_stock numeric(14, 3) not null default 0 check (minimum_stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists inventory_items_active_name_unique
  on public.inventory_items (lower(name))
  where is_active;

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  movement_type public.inventory_movement_type not null,
  quantity_delta numeric(14, 3) not null check (quantity_delta <> 0),
  reason text,
  note text,
  idempotency_key uuid not null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists inventory_movements_idempotency_unique
  on public.inventory_movements (idempotency_key);

create index if not exists inventory_movements_item_created_at_idx
  on public.inventory_movements (inventory_item_id, created_at desc);

create or replace view public.inventory_item_balances
with (security_invoker = true)
as
select
  item.id as item_id,
  item.name,
  item.unit,
  item.minimum_stock,
  item.is_active,
  coalesce(sum(movement.quantity_delta), 0)::numeric(14, 3) as balance_quantity
from public.inventory_items item
left join public.inventory_movements movement on movement.inventory_item_id = item.id
group by item.id, item.name, item.unit, item.minimum_stock, item.is_active;

alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;

create policy "operadores leem insumos" on public.inventory_items
for select to authenticated using (private.is_operator());

create policy "operadores leem movimentos de estoque" on public.inventory_movements
for select to authenticated using (private.is_operator());

create or replace function public.create_inventory_item(
  p_name text,
  p_unit public.inventory_unit,
  p_minimum_stock numeric,
  p_actor_user_id uuid
)
returns table(id uuid, name varchar, unit public.inventory_unit, minimum_stock numeric, is_active boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inventory_items%rowtype;
begin
  if not exists (select 1 from public.profiles where profiles.id = p_actor_user_id and profiles.role = 'admin') then
    raise exception 'Acesso restrito à administração.';
  end if;

  if char_length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Informe o nome do insumo.';
  end if;

  if p_minimum_stock < 0 then
    raise exception 'O estoque mínimo não pode ser negativo.';
  end if;

  insert into public.inventory_items (name, unit, minimum_stock)
  values (trim(p_name), p_unit, p_minimum_stock)
  returning * into v_item;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    p_actor_user_id,
    'inventory_item_created',
    'inventory_item',
    v_item.id,
    jsonb_build_object('name', v_item.name, 'unit', v_item.unit, 'minimum_stock', v_item.minimum_stock)
  );

  return query select v_item.id, v_item.name, v_item.unit, v_item.minimum_stock, v_item.is_active;
end;
$$;

create or replace function public.update_inventory_item(
  p_item_id uuid,
  p_name text,
  p_minimum_stock numeric,
  p_actor_user_id uuid
)
returns table(id uuid, name varchar, unit public.inventory_unit, minimum_stock numeric, is_active boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inventory_items%rowtype;
begin
  if not exists (select 1 from public.profiles where profiles.id = p_actor_user_id and profiles.role = 'admin') then
    raise exception 'Acesso restrito à administração.';
  end if;

  if char_length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Informe o nome do insumo.';
  end if;

  if p_minimum_stock < 0 then
    raise exception 'O estoque mínimo não pode ser negativo.';
  end if;

  update public.inventory_items
  set name = trim(p_name), minimum_stock = p_minimum_stock, updated_at = now()
  where id = p_item_id
  returning * into v_item;

  if not found then
    raise exception 'Insumo não encontrado.';
  end if;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    p_actor_user_id,
    'inventory_item_updated',
    'inventory_item',
    v_item.id,
    jsonb_build_object('name', v_item.name, 'minimum_stock', v_item.minimum_stock)
  );

  return query select v_item.id, v_item.name, v_item.unit, v_item.minimum_stock, v_item.is_active;
end;
$$;

create or replace function public.set_inventory_item_active(
  p_item_id uuid,
  p_is_active boolean,
  p_actor_user_id uuid
)
returns table(id uuid, is_active boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inventory_items%rowtype;
begin
  if not exists (select 1 from public.profiles where profiles.id = p_actor_user_id and profiles.role = 'admin') then
    raise exception 'Acesso restrito à administração.';
  end if;

  update public.inventory_items
  set is_active = p_is_active, updated_at = now()
  where id = p_item_id
  returning * into v_item;

  if not found then
    raise exception 'Insumo não encontrado.';
  end if;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    p_actor_user_id,
    'inventory_item_active_changed',
    'inventory_item',
    v_item.id,
    jsonb_build_object('is_active', v_item.is_active)
  );

  return query select v_item.id, v_item.is_active;
end;
$$;

create or replace function public.create_inventory_movement(
  p_inventory_item_id uuid,
  p_movement_type public.inventory_movement_type,
  p_quantity_delta numeric,
  p_reason text,
  p_note text,
  p_idempotency_key uuid,
  p_actor_user_id uuid
)
returns table(movement_id uuid, inventory_item_id uuid, quantity_delta numeric, balance_after numeric, reused boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inventory_items%rowtype;
  v_movement public.inventory_movements%rowtype;
  v_actor_role public.app_role;
  v_current_balance numeric(14, 3);
  v_balance_after numeric(14, 3);
begin
  select role into v_actor_role from public.profiles where id = p_actor_user_id;
  if v_actor_role is null or v_actor_role = 'customer' then
    raise exception 'Acesso restrito à equipe.';
  end if;

  if p_movement_type in ('LOSS', 'ADJUSTMENT') and v_actor_role <> 'admin' then
    raise exception 'Acesso restrito à administração.';
  end if;

  if p_quantity_delta is null or p_quantity_delta = 0 then
    raise exception 'Informe uma quantidade diferente de zero.';
  end if;

  if p_movement_type = 'ENTRY' and p_quantity_delta < 0 then
    raise exception 'Entrada deve aumentar o saldo.';
  end if;

  if p_movement_type in ('INTERNAL_CONSUMPTION', 'LOSS') and p_quantity_delta > 0 then
    raise exception 'Consumo e perda devem reduzir o saldo.';
  end if;

  if p_movement_type in ('LOSS', 'ADJUSTMENT') and char_length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Informe o motivo da perda ou do ajuste.';
  end if;

  select * into v_movement
  from public.inventory_movements
  where idempotency_key = p_idempotency_key;

  if found then
    select coalesce(sum(quantity_delta), 0)::numeric(14, 3) into v_balance_after
    from public.inventory_movements
    where inventory_item_id = v_movement.inventory_item_id;

    return query select v_movement.id, v_movement.inventory_item_id, v_movement.quantity_delta, v_balance_after, true;
    return;
  end if;

  select * into v_item
  from public.inventory_items
  where id = p_inventory_item_id
  for update;

  if not found or not v_item.is_active then
    raise exception 'Insumo não encontrado ou inativo.';
  end if;

  select coalesce(sum(quantity_delta), 0)::numeric(14, 3) into v_current_balance
  from public.inventory_movements
  where inventory_item_id = p_inventory_item_id;

  v_balance_after := v_current_balance + p_quantity_delta;
  if v_balance_after < 0 then
    raise exception 'A movimentação deixaria o estoque negativo.';
  end if;

  insert into public.inventory_movements (
    inventory_item_id,
    movement_type,
    quantity_delta,
    reason,
    note,
    idempotency_key,
    actor_user_id
  ) values (
    p_inventory_item_id,
    p_movement_type,
    p_quantity_delta,
    nullif(trim(coalesce(p_reason, '')), ''),
    nullif(trim(coalesce(p_note, '')), ''),
    p_idempotency_key,
    p_actor_user_id
  )
  returning * into v_movement;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    p_actor_user_id,
    'inventory_movement_created',
    'inventory_movement',
    v_movement.id,
    jsonb_build_object(
      'inventory_item_id', v_movement.inventory_item_id,
      'movement_type', v_movement.movement_type,
      'quantity_delta', v_movement.quantity_delta,
      'balance_after', v_balance_after,
      'reason', v_movement.reason
    )
  );

  return query select v_movement.id, v_movement.inventory_item_id, v_movement.quantity_delta, v_balance_after, false;
end;
$$;

revoke all on function public.create_inventory_item(text, public.inventory_unit, numeric, uuid) from public, anon, authenticated;
revoke all on function public.update_inventory_item(uuid, text, numeric, uuid) from public, anon, authenticated;
revoke all on function public.set_inventory_item_active(uuid, boolean, uuid) from public, anon, authenticated;
revoke all on function public.create_inventory_movement(uuid, public.inventory_movement_type, numeric, text, text, uuid, uuid) from public, anon, authenticated;
