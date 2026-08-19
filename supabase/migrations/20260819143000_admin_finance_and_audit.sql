-- Gestão financeira e auditoria administrativa da Marmitas TB.
-- Não importa nem altera registros históricos existentes.

create type public.expense_entry_status as enum ('draft', 'approved', 'rejected');

create table public.expense_entries (
  id uuid primary key default gen_random_uuid(),
  description varchar(240) not null,
  category varchar(120) not null,
  amount_in_cents integer not null check (amount_in_cents > 0),
  incurred_on date not null,
  receipt_path text,
  notes text,
  status public.expense_entry_status not null default 'draft',
  submitted_by_user_id uuid not null references public.profiles(id) on delete restrict,
  approved_by_user_id uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'draft' and approved_by_user_id is null and approved_at is null and rejection_reason is null)
    or (status = 'approved' and approved_by_user_id is not null and approved_at is not null and rejection_reason is null)
    or (status = 'rejected' and approved_by_user_id is not null and approved_at is not null and length(trim(coalesce(rejection_reason, ''))) > 0)
  )
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  action varchar(120) not null,
  entity_type varchar(120) not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index expense_entries_status_incurred_on_idx on public.expense_entries(status, incurred_on desc);
create index expense_entries_submitted_by_created_at_idx on public.expense_entries(submitted_by_user_id, created_at desc);
create index admin_audit_logs_created_at_idx on public.admin_audit_logs(created_at desc);
create index admin_audit_logs_entity_idx on public.admin_audit_logs(entity_type, entity_id, created_at desc);

create trigger expense_entries_set_updated_at before update on public.expense_entries
for each row execute function public.set_updated_at();

alter table public.expense_entries enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy "equipe lê próprias despesas" on public.expense_entries
for select to authenticated
using (submitted_by_user_id = auth.uid() or private.is_admin());

create policy "equipe cria rascunhos de despesas" on public.expense_entries
for insert to authenticated
with check (
  private.is_operator()
  and submitted_by_user_id = auth.uid()
  and status = 'draft'
  and approved_by_user_id is null
  and approved_at is null
  and rejection_reason is null
);

create policy "equipe atualiza próprios rascunhos de despesas" on public.expense_entries
for update to authenticated
using (submitted_by_user_id = auth.uid() and status = 'draft')
with check (
  submitted_by_user_id = auth.uid()
  and status = 'draft'
  and approved_by_user_id is null
  and approved_at is null
  and rejection_reason is null
);

create policy "administradores gerenciam despesas" on public.expense_entries
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "administradores leem auditoria" on public.admin_audit_logs
for select to authenticated
using (private.is_admin());
