# Rastreamento por telefone e PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir o acompanhamento público do pedido ativo mais recente por telefone e entregar uma Marmitas TB instalável com acesso offline somente ao conteúdo público previamente visitado.

**Architecture:** O número será convertido em uma chave de consulta somente com dígitos na criação e na busca do pedido. Um procedimento público novo retornará um recorte seguro do pedido ativo mais recente, sem endereço, itens ou observações. O PWA será configurado no Vite com manifesto, serviço de cache de navegação e conteúdo público, componente de instalação e aviso de conectividade; chamadas transacionais e de acompanhamento permanecerão fora do cache.

**Tech Stack:** React 19, TypeScript, tRPC 11, Drizzle ORM/MySQL-TiDB, Vite 7, vite-plugin-pwa, Workbox, Vitest e Testing Library.

---

### Task 1: Normalizar telefone e criar o contrato público seguro

**Files:**
- Modify: `drizzle/schema.ts`
- Modify: `drizzle/migrations/<gerada>-order_phone_lookup.sql`
- Modify: `server/db.ts:1-345`
- Modify: `server/routers.ts:19-114`
- Create: `server/publicTrackingByPhone.test.ts`

- [ ] **Step 1: Escrever os testes de contrato que falham antes da implementação**

```ts
it("normaliza telefone e retorna somente o pedido ativo mais recente", async () => {
  mockedDb.getLatestActiveOrderByPhone.mockResolvedValue({
    order: { code: "TB-20260817-0002", status: "em_preparo", totalInCents: 2890, paymentStatus: "confirmed", paymentMethod: "pix", paymentProvider: "asaas_test", fulfillmentMethod: "delivery", createdAt: new Date() },
    events: [{ id: 11, toStatus: "em_preparo", message: "Pedido em preparo.", createdAt: new Date() }],
  });

  const result = await caller.orders.trackByPhone({ phone: "(42) 9 9999-9999" });

  expect(mockedDb.getLatestActiveOrderByPhone).toHaveBeenCalledWith("42999999999");
  expect(result.order).not.toHaveProperty("deliveryAddress");
  expect(result.order).not.toHaveProperty("customerPhone");
  expect(result.order?.code).toBe("TB-20260817-0002");
});

it("recusa telefone sem quantidade mínima de dígitos", async () => {
  await expect(caller.orders.trackByPhone({ phone: "123" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
});
```

- [ ] **Step 2: Executar o teste novo para verificar a falha pelo procedimento inexistente**

Run: `pnpm exec vitest run server/publicTrackingByPhone.test.ts`

Expected: FAIL porque `orders.trackByPhone` e `getLatestActiveOrderByPhone` ainda não existem.

- [ ] **Step 3: Incluir a chave normalizada persistida e a migração segura**

```ts
// drizzle/schema.ts — coluna em orders
customerPhoneLookup: varchar("customer_phone_lookup", { length: 32 }).notNull(),
```

Run: `pnpm drizzle-kit generate`

Revisar a migração recém-gerada e ajustar a alteração de tabela para que a coluna seja inicialmente anulável, os registros existentes sejam preenchidos e só então a restrição `NOT NULL` e o índice sejam aplicados:

```sql
-- drizzle/migrations/<gerada>-order_phone_lookup.sql
ALTER TABLE orders ADD COLUMN customer_phone_lookup varchar(32) NULL;
UPDATE orders
SET customer_phone_lookup = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(customer_phone, ' ', ''), '(', ''), ')', ''), '-', ''), '+', '');
ALTER TABLE orders MODIFY COLUMN customer_phone_lookup varchar(32) NOT NULL;
CREATE INDEX orders_customer_phone_lookup_created_at_idx ON orders (customer_phone_lookup, created_at);
```

Expected: A migração gerada deve refletir a coluna de consulta e seu índice; aplicar esse SQL de migração de dados, na ordem apresentada, em uma única execução pelo mecanismo de banco do projeto.

- [ ] **Step 4: Implementar normalização, criação e busca pública com projeção restrita**

