# Marmitas TB Operation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a vitrine Marmitas TB em uma operação persistente de pedidos, com painel administrativo e operacional, acompanhamento público, impressão de comandas e pagamento híbrido preparado para o Asaas.

**Architecture:** O pedido passará a ser criado via tRPC e gravado no banco como fonte de verdade. As telas públicas manterão carrinho local até a confirmação, quando chamarão um adaptador de pagamento de teste e criarão o pedido, os itens, o histórico e o trabalho de impressão. Os painéis serão protegidos por papéis no servidor; o adaptador Asaas será uma implementação futura da mesma interface de pagamento, sem credenciais nesta entrega.

**Tech Stack:** React 19, TypeScript, Wouter, Tailwind 4, shadcn/ui, tRPC 11, Express 4, Drizzle ORM, MySQL/TiDB, Vitest e Testing Library.

---

## Estrutura de arquivos

| Caminho | Responsabilidade |
|---|---|
| `drizzle/schema.ts` | Tabelas, enums e tipos inferidos para a operação. |
| `drizzle/migrations/0001_marmitas_operation.sql` | Migração revisada e aplicada no banco. |
| `shared/operations.ts` | Contratos de domínio compartilhados: status, pagamento, entrada de pedido e acompanhamento público. |
| `server/authorization.ts` | Procedimentos e guardas para administrador e equipe operacional. |
| `server/db/operations.ts` | Funções de banco para catálogo, pedidos, linha do tempo, equipe, pagamentos e impressão. |
| `server/services/paymentAdapter.ts` | Interface de cobrança e adaptador de teste. |
| `server/services/orderWorkflow.ts` | Criação idempotente de pedidos, mudanças de status, alertas e trabalhos de impressão. |
| `server/routers/catalog.ts` | Procedimentos públicos e administrativos de catálogo. |
| `server/routers/orders.ts` | Procedimentos de criação, consulta pública, fila e atualização operacional. |
| `server/routers/admin.ts` | Procedimentos de configuração e equipe para administrador. |
| `server/routers/payments.ts` | Procedimentos de pagamento de teste e ponto de extensão do Asaas. |
| `server/routers.ts` | Composição dos roteadores de domínio. |
| `client/src/pages/TrackOrder.tsx` | Acompanhamento público por código. |
| `client/src/pages/Operations.tsx` | Fila operacional, alertas, status e comandos de impressão. |
| `client/src/pages/Admin.tsx` | Administração de cardápio, equipe e configurações. |
| `client/src/components/operations/OrderQueue.tsx` | Lista de pedidos e ações operacionais permitidas. |
| `client/src/components/operations/OrderAlert.tsx` | Som, destaque visual e reconhecimento de novo pedido. |
| `client/src/components/operations/Receipt.tsx` | Comanda térmica com estilos de impressão. |
| `client/src/components/admin/MenuManager.tsx` | CRUD de categorias, produtos e disponibilidade. |
| `client/src/components/admin/StaffManager.tsx` | Gestão de vínculo e papel da equipe. |
| `client/src/components/admin/StoreSettingsForm.tsx` | Dados da loja e flags do modo híbrido. |
| `client/src/services/browserPrint.ts` | Criação de janela de impressão, reimpressão e status no cliente. |
| `client/src/services/orderService.ts` | Cliente tRPC para substituir a confirmação exclusivamente local. |
| `client/src/components/delivery/CheckoutFlow.tsx` | Criação persistente de pedido e exibição do estado de pagamento de teste. |
| `client/src/components/delivery/CheckoutSuccess.tsx` | Código público e acesso ao acompanhamento do pedido. |
| `client/src/App.tsx` | Rotas públicas, administrativas e operacionais. |
| `docs/operation-kiosk-printing.md` | Preparação do computador dedicado e impressora térmica. |

## Task 1: Expandir os contratos de domínio e a modelagem de dados

**Files:**
- Modify: `drizzle/schema.ts`
- Create: `shared/operations.ts`
- Create: `shared/operations.test.ts`

- [ ] **Step 1: Escrever o teste de transições válidas de status antes da implementação.**

