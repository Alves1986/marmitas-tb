# Núcleo Unificado de Pedidos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evoluir a estrutura atual de pedidos para uma fonte operacional única, auditável e idempotente para aplicativo próprio e totem, preparada para PDV e iFood, com uma fila de impressão cuja prioridade máxima é o balcão.

**Architecture:** A migração será aditiva: os pedidos existentes permanecem nas mesmas tabelas e recebem origem `OWN_APP`. Uma função transacional no Postgres recebe itens já validados pelo servidor, aplica a chave de idempotência e grava pedido, itens, evento, auditoria e outbox como uma unidade. Adaptadores finos do aplicativo e do totem chamam o mesmo serviço; a impressão usa `print_jobs` ordenados por `priority DESC, created_at ASC`, com prioridade máxima exclusiva para `COUNTER`.

**Tech Stack:** React 19, TypeScript, Vite PWA, Vercel Functions, Supabase Postgres, Supabase Auth, Zod e Vitest.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/20260826100000_unified_order_core.sql` | Esquema aditivo, retropreenchimento, função transacional de criação, eventos, auditoria, outbox e restrições de deduplicação. |
| `server/vercel/_lib/unifiedOrders.ts` | Tipos internos, normalização, cálculo de prioridade e invocação da função transacional. |
| `server/vercel/_lib/unifiedOrders.test.ts` | Regras puras de origem, idempotência e prioridade. |
| `server/vercel/_lib/ordersRepository.ts` | Adaptador do aplicativo próprio que valida o catálogo e delega a persistência ao núcleo. |
| `api/public/orders.ts` | Contrato público com chave de idempotência; o canal é fixado em `OWN_APP` no servidor. |
| `api/public/orders.test.ts` | Contratos HTTP do aplicativo próprio: chave obrigatória, reenvio seguro e projeção pública. |
| `api/internal/kiosk-orders.ts` | Endpoint interno para o totem demonstrativo, com canal `KIOSK`, chave por atendimento e pagamento explicitamente simulado. |
| `client/src/lib/totemOrder.ts` | Gera e preserva a chave idempotente por atendimento do totem. |
| `client/src/pages/Totem.tsx` | Submete a confirmação demonstrativa ao adaptador `KIOSK`, preservando os estados de rede e o recibo. |
| `server/db.ts` e `server/routers.ts` | Fila operacional e reimpressão com prioridade, estação e auditoria no ambiente local de desenvolvimento. |
| `server/printJobs.test.ts` e `server/printJobs.integration.test.ts` | Regressões de ordenação, deduplicação, permissão e reimpressão. |
| `docs/operacao/nucleo-unificado-pedidos.md` | Orientação operacional dos canais, prioridade e recuperação. |

### Task 1: Criar a migração aditiva e o modelo transacional

**Files:**
- Create: `supabase/migrations/20260826100000_unified_order_core.sql`
- Test: `scripts/unifiedOrderMigration.test.ts`

- [ ] **Step 1: Escrever o teste que falha para a estrutura esperada**

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const sql = readFileSync("supabase/migrations/20260826100000_unified_order_core.sql", "utf8");

describe("migração do núcleo unificado", () => {
  it("preserva pedidos existentes e adiciona origem, idempotência, auditoria, outbox e prioridade", () => {
    expect(sql).toContain("add column if not exists source_channel");
    expect(sql).toContain("update public.orders set source_channel = 'OWN_APP'");
    expect(sql).toContain("create table if not exists public.audit_logs");
    expect(sql).toContain("create table if not exists public.outbox_events");
    expect(sql).toContain("add column if not exists priority integer not null default 50");
    expect(sql).toContain("create or replace function public.create_unified_order");
  });
});
```

- [ ] **Step 2: Executar o teste e verificar a falha**

Run: `pnpm vitest run scripts/unifiedOrderMigration.test.ts`  
Expected: FAIL porque a migração ainda não existe.

- [ ] **Step 3: Criar a migração compatível**