```ts
const activePublicTrackingStatuses = ["aguardando_pagamento", "confirmado", "em_preparo", "saiu_para_entrega", "pronto_para_retirada"] as const;

export function normalizePhoneForLookup(value: string) {
  return value.replace(/\D/g, "");
}

const publicTrackingOrderFields = {
  code: orders.code,
  status: orders.status,
  totalInCents: orders.totalInCents,
  paymentStatus: orders.paymentStatus,
  paymentMethod: orders.paymentMethod,
  paymentProvider: orders.paymentProvider,
  fulfillmentMethod: orders.fulfillmentMethod,
  createdAt: orders.createdAt,
};

export async function getLatestActiveOrderByPhone(phone: string) {
  const database = ensureDatabase(await getDb());
  const [selectedOrder] = await database.select({ id: orders.id, ...publicTrackingOrderFields }).from(orders)
    .where(and(eq(orders.customerPhoneLookup, normalizePhoneForLookup(phone)), inArray(orders.status, activePublicTrackingStatuses)))
    .orderBy(desc(orders.createdAt))
    .limit(1);
  if (!selectedOrder) return undefined;

  const events = await database.select({ id: orderEvents.id, toStatus: orderEvents.toStatus, message: orderEvents.message, createdAt: orderEvents.createdAt })
    .from(orderEvents).where(eq(orderEvents.orderId, selectedOrder.id)).orderBy(asc(orderEvents.createdAt));
  const { id: _internalOrderId, ...order } = selectedOrder;
  return { order, events };
}
```

Atualizar `createStoredOrder` para persistir `customerPhoneLookup: normalizePhoneForLookup(input.customerPhone)`. Atualizar `getOrderByTracking` para normalizar a entrada e comparar com a nova coluna. Em `server/routers.ts`, declarar o input como `z.object({ phone: z.string().trim().min(8).max(32) })`, converter para dígitos, rejeitar valores com menos de oito dígitos usando `TRPCError({ code: "BAD_REQUEST", message: "Informe um telefone válido." })` e expor `orders.trackByPhone`.

- [ ] **Step 5: Executar a especificação de contrato após a implementação**

Run: `pnpm exec vitest run server/publicTrackingByPhone.test.ts server/adminStaff.integration.test.ts`

Expected: PASS, confirmando validação, normalização e ausência dos campos protegidos; o contrato administrativo existente permanece aprovado.

- [ ] **Step 6: Registrar a evolução do contrato de rastreamento**

```bash
git add drizzle/schema.ts drizzle/migrations/0003_order_phone_lookup.sql server/db.ts server/routers.ts server/publicTrackingByPhone.test.ts
git commit -m "feat: permite rastrear pedido ativo por telefone"
```

### Task 2: Tornar o acompanhamento por telefone o fluxo público principal

**Files:**
- Modify: `client/src/pages/TrackOrder.tsx:1-66`
- Create: `client/src/pages/TrackOrder.test.tsx`

- [ ] **Step 1: Escrever os testes de interface que falham antes da implementação**

```tsx
it("consulta o pedido ativo pelo telefone informado", async () => {
  const trackByPhone = vi.fn();
  mockOrders.trackByPhone.useQuery.mockReturnValue({ data: { order: trackedOrder, events: [] }, isFetching: false, error: null });
  render(<TrackOrder />);

  await userEvent.type(screen.getByLabelText(/^telefone$/i), "(42) 99999-9999");
  await userEvent.click(screen.getByRole("button", { name: /acompanhar pedido/i }));

  expect(trackByPhone).toHaveBeenCalledWith({ phone: "(42) 99999-9999" }, expect.objectContaining({ enabled: true }));
  expect(screen.getByText(/pedido em preparo/i)).toBeTruthy();
});

it("não mostra endereço nem itens na resposta por telefone", () => {
  mockOrders.trackByPhone.useQuery.mockReturnValue({ data: { order: trackedOrder, events: [] }, isFetching: false, error: null });
  render(<TrackOrder />);
  expect(screen.queryByText(/rua das flores/i)).toBeNull();
  expect(screen.queryByText(/frango grelhado/i)).toBeNull();
});

it("informa que o acompanhamento precisa de conexão quando a busca falha por rede", () => {
  mockOrders.trackByPhone.useQuery.mockReturnValue({ data: undefined, isFetching: false, error: new Error("Failed to fetch") });
  render(<TrackOrder />);
  expect(screen.getByRole("alert").textContent).toMatch(/verifique sua conexão/i);
});
```