```ts
import { describe, expect, it } from "vitest";
import { canTransitionOrderStatus } from "./operations";

describe("order status transitions", () => {
  it("permite avançar de confirmado para em_preparo", () => {
    expect(canTransitionOrderStatus("confirmado", "em_preparo")).toBe(true);
  });

  it("recusa concluir um pedido aguardando pagamento", () => {
    expect(canTransitionOrderStatus("aguardando_pagamento", "concluido")).toBe(false);
  });
});
```

- [ ] **Step 2: Executar o teste para confirmar que falha pela ausência do módulo.**

Run: `pnpm test -- shared/operations.test.ts`  
Expected: FAIL com erro de módulo não encontrado.

- [ ] **Step 3: Criar os contratos compartilhados e o grafo explícito de transições.**

```ts
export const orderStatuses = [
  "aguardando_pagamento",
  "confirmado",
  "em_preparo",
  "pronto",
  "saiu_para_entrega",
  "concluido",
  "cancelado",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  aguardando_pagamento: ["confirmado", "cancelado"],
  confirmado: ["em_preparo", "cancelado"],
  em_preparo: ["pronto", "saiu_para_entrega", "cancelado"],
  pronto: ["concluido", "cancelado"],
  saiu_para_entrega: ["concluido", "cancelado"],
  concluido: [],
  cancelado: [],
};

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus) {
  return transitions[from].includes(to);
}
```

- [ ] **Step 4: Estender `drizzle/schema.ts` com as tabelas de operação.**

```ts
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  publicCode: varchar("publicCode", { length: 16 }).notNull().unique(),
  customerName: varchar("customerName", { length: 140 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 32 }).notNull(),
  deliveryMode: mysqlEnum("deliveryMode", ["delivery", "pickup"]).notNull(),
  status: mysqlEnum("status", orderStatuses).default("aguardando_pagamento").notNull(),
  subtotalCents: int("subtotalCents").notNull(),
  deliveryFeeCents: int("deliveryFeeCents").notNull(),
  totalCents: int("totalCents").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

Adicionar na mesma migração as tabelas `menuCategories`, `menuProducts`, `productOptionGroups`, `productOptions`, `orderItems`, `orderStatusEvents`, `payments`, `paymentEvents`, `staffMembers`, `printJobs` e `storeSettings`, sempre com valores monetários em centavos e referências por chave estrangeira.

- [ ] **Step 5: Executar os testes de domínio.**

Run: `pnpm test -- shared/operations.test.ts`  
Expected: PASS com 2 testes.

- [ ] **Step 6: Gerar, ler e aplicar uma única migração.**

Run: `pnpm drizzle-kit generate`  
Run: `cat drizzle/migrations/0001_marmitas_operation.sql`  
Apply o SQL revisado com `webdev_execute_sql`.

- [ ] **Step 7: Commit.**

```bash
git add drizzle/schema.ts drizzle/migrations shared/operations.ts shared/operations.test.ts
git commit -m "feat: add operational order schema"
```

## Task 2: Implementar acesso a dados e autorização por papel

**Files:**
- Create: `server/authorization.ts`
- Create: `server/db/operations.ts`
- Create: `server/authorization.test.ts`
- Modify: `server/db.ts`

- [ ] **Step 1: Definir testes de autorização no servidor.**

```ts
it("permite acesso operacional para membro da equipe", () => {
  expect(canOperateOrders({ role: "user", staffRole: "operator" })).toBe(true);
});

it("recusa edição de cardápio para equipe operacional", () => {
  expect(canManageCatalog({ role: "user", staffRole: "operator" })).toBe(false);
});
```

- [ ] **Step 2: Executar o teste para confirmar falha.**

Run: `pnpm test -- server/authorization.test.ts`  
Expected: FAIL por símbolos ainda inexistentes.

- [ ] **Step 3: Implementar as regras de papel e os helpers de contexto.**

```ts
export type OperationalActor = { role: "user" | "admin"; staffRole?: "operator" | "admin" };

export function canOperateOrders(actor: OperationalActor) {
  return actor.role === "admin" || actor.staffRole === "operator" || actor.staffRole === "admin";
}