```sql
create type public.order_source_channel as enum (
  'OWN_APP', 'KIOSK', 'COUNTER', 'IFOOD', 'PHONE', 'WHATSAPP', 'INTERNAL'
);

alter table public.orders
  add column if not exists source_channel public.order_source_channel,
  add column if not exists external_provider text,
  add column if not exists external_order_id text,
  add column if not exists idempotency_key uuid;

update public.orders
set source_channel = 'OWN_APP'
where source_channel is null;

alter table public.orders
  alter column source_channel set not null;

create unique index if not exists orders_source_idempotency_unique
  on public.orders (source_channel, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists orders_external_provider_id_unique
  on public.orders (external_provider, external_order_id)
  where external_provider is not null and external_order_id is not null;

alter table public.print_jobs
  add column if not exists station_code text not null default 'COZINHA',
  add column if not exists document_type text not null default 'ORDER',
  add column if not exists priority integer not null default 50,
  add column if not exists dedupe_key text,
  add column if not exists last_error text;

create unique index if not exists print_jobs_dedupe_key_unique
  on public.print_jobs (dedupe_key)
  where dedupe_key is not null;
```

Crie também `audit_logs`, `outbox_events`, `print_stations` e a função `public.create_unified_order(...)`. A função deve primeiro buscar `(source_channel, idempotency_key)`; se encontrar, retornar o pedido existente. Caso contrário, deve inserir pedido, itens, `order_events`, `audit_logs` e `outbox_events`. Para status inicial `confirmado`, deve criar `print_jobs` com `priority = 100` somente quando `source_channel = 'COUNTER'`; todos os demais recebem `50`. O trabalho deverá usar chave `order:<uuid>:station:<code>:document:ORDER`.

- [ ] **Step 4: Executar o teste e verificar a aprovação**

Run: `pnpm vitest run scripts/unifiedOrderMigration.test.ts`  
Expected: PASS.

- [ ] **Step 5: Revisar o SQL antes da aplicação**

Run: `sed -n '1,260p' supabase/migrations/20260826100000_unified_order_core.sql`  
Expected: nenhuma remoção de tabela, nenhum `drop`, nenhum dado financeiro apagado e nenhum segredo no arquivo.

### Task 2: Implementar o serviço interno e suas regras puras

**Files:**
- Create: `server/vercel/_lib/unifiedOrders.ts`
- Create: `server/vercel/_lib/unifiedOrders.test.ts`
- Modify: `server/vercel/_lib/ordersRepository.ts`

- [ ] **Step 1: Escrever os testes que falham para origem, idempotência e prioridade**

```ts
import { describe, expect, it } from "vitest";
import { getPrintPriority, normalizeOrderSource, toUnifiedOrderPayload } from "./unifiedOrders";

describe("núcleo unificado", () => {
  it("aceita somente fontes conhecidas", () => {
    expect(normalizeOrderSource("KIOSK")).toBe("KIOSK");
    expect(() => normalizeOrderSource("UNKNOWN")).toThrow("Canal de origem inválido.");
  });

  it("atribui prioridade máxima ao balcão e preserva a prioridade padrão dos demais canais", () => {
    expect(getPrintPriority("COUNTER")).toBe(100);
    expect(getPrintPriority("KIOSK")).toBe(50);
    expect(getPrintPriority("OWN_APP")).toBe(50);
  });

  it("inclui a chave idempotente e não permite fonte administrativa por entrada pública", () => {
    expect(() => toUnifiedOrderPayload({ sourceChannel: "INTERNAL", isPublic: true } as never)).toThrow("Canal não permitido.");
  });
});
```

- [ ] **Step 2: Executar os testes e verificar a falha**

Run: `pnpm vitest run server/vercel/_lib/unifiedOrders.test.ts`  
Expected: FAIL porque o módulo ainda não existe.

- [ ] **Step 3: Criar o serviço de domínio**

```ts
export const ORDER_SOURCES = ["OWN_APP", "KIOSK", "COUNTER", "IFOOD", "PHONE", "WHATSAPP", "INTERNAL"] as const;
export type OrderSourceChannel = (typeof ORDER_SOURCES)[number];

export function normalizeOrderSource(value: string): OrderSourceChannel {
  if (!ORDER_SOURCES.includes(value as OrderSourceChannel)) throw new Error("Canal de origem inválido.");
  return value as OrderSourceChannel;
}

export function getPrintPriority(sourceChannel: OrderSourceChannel): number {
  return sourceChannel === "COUNTER" ? 100 : 50;
}
```

Defina `UnifiedOrderPayload` com chave UUID, dados congelados de itens, metadados externos opcionais e status inicial. Implemente `createUnifiedOrder(client, payload)` por `client.rpc("create_unified_order", ...)`, retornando a confirmação persistida. O repositório atual continuará fazendo a validação de produto/opções e passará seus itens congelados para esse serviço; ele não poderá realizar inserções diretas em `orders`, `order_items` ou `order_events`.

