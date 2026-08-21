# Totem de Pedidos Rápidos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a rota pública vertical `/totem` para pedidos presenciais de retirada, com identidade Marmitas TB, pagamentos demonstrativos seguros, tag diária e recibo de retirada.

**Architecture:** A rota reutiliza o cardápio público e introduz um contrato específico de pedido presencial, em vez de relaxar as exigências de telefone do checkout web atual. Um adaptador isolado de pagamento demonstra PIX e cartão sem fazer I/O financeiro; o servidor confirma o pedido somente quando recebe um resultado demonstrativo autorizado. A origem e o tipo de pagamento são persistidos para que a fila diferencie o totem e o financeiro não trate demonstrações como receita.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, Vitest, Vercel Functions TypeScript, Supabase Postgres e Supabase Auth para controles internos.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/20260821100000_totem_orders.sql` | Campos de origem/identificação do totem, restrições, índice de tag diária e política de não contabilização. **Não aplicar sem autorização específica.** |
| `shared/totem.ts` | Tipos puros do totem, estados de pagamento demonstrativo, etapas, tag e contratos de criação. |
| `server/vercel/_lib/totemPayments.ts` | Adaptador determinístico de PIX/cartão demonstrativos, sem chamadas externas. |
| `server/vercel/_lib/totemOrdersRepository.ts` | Validação de catálogo, cálculo, tag diária, criação atômica de pedido/eventos e consulta de confirmação. |
| `api/public/totem.ts` | Contrato HTTP público para catálogo, criação e confirmação do pedido do totem. |
| `api/admin/totem.ts` | Controles autenticados de cenário demonstrativo e consulta de pedidos do totem. |
| `client/src/lib/totem.ts` | Estado puro do fluxo, expiração por inatividade, formatação de tag e montagem do payload. |
| `client/src/pages/Totem.tsx` | Orquestrador da jornada vertical e estado de confirmação. |
| `client/src/components/totem/*` | Cabeçalho de marca, categorias, produto, etapas opcionais, revisão, pagamento, recibo e diálogo de expiração. |
| `client/src/pages/Totem*.test.tsx` e `server/vercel/_lib/totem*.test.ts` | Cobertura de rota, jornada, inatividade, pagamento seguro, tag e regressões. |
| `client/src/App.tsx` | Registro público de `/totem`. |
| `client/src/index.css` | Estilos de impressão e utilitários de orientação vertical do recibo. |

### Task 1: Criar contratos puros do totem

**Files:**
- Create: `shared/totem.ts`
- Create: `shared/totem.test.ts`

- [ ] **Step 1: Escrever os testes de tipos e tag diária.**

```ts
import { describe, expect, it } from "vitest";
import { createTotemTag, normalizeTotemDisplayName } from "./totem";

describe("createTotemTag", () => {
  it("cria uma tag diária com três dígitos", () => {
    expect(createTotemTag(1)).toBe("MTB-001");
    expect(createTotemTag(27)).toBe("MTB-027");
  });
});

describe("normalizeTotemDisplayName", () => {
  it("guarda somente o primeiro nome em caixa alta", () => {
    expect(normalizeTotemDisplayName(" Anderson  Alves ")).toBe("ANDERSON");
  });
});
```

- [ ] **Step 2: Executar a regressão e confirmar falha.**

Run: `pnpm vitest run shared/totem.test.ts`  
Expected: FAIL com módulo ou export inexistente.

- [ ] **Step 3: Implementar os contratos mínimos.**

```ts
export type TotemPaymentMethod = "pix_demo" | "card_demo";
export type TotemPaymentScenario = "approved" | "declined" | "pending";

export type CreateTotemOrderInput = {
  displayName?: string;
  items: Array<{ productId: string; quantity: number; optionIds: string[]; note: string }>;
  paymentMethod: TotemPaymentMethod;
  paymentScenario: TotemPaymentScenario;
};

export function createTotemTag(sequence: number): string {
  return `MTB-${String(sequence).padStart(3, "0")}`;
}

export function normalizeTotemDisplayName(value: string): string {
  return value.trim().split(/\s+/)[0]?.toLocaleUpperCase("pt-BR") ?? "";
}
```

- [ ] **Step 4: Executar o teste e confirmar aprovação.**

Run: `pnpm vitest run shared/totem.test.ts`  
Expected: PASS.

- [ ] **Step 5: Registrar commit local.**

```bash
git add shared/totem.ts shared/totem.test.ts
git commit -m "feat: adiciona contratos do totem"
```

### Task 2: Modelar o armazenamento do pedido presencial

**Files:**
- Create: `supabase/migrations/20260821100000_totem_orders.sql`
- Test: `server/vercel/_lib/totemOrdersRepository.test.ts`

- [ ] **Step 1: Escrever teste de repositório para origem, pagamento demonstrativo e tag.**

```ts
it("persiste pedido de totem confirmado sem marcar receita real", async () => {
  const result = await repository.createTotemOrder(approvedInput);
  expect(result.paymentStatus).toBe("confirmed");
  expect(result.paymentProvider).toBe("totem_demo");
  expect(result.tag).toBe("MTB-001 · ANDERSON");
});
```

- [ ] **Step 2: Executar o teste e confirmar falha.**

Run: `pnpm vitest run server/vercel/_lib/totemOrdersRepository.test.ts`  
Expected: FAIL porque o repositório ainda não existe.

- [ ] **Step 3: Criar a migração sem aplicá-la.**

```sql
alter table public.orders
  add column if not exists order_origin text not null default 'web',
  add column if not exists pickup_tag text,
  add column if not exists payment_demo boolean not null default false;

alter table public.orders
  add constraint orders_order_origin_check
  check (order_origin in ('web', 'totem'));

create unique index if not exists orders_totem_pickup_tag_daily_idx
  on public.orders (pickup_tag, ((created_at at time zone 'America/Sao_Paulo')::date))
  where order_origin = 'totem' and pickup_tag is not null;
```

Do **not** execute SQL in this task. Primeiro solicitar autorização explícita do responsável para aplicar a migração e somente então usar o fluxo Supabase aprovado pelo projeto.

- [ ] **Step 4: Implementar `createTotemOrder` com uma única transação de pedido, itens e evento.**

```ts
export async function createTotemOrder(input: CreateTotemOrderInput) {
  const payment = resolveTotemDemoPayment(input.paymentMethod, input.paymentScenario);
  if (payment.status !== "approved") return { payment, confirmation: null };
  // Validar produtos/opções ativos, calcular total em centavos e inserir pedido com:
  // fulfillment_method: "pickup", order_origin: "totem", payment_demo: true,
  // payment_provider: "totem_demo", payment_status: "confirmed", status: "confirmado".
}
```

- [ ] **Step 5: Executar testes e registrar commit local.**

Run: `pnpm vitest run server/vercel/_lib/totemOrdersRepository.test.ts`  
Expected: PASS após a migração ser autorizada e aplicada em ambiente de desenvolvimento.

```bash
git add supabase/migrations/20260821100000_totem_orders.sql server/vercel/_lib/totemOrdersRepository.ts server/vercel/_lib/totemOrdersRepository.test.ts
git commit -m "feat: persiste pedidos de totem"
```

### Task 3: Isolar o pagamento demonstrativo e criar o endpoint público

**Files:**
- Create: `server/vercel/_lib/totemPayments.ts`
- Create: `server/vercel/_lib/totemPayments.test.ts`
- Create: `api/public/totem.ts`
- Create: `api/public/totem.test.ts`

- [ ] **Step 1: Escrever testes para cada cenário de pagamento.**

```ts
it.each([
  ["pix_demo", "approved", "approved"],
  ["card_demo", "declined", "declined"],
  ["card_demo", "pending", "pending"],
])("resolve %s/%s como %s", (method, scenario, expected) => {
  expect(resolveTotemDemoPayment(method as TotemPaymentMethod, scenario as TotemPaymentScenario).status).toBe(expected);
});
```

- [ ] **Step 2: Confirmar falha e implementar adaptador sem rede.**

```ts
export function resolveTotemDemoPayment(
  method: TotemPaymentMethod,
  scenario: TotemPaymentScenario,
) {
  return { method, status: scenario, provider: "totem_demo" as const, isDemo: true };
}
```

- [ ] **Step 3: Implementar validação HTTP e rotas.**

```ts
export const createTotemOrderInput = z.object({
  displayName: z.string().trim().max(40).optional(),
  paymentMethod: z.enum(["pix_demo", "card_demo"]),
  paymentScenario: z.enum(["approved", "declined", "pending"]).default("approved"),
  items: z.array(totemItemInput).min(1).max(30),
});
```

`GET /api/public/totem` devolve catálogo ativo; `POST /api/public/totem` cria somente um pedido demonstrativo aprovado. Cenários pendente/recusado devolvem estado de pagamento sem gravar pedido. O endpoint nunca aceita `payment_provider` ou valores monetários vindos do navegador.

- [ ] **Step 4: Executar os testes de unidade e de handler.**

Run: `pnpm vitest run server/vercel/_lib/totemPayments.test.ts api/public/totem.test.ts`  
Expected: PASS, incluindo rejeição de payload que tenta declarar pagamento real.

- [ ] **Step 5: Registrar commit local.**

```bash
git add server/vercel/_lib/totemPayments.ts server/vercel/_lib/totemPayments.test.ts api/public/totem.ts api/public/totem.test.ts
git commit -m "feat: adiciona pagamentos demonstrativos do totem"
```

### Task 4: Construir o estado puro de jornada e inatividade

**Files:**
- Create: `client/src/lib/totem.ts`
- Create: `client/src/lib/totem.test.ts`

- [ ] **Step 1: Escrever testes para transição, limpeza e payload.**

```ts
it("limpa nome, itens e etapa após expiração", () => {
  expect(expireTotemSession(activeState)).toEqual(createInitialTotemState());
});

it("monta payload sem telefone e com retirada", () => {
  expect(createTotemPayload(activeState, "card_demo")).toMatchObject({
    paymentMethod: "card_demo",
    displayName: "ANDERSON",
  });
});
```

- [ ] **Step 2: Executar para confirmar falha e implementar funções puras.**

```ts
export const TOTEM_IDLE_TIMEOUT_MS = 90_000;
export function createInitialTotemState(): TotemState { /* etapa categories, carrinho vazio e nome vazio */ }
export function expireTotemSession(): TotemState { return createInitialTotemState(); }
export function createTotemPayload(state: TotemState, paymentMethod: TotemPaymentMethod): CreateTotemOrderInput { /* sem telefone */ }
```

- [ ] **Step 3: Executar os testes e registrar commit local.**

Run: `pnpm vitest run client/src/lib/totem.test.ts`  
Expected: PASS.

### Task 5: Implementar a rota visual vertical e o recibo

**Files:**
- Create: `client/src/pages/Totem.tsx`
- Create: `client/src/pages/Totem.test.tsx`
- Create: `client/src/components/totem/TotemBrandHeader.tsx`
- Create: `client/src/components/totem/TotemCatalogStep.tsx`
- Create: `client/src/components/totem/TotemOptionalStep.tsx`
- Create: `client/src/components/totem/TotemReviewStep.tsx`
- Create: `client/src/components/totem/TotemPaymentStep.tsx`
- Create: `client/src/components/totem/TotemReceipt.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/index.css`

- [ ] **Step 1: Escrever teste de rota e cabeçalho de marca.**

```tsx
it("exibe a marca e inicia pela escolha de categoria", () => {
  render(<Totem />);
  expect(screen.getByRole("img", { name: /Marmitas TB/i })).toBeVisible();
  expect(screen.getByRole("heading", { name: /o que vai querer/i })).toBeVisible();
});
```

- [ ] **Step 2: Escrever teste de jornada até confirmação.**

```tsx
it("confirma cartão demonstrativo e exibe a tag de retirada", async () => {
  render(<Totem />);
  await user.click(screen.getByRole("button", { name: /marmitas/i }));
  await user.click(screen.getByRole("button", { name: /marmita tradicional/i }));
  await user.click(screen.getByRole("button", { name: /continuar/i }));
  await user.click(screen.getByRole("button", { name: /cartão/i }));
  expect(await screen.findByText(/MTB-001/i)).toBeVisible();
});
```

- [ ] **Step 3: Confirmar falha, implementar componentes e registrar `/totem`.**

```tsx
<Route path="/totem" component={Totem} />
```

O componente `TotemBrandHeader` deve usar o mesmo ativo configurado por `VITE_APP_LOGO` e conter `alt="Marmitas TB"`. `TotemReceipt` deve chamar `window.print()` apenas após confirmação explícita do cliente em “Imprimir recibo”; a confirmação permanece legível se a impressão falhar ou for cancelada.

- [ ] **Step 4: Adicionar impressão e modo vertical.**

```css
@media print {
  body > *:not(#totem-receipt) { display: none !important; }
  #totem-receipt { display: block; width: 80mm; }
}

@media (min-aspect-ratio: 1/1) and (max-width: 1024px) {
  .totem-shell { max-width: 30rem; min-height: 100dvh; }
}
```

- [ ] **Step 5: Executar testes e registrar commit local.**

Run: `pnpm vitest run client/src/pages/Totem.test.tsx`  
Expected: PASS, incluindo nome opcional, navegação reversível e impressão acionável.

### Task 6: Adicionar controles internos de cenário demonstrativo

**Files:**
- Create: `api/admin/totem.ts`
- Create: `api/admin/totem.test.ts`
- Create: `client/src/components/admin/TotemDemoControls.tsx`
- Create: `client/src/components/admin/TotemDemoControls.test.tsx`
- Modify: `client/src/pages/Admin.tsx`

- [ ] **Step 1: Escrever teste de autorização.**

```ts
it("rejeita controle de cenário sem papel interno", async () => {
  const response = await handler(customerRequest);
  expect(response.status).toBe(403);
});
```

- [ ] **Step 2: Implementar configuração restrita a `staff` e `admin`.**

O endpoint deve reutilizar os helpers de autorização de `api/admin/*`, aceitar somente `approved`, `declined` e `pending`, armazenar a escolha em configuração de loja/auditoria e nunca retornar o controle pela rota pública. O padrão público permanece `approved` caso não haja configuração válida.

- [ ] **Step 3: Exibir o controle apenas no módulo de configurações administrativas.**

```tsx
<TotemDemoControls defaultScenario={settings.totemDemoScenario ?? "approved"} />
```

- [ ] **Step 4: Executar testes e registrar commit local.**

Run: `pnpm vitest run api/admin/totem.test.ts client/src/components/admin/TotemDemoControls.test.tsx`  
Expected: PASS, incluindo ausência do controle no HTML público.

### Task 7: Validar regressões, acessibilidade e demonstração controlada

**Files:**
- Modify: `todo.md`
- Modify: `docs/operacao/homologacao-controlada-2026-08-20.md` ou Create: `docs/operacao/homologacao-totem-YYYY-MM-DD.md`

- [ ] **Step 1: Executar a suíte completa e checagens de build.**

Run:

```bash
pnpm test
pnpm check
pnpm build
pnpm build:vercel-runtime
git diff --check
```

Expected: todos os testes aprovados, TypeScript sem erros e builds de PWA/runtime concluídos.

- [ ] **Step 2: Verificar visualmente a rota em viewport vertical.**

Capturar `/totem` em `768×1024` e `412×915`. Verificar logo presente, botões de toque, progresso, contraste, retorno, expiração e recibo. Confirmar que `/admin` continua protegido e que `/totem` não mostra links internos.

- [ ] **Step 3: Executar uma demonstração sem escrita financeira.**

Criar **um único** pedido de demonstração apenas após autorização explícita para escrita operacional. Confirmar que `payment_demo=true`, `payment_status=confirmed`, `payment_provider=totem_demo`, origem `totem` e ausência de cobrança Asaas/registro de receita. Não imprimir automaticamente em impressora física.

- [ ] **Step 4: Atualizar documentação e checklist.**

Registrar hardware validado, navegador em modo quiosque, comportamento de impressão, resultado de pagamento de demonstração, tag emitida e o procedimento de reversão. Marcar no `todo.md` somente os itens efetivamente concluídos.

- [ ] **Step 5: Salvar checkpoint antes de propor publicação.**

Usar o checkpoint WebDev com descrição da rota, testes, migração aplicada ou pendente, evidências visuais e confirmação de que nenhuma cobrança real foi feita. Só solicitar envio à branch `main` após o responsável aprovar a demonstração.

## Revisão do plano

Cada item da especificação aprovada possui cobertura: a rota e a marca são tratadas na Task 5; fluxo guiado e inatividade, na Task 4; pagamentos demonstrativos, nas Tasks 2 e 3; tag e recibo, nas Tasks 1, 2 e 5; controles internos, na Task 6; e validação completa sem cobrança real, na Task 7. A migração é escrita, mas explicitamente não é aplicada sem autorização, preservando a restrição operacional existente.