export function canManageCatalog(actor: OperationalActor) {
  return actor.role === "admin" || actor.staffRole === "admin";
}
```

- [ ] **Step 4: Implementar helpers de banco focados.**

Criar funções `createOrder`, `getPublicOrderByCode`, `listOperationalOrders`, `transitionOrderStatus`, `createPrintJob`, `markPrintJob`, `listMenuProducts`, `upsertMenuProduct`, `setMenuProductAvailability`, `listStaffMembers` e `upsertStaffMember`. Cada helper deve retornar o resultado cru do Drizzle e receber conexão obtida por `getDb()`.

- [ ] **Step 5: Rodar teste e checagem de tipos.**

Run: `pnpm test -- server/authorization.test.ts && pnpm check`  
Expected: PASS e saída TypeScript sem erros.

- [ ] **Step 6: Commit.**

```bash
git add server/authorization.ts server/authorization.test.ts server/db.ts server/db/operations.ts
git commit -m "feat: add operation permissions and data access"
```

## Task 3: Criar o fluxo persistente de pedido e pagamento de teste

**Files:**
- Create: `server/services/paymentAdapter.ts`
- Create: `server/services/paymentAdapter.test.ts`
- Create: `server/services/orderWorkflow.ts`
- Create: `server/services/orderWorkflow.test.ts`
- Create: `server/routers/orders.ts`
- Create: `server/routers/payments.ts`
- Modify: `server/routers.ts`

- [ ] **Step 1: Escrever testes do adaptador de teste e da idempotência do pedido.**

```ts
it("cria cobrança de teste PIX sem chamar provedor externo", async () => {
  const charge = await testPaymentAdapter.createCharge({ orderId: 7, amountCents: 3590, method: "pix" });
  expect(charge.provider).toBe("test");
  expect(charge.status).toBe("pending");
});

it("retorna o mesmo pedido ao repetir a mesma chave de idempotência", async () => {
  const first = await workflow.createOrder(input, "cart-abc");
  const second = await workflow.createOrder(input, "cart-abc");
  expect(second.publicCode).toBe(first.publicCode);
});
```

- [ ] **Step 2: Executar os testes para confirmar falha.**

Run: `pnpm test -- server/services/paymentAdapter.test.ts server/services/orderWorkflow.test.ts`  
Expected: FAIL por módulos ausentes.

- [ ] **Step 3: Implementar o contrato de cobrança e o adaptador de teste.**

```ts
export type PaymentMethod = "pix" | "card" | "voucher";
export type PaymentStatus = "pending" | "authorized" | "paid" | "failed" | "refunded";