- [ ] **Step 4: Executar o teste e verificar a aprovação**

Run: `pnpm vitest run server/vercel/_lib/unifiedOrders.test.ts`  
Expected: PASS.

### Task 3: Adaptar o contrato do aplicativo próprio sem expor canais internos

**Files:**
- Modify: `api/public/orders.ts`
- Modify: `server/vercel/_lib/ordersRepository.ts`
- Create: `api/public/orders.test.ts`
- Modify: `client/src/lib/orderApi.ts`
- Modify: `client/src/pages/Checkout.tsx`

- [ ] **Step 1: Escrever testes HTTP que falham**

```ts
it("exige chave idempotente UUID e fixa OWN_APP no endpoint público", async () => {
  const response = await handler(new Request("https://example.test/api/public/orders", {
    method: "POST",
    body: JSON.stringify({ ...validInput, idempotencyKey: "invalid" }),
  }));
  expect(response.status).toBe(400);
});

it("não aceita sourceChannel informado pelo navegador", async () => {
  const response = await handler(new Request("https://example.test/api/public/orders", {
    method: "POST",
    body: JSON.stringify({ ...validInput, idempotencyKey: crypto.randomUUID(), sourceChannel: "COUNTER" }),
  }));
  expect(response.status).toBe(201);
  expect(repository.createOrder).toHaveBeenCalledWith(expect.objectContaining({ sourceChannel: "OWN_APP" }));
});
```

- [ ] **Step 2: Executar os testes e verificar a falha**

Run: `pnpm vitest run api/public/orders.test.ts`  
Expected: FAIL porque `idempotencyKey` e a fixação de origem ainda não existem.

- [ ] **Step 3: Implementar a adaptação mínima**

```ts
idempotencyKey: z.string().uuid(),
```

No manipulador, descarte qualquer campo `sourceChannel` recebido e chame o repositório com `sourceChannel: "OWN_APP"`. No checkout, gere a chave com `crypto.randomUUID()` quando o pedido entra no estado de envio e mantenha-a até receber confirmação ou erro terminal; um retry de rede reutiliza a mesma chave. Não armazene dados de pagamento sensíveis no navegador.

- [ ] **Step 4: Executar os testes e verificar a aprovação**

Run: `pnpm vitest run api/public/orders.test.ts`  
Expected: PASS.

### Task 4: Conectar o totem ao mesmo núcleo em modo demonstrativo

**Files:**
- Create: `api/internal/kiosk-orders.ts`
- Create: `api/internal/kiosk-orders.test.ts`
- Create: `client/src/lib/totemOrder.ts`
- Create: `client/src/lib/totemOrder.test.ts`
- Modify: `client/src/pages/Totem.tsx`
- Modify: `client/src/lib/totem.ts`

- [ ] **Step 1: Escrever testes que falham para o comando KIOSK**

```ts
it("usa a mesma chave para repetição do mesmo atendimento e grava a origem KIOSK", async () => {
  const key = createKioskIdempotencyKey("session-1");
  expect(createKioskIdempotencyKey("session-1")).toBe(key);
  await submitKioskOrder({ idempotencyKey: key, items: kioskItems });
  expect(createUnifiedOrder).toHaveBeenCalledWith(expect.objectContaining({ sourceChannel: "KIOSK", idempotencyKey: key }));
});

it("não marca o pagamento como real", async () => {
  const response = await handler(kioskRequest);
  expect(await response.json()).toMatchObject({ isTestPayment: true, paymentStatus: "confirmed" });
});
```

- [ ] **Step 2: Executar os testes e verificar a falha**

Run: `pnpm vitest run api/internal/kiosk-orders.test.ts client/src/lib/totemOrder.test.ts`  
Expected: FAIL porque o adaptador KIOSK não existe.

- [ ] **Step 3: Implementar o adaptador sem cobrança real**

O endpoint interno deverá validar uma lista reduzida de itens e aceitar apenas `paymentMethod` demonstrativo. Ele chamará `createUnifiedOrder` com `sourceChannel: "KIOSK"`, status `confirmado`, `paymentProvider: "asaas_test"` e `isTestPayment: true`. O cliente gerará a chave no início de cada atendimento e só a limpará depois de receber confirmação persistida ou por reinício manual/inatividade. A tela deverá manter recibo, tag diária, 90 segundos e nenhuma coleta de dados de cartão.

- [ ] **Step 4: Executar os testes e verificar a aprovação**