- [ ] **Step 2: Executar os testes para confirmar a falha pela consulta principal ainda inexistente**

Run: `pnpm exec vitest run client/src/pages/TrackOrder.test.tsx`

Expected: FAIL porque a página ainda exige código e chama apenas `orders.track`.

- [ ] **Step 3: Implementar o formulário principal por telefone e a alternativa específica**

Criar dois estados independentes: `phone`/`submittedPhone` para `trpc.orders.trackByPhone.useQuery` e `code`/`submittedSpecificTracking` para a consulta existente. O formulário inicial terá `Label htmlFor="track-phone"` e botão com o texto `Acompanhar pedido`; a alternativa ficará em um `details` com resumo `Tenho o código do pedido` e preservará o input de código mais o telefone.

```tsx
const trackingByPhone = trpc.orders.trackByPhone.useQuery(
  { phone: submittedPhone ?? "_" },
  { enabled: Boolean(submittedPhone), retry: false },
);

const publicTracking = trackingByPhone.data;
const hasNetworkError = Boolean(trackingByPhone.error) && !publicTracking;
```

Exibir `role="alert"` com `Não foi possível consultar agora. Verifique sua conexão e tente novamente.` quando `hasNetworkError` for verdadeiro. Para busca sem resultado, usar `Não há pedido em andamento para este telefone.`. Reutilizar o cartão de status e a linha do tempo, removendo endereço e itens do fluxo por telefone; o fluxo específico continua com a apresentação já existente.

- [ ] **Step 4: Executar os testes de interface após a implementação**

Run: `pnpm exec vitest run client/src/pages/TrackOrder.test.tsx`

Expected: PASS, cobrindo consulta, conteúdo reduzido e falha de rede.

- [ ] **Step 5: Registrar a experiência de acompanhamento simplificada**

```bash
git add client/src/pages/TrackOrder.tsx client/src/pages/TrackOrder.test.tsx
git commit -m "feat: simplifica acompanhamento por telefone"
```

### Task 3: Configurar manifesto, cache seguro e ação de instalação do PWA

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts:1-187`
- Modify: `client/index.html:4-23`
- Create: `client/src/components/pwa/InstallAppPrompt.tsx`
- Create: `client/src/components/pwa/InstallAppPrompt.test.tsx`
- Create: `client/src/components/pwa/OfflineNotice.tsx`
- Modify: `client/src/App.tsx`
- Create: `client/public/manifest.webmanifest`
- Create: `client/public/offline.html`

- [ ] **Step 1: Adicionar testes que falham para instalação e aviso offline**

```tsx
it("solicita instalação quando o navegador disponibiliza o evento", async () => {
  render(<InstallAppPrompt deferredPrompt={createDeferredPrompt()} isIos={false} isStandalone={false} />);
  await userEvent.click(screen.getByRole("button", { name: /instalar aplicativo/i }));
  expect(deferredPrompt.prompt).toHaveBeenCalledTimes(1);
});

it("apresenta instruções para adicionar à tela inicial no iOS", () => {
  render(<InstallAppPrompt deferredPrompt={null} isIos isStandalone={false} />);
  expect(screen.getByText(/compartilhar.*adicionar à tela de início/i)).toBeTruthy();
});