export interface PaymentAdapter {
  createCharge(input: { orderId: number; amountCents: number; method: PaymentMethod }): Promise<{
    provider: "test" | "asaas";
    providerReference: string;
    status: PaymentStatus;
    pixCopyPaste?: string;
  }>;
  getChargeStatus(providerReference: string): Promise<PaymentStatus>;
}
```

O adaptador de teste deve criar referências `test_<uuid>`, gerar uma sequência copia-e-cola não financeira para PIX e permitir a confirmação explícita somente por procedimento administrativo de teste.

- [ ] **Step 4: Implementar criação transacional do pedido.**

O `orderWorkflow.createOrder` deve validar disponibilidade, recalcular totais no servidor, gravar pedido e itens congelados, criar pagamento pendente, salvar evento de pagamento e status inicial. A `idempotencyKey` deve ser única por pedido para evitar duplicidade por clique ou nova tentativa de rede.

- [ ] **Step 5: Expor os procedimentos tRPC.**

```ts
orders: ordersRouter,
payments: paymentsRouter,
```

O roteador público deve expor `orders.create` e `orders.track`. O roteador protegido deve expor `orders.listOperational`, `orders.transitionStatus` e `payments.confirmTestCharge`. A confirmação de cobrança de teste deve, em uma única operação, marcar pagamento pago, adicionar histórico `confirmado` e criar `printJob` pendente.

- [ ] **Step 6: Rodar testes e tipo.**

Run: `pnpm test -- server/services/paymentAdapter.test.ts server/services/orderWorkflow.test.ts && pnpm check`  
Expected: PASS e sem erros de TypeScript.

- [ ] **Step 7: Commit.**

```bash
git add server/services server/routers/orders.ts server/routers/payments.ts server/routers.ts
git commit -m "feat: persist orders with hybrid test payments"
```

## Task 4: Migrar o checkout público para a fonte de verdade no servidor

**Files:**
- Modify: `client/src/services/orderService.ts`
- Modify: `client/src/services/orderService.test.ts`
- Modify: `client/src/components/delivery/CheckoutFlow.tsx`
- Modify: `client/src/components/delivery/CheckoutSuccess.tsx`
- Modify: `client/src/contexts/OrderContext.tsx`

- [ ] **Step 1: Criar teste de serviço cliente para criação persistente.**

```ts
it("mapeia o retorno persistente para a confirmação exibida ao cliente", async () => {
  const result = mapCreatedOrder({ publicCode: "TB-7K9A", paymentStatus: "pending", estimatedMinutes: 35 });
  expect(result).toMatchObject({ orderNumber: "TB-7K9A", paymentStatus: "pending" });
});
```

- [ ] **Step 2: Executar o teste para confirmar falha.**

Run: `pnpm test -- client/src/services/orderService.test.ts`  
Expected: FAIL pelo novo mapper inexistente.

- [ ] **Step 3: Implementar cliente tRPC e atualizar o formulário.**

```ts
const createOrder = trpc.orders.create.useMutation({
  onSuccess: (order) => {
    setConfirmation(order);
    clearCart();
  },
});
```

O formulário deve manter a validação atual, enviar itens, endereço, modalidade, método e uma chave UUID de idempotência. Para PIX de teste deve exibir referência/copia-e-cola claramente marcada como **ambiente de teste — sem cobrança**. Cartão e voucher devem exibir o mesmo aviso e o estado inicial da cobrança.

- [ ] **Step 4: Incluir o código de acompanhamento na confirmação.**

```tsx
<Button asChild variant="outline">
  <Link href={`/acompanhar/${confirmation.orderNumber}`}>Acompanhar pedido</Link>
</Button>
```

- [ ] **Step 5: Rodar testes de componente, tipo e build.**

Run: `pnpm test -- client/src/services/orderService.test.ts client/src/components/delivery/keyboard-flow.test.tsx && pnpm check && pnpm build`  
Expected: PASS em todos os comandos.

- [ ] **Step 6: Commit.**

```bash
git add client/src/services/orderService.ts client/src/services/orderService.test.ts client/src/components/delivery/CheckoutFlow.tsx client/src/components/delivery/CheckoutSuccess.tsx client/src/contexts/OrderContext.tsx
git commit -m "feat: submit checkout to persistent orders"
```

## Task 5: Implementar acompanhamento público por código

**Files:**
- Create: `client/src/pages/TrackOrder.tsx`
- Create: `client/src/pages/TrackOrder.test.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Escrever teste de timeline pública e estado inexistente.**

```tsx
it("exibe a linha do tempo e não mostra dados privados", () => {
  render(<TrackOrderView order={{ publicCode: "TB-7K9A", customerName: "Ana", statusEvents: [{ status: "em_preparo" }] }} />);
  expect(screen.getByText("Em preparo")).toBeVisible();
  expect(screen.queryByText("Ana")).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Executar o teste para confirmar falha.**

Run: `pnpm test -- client/src/pages/TrackOrder.test.tsx`  
Expected: FAIL porque a view ainda não existe.

- [ ] **Step 3: Implementar página e rota pública.**

```tsx
<Route path="/acompanhar/:code" component={TrackOrder} />
```

Usar `trpc.orders.track.useQuery({ code })`. A tela deve exibir somente código, modalidade, total, método/estado de pagamento, previsão e a timeline; dados de endereço, telefone e identificadores internos não podem ser retornados pelo procedimento público.

- [ ] **Step 4: Rodar teste e build.**

Run: `pnpm test -- client/src/pages/TrackOrder.test.tsx && pnpm build`  
Expected: PASS e build concluído.

- [ ] **Step 5: Commit.**

```bash
git add client/src/pages/TrackOrder.tsx client/src/pages/TrackOrder.test.tsx client/src/App.tsx
git commit -m "feat: add public order tracking"
```

## Task 6: Construir painel operacional com alertas, status e comandas

**Files:**
- Create: `client/src/pages/Operations.tsx`
- Create: `client/src/components/operations/OrderQueue.tsx`
- Create: `client/src/components/operations/OrderAlert.tsx`
- Create: `client/src/components/operations/Receipt.tsx`
- Create: `client/src/components/operations/operations.test.tsx`
- Create: `client/src/services/browserPrint.ts`
- Create: `client/src/services/browserPrint.test.ts`
- Modify: `client/src/App.tsx`
- Modify: `client/src/index.css`

- [ ] **Step 1: Definir os testes de alerta e impressão.**

```ts
it("reproduz alerta apenas para pedido confirmado ainda não reconhecido", () => {
  expect(shouldAlert({ status: "confirmado", acknowledgedAt: null })).toBe(true);
  expect(shouldAlert({ status: "em_preparo", acknowledgedAt: null })).toBe(false);
});