Run: `pnpm vitest run api/internal/kiosk-orders.test.ts client/src/lib/totemOrder.test.ts client/src/pages/Totem.test.tsx`  
Expected: PASS.

### Task 5: Unificar a fila de impressão e priorizar balcão

**Files:**
- Modify: `server/db.ts`
- Modify: `server/routers.ts`
- Modify: `server/printJobs.test.ts`
- Modify: `server/printJobs.integration.test.ts`
- Create: `server/printQueuePriority.test.ts`

- [ ] **Step 1: Escrever testes de ordenação e autorização que falham**

```ts
it("seleciona primeiro o trabalho do balcão e preserva data entre trabalhos da mesma prioridade", () => {
  expect(sortQueuedPrintJobs([
    { id: 1, priority: 50, createdAt: new Date("2026-08-26T10:00:00Z") },
    { id: 2, priority: 100, createdAt: new Date("2026-08-26T10:02:00Z") },
    { id: 3, priority: 50, createdAt: new Date("2026-08-26T10:01:00Z") },
  ]).map((job) => job.id)).toEqual([2, 1, 3]);
});

it("registra ator e razão na reimpressão", async () => {
  await caller.operations.queuePrint({ orderId: 31, reason: "Comanda ilegível" });
  expect(dbMocks.queueManualPrintJob).toHaveBeenCalledWith({ orderId: 31, actorUserId: 9, reason: "Comanda ilegível" });
});
```

- [ ] **Step 2: Executar os testes e verificar a falha**

Run: `pnpm vitest run server/printQueuePriority.test.ts server/printJobs.integration.test.ts`  
Expected: FAIL porque a fila atual não possui prioridade ou razão auditável.

- [ ] **Step 3: Implementar leitura e criação idempotente da fila**

Ordene consultas por `priority DESC, created_at ASC`. Ao criar trabalho automático, calcule a prioridade por `source_channel`: `COUNTER` recebe `100`; todos os outros canais, `50`. Garanta que o índice único de `dedupe_key` faça reenvios retornarem o trabalho existente. A reimpressão será manual, não reutilizará a chave de documento original e gravará `event_type = 'print_reprint_requested'` em `order_events` mais linha em `audit_logs`.

- [ ] **Step 4: Executar os testes e verificar a aprovação**

Run: `pnpm vitest run server/printQueuePriority.test.ts server/printJobs.test.ts server/printJobs.integration.test.ts`  
Expected: PASS.

### Task 6: Aplicar migração autorizada e validar contrato completo

**Files:**
- Modify: `docs/operacao/nucleo-unificado-pedidos.md`
- Modify: `todo.md`

- [ ] **Step 1: Revisar a migração final e aplicar uma única alteração de esquema**

Run: `pnpm vitest run scripts/unifiedOrderMigration.test.ts && pnpm check`  
Expected: PASS antes da aplicação.

Aplicar a migração inteira em uma única execução, na ordem declarada, usando o mecanismo de banco autorizado. Não executar `drop`, não alterar dados existentes fora do preenchimento de `source_channel`, não criar dados de demonstração e não alterar segredos.

- [ ] **Step 2: Verificar o esquema e as restrições após aplicação**

Execute uma consulta somente leitura que confirme os campos novos em `orders`, os índices de idempotência, a existência de `audit_logs`, `outbox_events`, `print_stations` e as colunas de prioridade em `print_jobs`. Use `LIMIT 20` e selecione apenas nomes e metadados necessários.

- [ ] **Step 3: Executar a validação completa**

Run:

```bash
pnpm test && pnpm check && pnpm build && pnpm build:vercel-runtime && git diff --check
```

Expected: todos os testes aprovados, TypeScript sem erro, build PWA e runtime Vercel concluídos e diff sem espaços inválidos.

- [ ] **Step 4: Revisar os fluxos em tela**

Verificar desktop e viewport vertical: checkout público com retry seguro; confirmação do totem com tag e mensagem de teste; operação com fila ordenada; admin sem exposição de auditoria a cliente. Conferir também o console de navegador e os logs recentes do servidor.

- [ ] **Step 5: Atualizar a operação e salvar checkpoint**

Documentar como reconhecer a origem, como reimprimir com razão, como interpretar prioridade e como recuperar trabalho pendente. Marcar os itens concluídos em `todo.md`, revisar o backlog inteiro e salvar um checkpoint antes de qualquer envio ao GitHub ou publicação.