it("informa modo offline sem bloquear o conteúdo já carregado", () => {
  render(<OfflineNotice online={false} />);
  expect(screen.getByRole("status").textContent).toMatch(/modo offline/i);
});
```

- [ ] **Step 2: Executar os testes para confirmar a falha pelos componentes inexistentes**

Run: `pnpm exec vitest run client/src/components/pwa/InstallAppPrompt.test.tsx`

Expected: FAIL porque os componentes de instalação e modo offline ainda não existem.

- [ ] **Step 3: Adicionar a dependência e configurar o manifesto e as regras de cache**

Run: `pnpm add -D vite-plugin-pwa`

Configurar `VitePWA` em `vite.config.ts` depois de `react()` com `registerType: "autoUpdate"`, `injectRegister: null`, `manifest: false` e `workbox` com `navigateFallback: "/offline.html"`. Declarar `runtimeCaching` somente para fontes, imagens e a consulta pública de catálogo, com `NetworkFirst`, máximo de uma entrada e expiração curta de uma hora. Não adicionar regras para `/api/trpc/orders.track`, `/api/trpc/orders.trackByPhone`, `/api/trpc/orders.create`, `/api/trpc/orders.confirmTestPayment`, `/api/trpc/admin` ou `/api/trpc/operations`.

Em `client/public/manifest.webmanifest`, declarar `name`, `short_name`, `start_url`, `display: "standalone"`, `theme_color: "#481e1f"`, `background_color: "#fffaf1"` e os ícones da marca publicados no armazenamento estático do projeto. Gerar os ícones de 192×192 e 512×512 a partir da marca oficial em `/home/ubuntu/webdev-static-assets/`, publicar cada arquivo com `manus-upload-file --webdev` e usar exatamente as URLs retornadas no manifesto. Em `client/index.html`, referenciar o manifesto, cor de tema e ícone de aplicativo.

- [ ] **Step 4: Implementar os componentes de instalação, modo offline e registro do service worker**

```tsx
export function OfflineNotice({ online }: { online: boolean }) {
  if (online) return null;
  return <p role="status" className="border-b border-[#e2cfae] bg-[#fff3dd] px-4 py-2 text-center text-xs font-semibold text-[#765f50]">Modo offline: você está vendo o último cardápio disponível. Para pedir ou acompanhar, reconecte-se à internet.</p>;
}
```

Criar `InstallAppPrompt` para escutar `beforeinstallprompt`, preservar o evento, exibir o botão somente quando o prompt estiver disponível e esconder a ação após `appinstalled`. Detectar iOS por `navigator.userAgent`, exibir instruções somente fora do modo standalone e não chamar `prompt()` automaticamente. Em `client/src/main.tsx`, registrar o service worker por `virtual:pwa-register` com `registerSW({ immediate: true })`. Inserir `OfflineNotice` e `InstallAppPrompt` no shell público em `App.tsx`, sem exibi-los na rota administrativa.

- [ ] **Step 5: Executar testes dos componentes e o build de produção**

Run: `pnpm exec vitest run client/src/components/pwa/InstallAppPrompt.test.tsx && pnpm build`

Expected: PASS; o build contém `manifest.webmanifest` e o arquivo do service worker em `dist/public`.

- [ ] **Step 6: Registrar a evolução instalável do aplicativo**

```bash
git add package.json pnpm-lock.yaml vite.config.ts client/index.html client/public/manifest.webmanifest client/public/offline.html client/src/main.tsx client/src/App.tsx client/src/components/pwa
git commit -m "feat: transforma cardápio em PWA instalável"
```

### Task 4: Validar integrações e registrar a entrega

**Files:**
- Modify: `todo.md`
- Modify: `docs/operations-validation.md`

- [ ] **Step 1: Executar a suíte completa de testes**

Run: `pnpm test`

Expected: PASS, incluindo as novas especificações de rastreamento público e PWA, sem regressão em pedidos, administração, fila e pagamentos simulados.

- [ ] **Step 2: Executar checagem estática e build de produção**

Run: `pnpm check && pnpm build`

Expected: Os dois comandos finalizam com código 0; a saída de build contém o manifesto e os arquivos de service worker.

- [ ] **Step 3: Verificar visualmente os cenários públicos**

Abrir `/acompanhar` em viewport desktop e mobile e confirmar o formulário principal por telefone, a alternativa por código, os estados vazio e de erro. Abrir `/` e confirmar que o aviso de instalação aparece apenas quando suportado e que o aviso offline não cobre ações do checkout.

- [ ] **Step 4: Documentar os limites da versão PWA**

Adicionar em `docs/operations-validation.md` os comandos executados, a data da validação, a política de cache e a observação explícita de que pedidos, pagamentos, acompanhamento e áreas internas exigem conexão e não entram no cache.

- [ ] **Step 5: Marcar as tarefas como concluídas**

```markdown
- [x] Permitir o rastreamento público de pedidos usando apenas o número de telefone informado no checkout.
- [x] Transformar a Marmitas TB em PWA instalável com manifesto, ícones e experiência offline apropriada.
```

- [ ] **Step 6: Criar o checkpoint validado**

```text
Descrição: Acompanhamento público por telefone do pedido ativo mais recente e PWA da Marmitas TB com instalação, manifesto, cache seguro do cardápio e avisos de conexão.
```