it("abre a impressão com a comanda e registra a tentativa", () => {
  expect(buildPrintJobInput("TB-7K9A")).toEqual({ publicCode: "TB-7K9A", action: "print" });
});
```

- [ ] **Step 2: Executar os testes para confirmar falha.**

Run: `pnpm test -- client/src/components/operations/operations.test.tsx client/src/services/browserPrint.test.ts`  
Expected: FAIL pelos módulos ausentes.

- [ ] **Step 3: Implementar fila operacional protegida.**

```tsx
const { data: orders = [] } = trpc.orders.listOperational.useQuery(undefined, { refetchInterval: 10000 });
const transition = trpc.orders.transitionStatus.useMutation();
```

A página `/operacao` deve exigir perfil administrativo ou operacional. Ela deve ordenar pedidos confirmados primeiro, exibir os detalhes completos somente à equipe autorizada e oferecer apenas transições permitidas pelo status atual.

- [ ] **Step 4: Implementar alerta local acessível.**

```ts
export function shouldAlert(order: { status: string; acknowledgedAt: Date | null }) {
  return order.status === "confirmado" && order.acknowledgedAt === null;
}
```

Usar `aria-live="assertive"` para o aviso textual, som curto disparado apenas quando o usuário já interagiu com a página e botão “Reconhecer pedido”. O alerta não deve tocar novamente para pedido já reconhecido.

- [ ] **Step 5: Implementar a comanda e impressão.**

```ts
export function printReceipt(html: string) {
  const popup = window.open("", "marmitas-tb-receipt", "width=420,height=720");
  if (!popup) throw new Error("Não foi possível abrir a janela de impressão");
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  popup.print();
}
```

A comanda deve conter logo textual, código, data/hora, modalidade, endereço ou retirada, itens, opções, observação, valores, pagamento e QR/linha de separação opcional. Adicionar `@media print` para largura de 80 mm, remoção de controles e contraste em preto. Depois da chamada, registrar `printJobs` como `requested`; após retorno da janela, marcar `completed` ou `failed` conforme o resultado disponível e exibir ação de reimpressão.

- [ ] **Step 6: Adicionar rota e validar a proteção.**

```tsx
<Route path="/operacao" component={Operations} />
```

Redirecionar usuário autenticado sem papel operacional para a home com mensagem de acesso restrito.

- [ ] **Step 7: Rodar os testes de operação e verificar visualmente.**

Run: `pnpm test -- client/src/components/operations/operations.test.tsx client/src/services/browserPrint.test.ts && pnpm check`  
Expected: PASS.

Capturar `/operacao` em desktop e testar manualmente o foco do alerta, reconhecimento, mudança de status e reimpressão.

- [ ] **Step 8: Commit.**

```bash
git add client/src/pages/Operations.tsx client/src/components/operations client/src/services/browserPrint.ts client/src/App.tsx client/src/index.css
git commit -m "feat: add operational queue alerts and receipts"
```

## Task 7: Construir painel administrativo e gestão de cardápio

**Files:**
- Create: `client/src/pages/Admin.tsx`
- Create: `client/src/components/admin/MenuManager.tsx`
- Create: `client/src/components/admin/StaffManager.tsx`
- Create: `client/src/components/admin/StoreSettingsForm.tsx`
- Create: `client/src/components/admin/admin.test.tsx`
- Create: `server/routers/catalog.ts`
- Create: `server/routers/admin.ts`
- Modify: `server/routers.ts`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Escrever testes de restrição de gestão e de disponibilidade.**

```tsx
it("não renderiza editor de cardápio para equipe operacional", () => {
  render(<AdminView actorRole="operator" />);
  expect(screen.queryByRole("button", { name: "Novo produto" })).not.toBeInTheDocument();
});

it("permite desativar produto sem apagar o histórico", async () => {
  await setAvailability({ productId: 4, available: false });
  expect(await getProduct(4)).toMatchObject({ available: false });
});
```

- [ ] **Step 2: Executar o teste para confirmar falha.**

Run: `pnpm test -- client/src/components/admin/admin.test.tsx`  
Expected: FAIL por telas e procedimentos ausentes.

- [ ] **Step 3: Implementar procedimentos administrativos.**

Criar `catalog.listPublic`, `catalog.listAdmin`, `catalog.upsertCategory`, `catalog.upsertProduct`, `catalog.setAvailability`, `catalog.upsertOptionGroup`, `admin.listStaff`, `admin.upsertStaff`, `admin.getSettings` e `admin.updateSettings`. As mutações devem usar o guarda administrativo; leituras operacionais devem seguir o papel definido na Task 2.

- [ ] **Step 4: Implementar os módulos de interface.**

O `MenuManager` deve editar nome, descrição, categoria, preço em BRL convertido a centavos, preço promocional, foto por URL estática, grupos de opção e disponibilidade. O `StaffManager` deve associar um usuário autenticado ao papel `operator` ou `admin`; não deve oferecer remoção do último administrador. O formulário de configurações deve expor taxa de entrega, horários, dados da loja, modo `test` de pagamento e flag de impressão automática.

- [ ] **Step 5: Registrar a rota protegida.**

```tsx
<Route path="/admin" component={Admin} />
```

A página deve exigir administrador e usar `DashboardLayout` já existente em `client/src/components/DashboardLayout.tsx` para apresentar navegação de gestão.

- [ ] **Step 6: Rodar os testes, tipo e build.**

Run: `pnpm test -- client/src/components/admin/admin.test.tsx && pnpm check && pnpm build`  
Expected: PASS em todas as verificações.

- [ ] **Step 7: Commit.**

```bash
git add server/routers/catalog.ts server/routers/admin.ts server/routers.ts client/src/pages/Admin.tsx client/src/components/admin client/src/App.tsx
git commit -m "feat: add admin menu and staff management"
```

## Task 8: Preparar a ativação futura do Asaas e documentação operacional

**Files:**
- Create: `server/services/asaasPaymentAdapter.ts`
- Create: `server/services/asaasPaymentAdapter.test.ts`
- Create: `server/routers/asaasWebhook.ts`
- Modify: `server/_core/index.ts`
- Modify: `server/services/paymentAdapter.ts`
- Create: `docs/operation-kiosk-printing.md`
- Modify: `docs/payment-architecture-sources.md`

- [ ] **Step 1: Escrever testes de seleção de adaptador e validação de token.**

```ts
it("mantém o adaptador de teste quando o modo é test", () => {
  expect(selectPaymentAdapter("test")).toBe(testPaymentAdapter);
});

it("recusa webhook sem token Asaas correspondente", () => {
  expect(isValidAsaasWebhook({ received: "invalid", expected: "secret" })).toBe(false);
});
```

- [ ] **Step 2: Executar os testes para confirmar falha.**

Run: `pnpm test -- server/services/asaasPaymentAdapter.test.ts`  
Expected: FAIL por adaptador e validador ausentes.

- [ ] **Step 3: Criar a implementação futura sem chamadas de produção.**

```ts
export function selectPaymentAdapter(mode: "test" | "asaas") {
  return mode === "test" ? testPaymentAdapter : asaasPaymentAdapter;
}

export function isValidAsaasWebhook(input: { received?: string; expected?: string }) {
  return Boolean(input.received && input.expected && input.received === input.expected);
}
```

O `asaasPaymentAdapter` deve lançar erro controlado `ASAAS_NOT_CONFIGURED` enquanto o modo oficial não estiver habilitado. O endpoint `/api/asaas/webhook` deve aceitar somente POST, validar o token com segredo de servidor, gravar `payment_events` por id de evento e responder 204. Ele deve ignorar evento duplicado e nunca expor chave ou token no cliente.

- [ ] **Step 4: Documentar o computador dedicado.**

O documento deve instruir a: conectar e definir a térmica como impressora padrão; abrir `/operacao`; autenticar um usuário de equipe; permitir áudio; iniciar Chrome/Chromium com `--kiosk --kiosk-printing <url-da-operacao>`; testar com cobrança de teste; e manter botão de reimpressão disponível. Deve também explicar que qualquer mudança em drivers, navegador ou sistema operacional é responsabilidade da operação local.

- [ ] **Step 5: Rodar testes e tipo.**

Run: `pnpm test -- server/services/asaasPaymentAdapter.test.ts && pnpm check`  
Expected: PASS sem credenciais Asaas necessárias.

- [ ] **Step 6: Commit.**

```bash
git add server/services/asaasPaymentAdapter.ts server/services/asaasPaymentAdapter.test.ts server/routers/asaasWebhook.ts server/_core/index.ts server/services/paymentAdapter.ts docs
git commit -m "feat: prepare Asaas adapter and kiosk printing guide"
```

## Task 9: Validar a operação integrada e documentar a entrega

**Files:**
- Modify: `todo.md`
- Modify: `docs/accessibility-checklist.md`
- Create: `docs/operations-validation.md`

- [ ] **Step 1: Criar testes de regressão de fluxo completo.**

```ts
it("cria pedido de teste, confirma pagamento, cria comanda e permite concluir", async () => {
  const order = await createTestOrder();
  await confirmTestCharge(order.paymentReference);
  expect(await listOperationalOrders()).toContainEqual(expect.objectContaining({ publicCode: order.publicCode, status: "confirmado" }));
  await transitionOrderStatus(order.id, "em_preparo");
  await transitionOrderStatus(order.id, "pronto");
  await transitionOrderStatus(order.id, "concluido");
});
```

- [ ] **Step 2: Executar a suíte completa e confirmar sucesso.**

Run: `pnpm test && pnpm check && pnpm build`  
Expected: todos os testes aprovados, TypeScript sem erros e build concluído.

- [ ] **Step 3: Validar visualmente as rotas.**

Capturar e revisar `/`, `/acompanhar/<codigo-real-de-teste>`, `/operacao` e `/admin` em desktop. Revisar a vitrine em largura de 375 px para confirmar que o checkout existente permanece funcional.

- [ ] **Step 4: Registrar a evidência de teste.**

O documento `docs/operations-validation.md` deve registrar: data, comando de testes, verificação de build, fluxos exercitados, roteiro de impressão no computador dedicado e limitações do modo híbrido.

- [ ] **Step 5: Marcar tarefas concluídas em `todo.md`.**

Atualizar somente os itens concluídos para `[x]`, preservando o histórico das versões anteriores.

- [ ] **Step 6: Commit e checkpoint.**

```bash
git add todo.md docs/accessibility-checklist.md docs/operations-validation.md
git commit -m "test: validate end to end delivery operations"
```

Executar `webdev_save_checkpoint` após confirmar `todo.md` sem pendências dessa entrega.

## Revisão do plano

O plano cobre cada requisito da especificação: persistência e histórico nas Tasks 1–3; permissões na Task 2; checkout híbrido na Tasks 3–4; acompanhamento público na Task 5; alertas, comandas e impressão na Task 6; gestão de cardápio e equipe na Task 7; ativação segura e documentação do Asaas na Task 8; e validação integrada na Task 9. Os métodos, estados e tipos reutilizam os mesmos nomes em todas as tarefas: `OrderStatus`, `PaymentStatus`, `PaymentAdapter`, `publicCode`, `idempotencyKey` e `printJobs`.
