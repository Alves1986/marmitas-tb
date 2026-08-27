# Núcleo inicial de estoque por movimentações — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar uma rota interna de estoque com cadastro de insumos, saldo calculado exclusivamente por movimentos imutáveis e auditáveis, sem baixa automática por pedido ou integrações externas.

**Architecture:** O domínio introduz `inventory_items` e `inventory_movements` no Supabase. Uma RPC transacional valida o papel, o tipo, o sinal, a idempotência e o saldo resultante antes de registrar movimento e auditoria. Para continuar dentro do limite Vercel Hobby, os três handlers operacionais atuais serão consolidados em uma função dinâmica `api/operations/[resource].ts`, que preservará as URLs existentes e acrescentará `/api/operations/inventory` sem aumentar o número de funções HTTP.

> **Registro de execução:** a consolidação de handlers, os contratos e a experiência local foram implementados em `feat/inventory-core`. Por decisão do responsável, a migração do Supabase foi somente arquivada; a parte de persistência e os comandos de escrita permanecem bloqueados até autorização futura específica.

**Tech Stack:** React 19, TypeScript, Vite 7, Wouter, Tailwind 4, Vitest/happy-dom, Zod, Vercel Functions TypeScript e Supabase Postgres/Auth.

---

## Estrutura de arquivos prevista

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/20260827120000_inventory_core.sql` | Estruturas aditivas, visão de saldo, políticas de leitura e RPCs transacionais de estoque. **Somente preparar; aplicar após nova autorização explícita.** |
| `shared/inventory.ts` | Tipos e listas canônicas de unidades, tipos de movimento e estados de saldo, sem dependência de UI. |
| `server/vercel/_lib/inventory.ts` | Validação pura de domínio, mapeamento das linhas do Supabase e cálculo de estado visual de saldo. |
| `server/vercel/_lib/inventory.test.ts` | Regressões unitárias do domínio de estoque. |
| `api/operations/[resource].ts` | Único dispatcher Vercel para `orders`, `alerts`, `printJobs` e `inventory`; preserva as rotas já públicas para a equipe. |
| `api/operations/inventory.test.ts` | Contratos HTTP, autorização, validação, idempotência e erros recuperáveis do recurso de estoque. |
| `client/src/services/operationsService.ts` | Contratos do cliente Vercel e métodos de leitura/escrita de estoque. |
| `client/src/lib/inventoryBoard.ts` | Funções puras de filtros, classificação de alertas e apresentação segura do saldo. |
| `client/src/lib/inventoryBoard.test.ts` | Regressões de busca, estados de alerta e ausência de ações não autorizadas. |
| `client/src/pages/Inventory.tsx` | Rota interna de estoque responsiva, com resumo, lista, formulário e histórico. |
| `client/src/pages/Inventory.test.tsx` | Regressões de DOM para permissões, vazios, falhas e fluxos de lançamento. |
| `client/src/App.tsx` | Registro da rota `/operacao/estoque`. |
| `client/src/pages/Operations.tsx` | Atalho da fila operacional para a área de estoque. |
| `client/src/pages/Operations.vercel.test.tsx` | Cobertura do atalho para estoque. |
| `scripts/vercelFunctionBoundary.test.ts` | Guarda da consolidação de handlers e do limite de funções HTTP. |
| `docs/superpowers/specs/2026-08-27-nucleo-estoque-design.md` | Atualização do status e do registro de implementação. |
| `todo.md` | Marcação dos itens de estoque efetivamente concluídos; pendências Asaas/SMTP permanecem abertas. |

## Task 1: Consolidar os handlers operacionais sem alterar suas URLs

**Files:**
- Create: `api/operations/[resource].ts`
- Delete: `api/operations/orders.ts`
- Delete: `api/operations/alerts.ts`
- Delete: `api/operations/printJobs.ts`
- Modify: `api/operations/orders.test.ts`
- Modify: `api/operations/alerts.test.ts`
- Modify: `api/operations/printJobs.test.ts`
- Modify: `scripts/vercelFunctionBoundary.test.ts`

- [ ] **Step 1: Escrever a regressão de fronteira que falha antes da consolidação.**

  Em `scripts/vercelFunctionBoundary.test.ts`, substituir a expectativa de lista por uma que exija o arquivo dinâmico e não aceite os três handlers antigos:

  ```ts
  expect(await listTypeScriptFiles(apiRoot)).toEqual([
    "admin/catalog.ts",
    "admin/finance.ts",
    "admin/settings.ts",
    "admin/staff.ts",
    "operations/[resource].ts",
    "operations/counter-orders.ts",
    "public/kiosk-orders.ts",
    "public/menu.ts",
    "public/orders.ts",
    "webhooks/asaas.ts",
  ]);
  ```

- [ ] **Step 2: Executar a regressão e confirmar a falha.**

  Run: `pnpm vitest run scripts/vercelFunctionBoundary.test.ts`

  Expected: `FAIL`, pois `operations/[resource].ts` ainda não existe e os três arquivos legados ainda contam como handlers separados.

- [ ] **Step 3: Extrair os criadores de handler atuais para funções nomeadas e criar o dispatcher.**

  Mover as funções puras `createOperationsOrdersHandler`, `createAlertsHandler` e `createPrintJobsHandler` para módulos de biblioteca sem default Vercel, preservando as dependências injetáveis testadas. Criar o dispatcher abaixo em `api/operations/[resource].ts`; ele deve usar o último segmento do pathname e recusar qualquer recurso não registrado.

  ```ts
  const operationHandlers = {
    orders: () => createOperationsOrdersHandler(createOrdersDependencies()),
    alerts: () => createAlertsHandler(createAlertsDependencies()),
    printJobs: () => createPrintJobsHandler(createPrintJobsDependencies()),
    inventory: () => createInventoryHandler(createInventoryDependencies()),
  } as const;

  export function createOperationsResourceHandler(
    factories = operationHandlers,
  ) {
    return async (request: Request): Promise<Response> => {
      const resource = new URL(request.url).pathname.split("/").filter(Boolean).at(-1);
      const createHandler = resource ? factories[resource as keyof typeof factories] : undefined;
      if (!createHandler) return jsonError(404, "Recurso operacional não encontrado.");
      return createHandler()(request);
    };
  }

  export default asVercelNodeHandler(createOperationsResourceHandler());
  ```

  A extração não pode alterar status, mensagens, métodos ou formatos das rotas `/api/operations/orders`, `/api/operations/alerts` e `/api/operations/printJobs`. Remover os três arquivos de função somente após os criadores de handler serem importados pelo dispatcher.

- [ ] **Step 4: Migrar os testes existentes para o módulo de biblioteca ou para o dispatcher e acrescentar os casos de preservação de URL.**

  Para cada recurso, construir `Request` com a URL original e garantir que o dispatcher chama o criador correto:

  ```ts
  const handler = createOperationsResourceHandler({
    orders: () => async () => json(200, { resource: "orders" }),
    alerts: () => async () => json(200, { resource: "alerts" }),
    printJobs: () => async () => json(200, { resource: "printJobs" }),
    inventory: () => async () => json(200, { resource: "inventory" }),
  });

  const response = await handler(new Request("https://app.test/api/operations/orders"));
  await expect(response.json()).resolves.toEqual({ resource: "orders" });
  ```

  Acrescentar ainda um caso `GET /api/operations/desconhecido` que espera `404` e a mensagem `Recurso operacional não encontrado.`.

- [ ] **Step 5: Executar os testes de consolidação e confirmar que passam.**

  Run: `pnpm vitest run api/operations/orders.test.ts api/operations/alerts.test.ts api/operations/printJobs.test.ts scripts/vercelFunctionBoundary.test.ts`

  Expected: `PASS`. O conjunto de arquivos `api/**/*.ts` deve ter dez handlers, abaixo do teto Hobby de doze, e todas as três URLs operacionais anteriores devem continuar atendidas.

## Task 2: Definir o domínio puro de estoque e suas regressões

**Files:**
- Create: `shared/inventory.ts`
- Create: `server/vercel/_lib/inventory.ts`
- Create: `server/vercel/_lib/inventory.test.ts`

- [ ] **Step 1: Escrever testes que falham para tipos permitidos, saldo e estado de alerta.**

  Em `server/vercel/_lib/inventory.test.ts`, cobrir os limites explícitos do desenho:

  ```ts
  expect(validateMovement({ type: "ENTRY", quantityDelta: 1 })).toEqual({ ok: true });
  expect(validateMovement({ type: "INTERNAL_CONSUMPTION", quantityDelta: -0.25 })).toEqual({ ok: true });
  expect(validateMovement({ type: "LOSS", quantityDelta: -1, reason: "Vencimento" })).toEqual({ ok: true });
  expect(validateMovement({ type: "LOSS", quantityDelta: -1 })).toEqual({ ok: false, message: "Informe o motivo da perda ou do ajuste." });
  expect(validateMovement({ type: "ENTRY", quantityDelta: -1 })).toEqual({ ok: false, message: "Entrada deve aumentar o saldo." });
  expect(getInventoryLevel(2, 2)).toBe("critical");
  expect(getInventoryLevel(3, 2)).toBe("healthy");
  ```

- [ ] **Step 2: Executar os testes e confirmar a falha.**

  Run: `pnpm vitest run server/vercel/_lib/inventory.test.ts`

  Expected: `FAIL` com erro de importação, pois os módulos de domínio ainda não existem.

- [ ] **Step 3: Criar as constantes compartilhadas e a validação pura.**

  Em `shared/inventory.ts`, declarar contratos sem dependência de React:

  ```ts
  export const inventoryUnits = ["kg", "g", "L", "mL", "unidade"] as const;
  export type InventoryUnit = (typeof inventoryUnits)[number];

  export const inventoryMovementTypes = [
    "ENTRY",
    "INTERNAL_CONSUMPTION",
    "LOSS",
    "ADJUSTMENT",
  ] as const;
  export type InventoryMovementType = (typeof inventoryMovementTypes)[number];
  export type InventoryLevel = "healthy" | "attention" | "critical";
  ```

  Em `server/vercel/_lib/inventory.ts`, implementar `validateMovement` e `getInventoryLevel`. `validateMovement` deve recusar delta zero, exigir delta positivo em `ENTRY`, negativo em `INTERNAL_CONSUMPTION` e `LOSS`, e exigir `reason.trim().length >= 3` em `LOSS` e `ADJUSTMENT`. `getInventoryLevel` deve retornar `critical` para saldo menor ou igual ao mínimo, `attention` para saldo até 25% acima do mínimo positivo e `healthy` nos demais casos.

- [ ] **Step 4: Executar os testes de domínio e confirmar que passam.**

  Run: `pnpm vitest run server/vercel/_lib/inventory.test.ts`

  Expected: `PASS` com cobertura dos sinais, motivo obrigatório e limiares de alerta.

## Task 3: Preparar a migração aditiva e as RPCs transacionais

**Files:**
- Create: `supabase/migrations/20260827120000_inventory_core.sql`
- Create: `supabase/migrations/20260827120000_inventory_core.test.sql.md`

- [ ] **Step 1: Escrever a matriz de verificação SQL antes da migração.**

  Criar `supabase/migrations/20260827120000_inventory_core.test.sql.md` com as consultas que serão executadas após autorização. Ela deve verificar: tabelas e índices criados, saldo derivado de dois movimentos, rejeição de consumo que ficaria negativo, rejeição de `LOSS` sem motivo, retorno idempotente para a mesma chave e presença de uma linha correspondente em `audit_logs`.

  ```sql
  select item_id, balance_quantity
  from public.inventory_item_balances
  where item_id = :'item_id';

  select action, entity_type, entity_id, metadata
  from public.audit_logs
  where entity_type = 'inventory_movement'
  order by created_at desc
  limit 1;
  ```

- [ ] **Step 2: Criar a migração, ainda sem aplicá-la.**

  A migração deve criar `inventory_items` e `inventory_movements` com UUIDs, `numeric(14,3)`, timestamps e constraints. Usar `create type ... exception when duplicate_object then null` para `inventory_unit` e `inventory_movement_type`. Criar o índice de nome ativo sem diferenciação de maiúsculas e os índices de movimentação por item/horário e por chave idempotente.

  A RPC `create_inventory_movement` deve executar a sequência abaixo em uma transação `security definer` com `set search_path = public`:

  ```sql
  select * into v_item from public.inventory_items where id = p_inventory_item_id for update;
  if not found or not v_item.is_active then
    raise exception 'Insumo não encontrado ou inativo.';
  end if;

  select coalesce(sum(quantity_delta), 0) into v_current_balance
  from public.inventory_movements
  where inventory_item_id = p_inventory_item_id;

  if v_current_balance + p_quantity_delta < 0 then
    raise exception 'A movimentação deixaria o estoque negativo.';
  end if;

  insert into public.inventory_movements (...) values (...)
  returning id into v_movement_id;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  values (p_actor_user_id, 'inventory_movement_created', 'inventory_movement', v_movement_id, ...);
  ```

  A chave `p_idempotency_key` deve retornar o movimento já criado em caso de repetição e não duplicar auditoria. Criar RPCs administrativas transacionais para `create_inventory_item`, `update_inventory_item` e `set_inventory_item_active`, todas registrando a respectiva auditoria. A atualização deve bloquear troca de unidade quando já houver movimentos. Criar a view `inventory_item_balances` com `coalesce(sum(quantity_delta), 0)` e estado de ativo.

- [ ] **Step 3: Revisar segurança e compatibilidade sem escrever no banco.**

  Conferir que a migração não contém `drop`, `truncate`, `delete`, alteração de pedidos, pagamentos ou impressões. Ativar RLS nas tabelas, permitir leitura autenticada de operadores por `private.is_operator()` e não liberar gravação direta a clientes. A aplicação usará a service role apenas pelo backend, enquanto as RPCs continuarão validando `p_actor_user_id` e registrando auditoria.

- [ ] **Step 4: Solicitar autorização explícita antes de aplicar a migração.**

  Interromper a execução e pedir confirmação específica para aplicar `20260827120000_inventory_core.sql` ao projeto Supabase `marmitas-tb` em `sa-east-1`. Não criar itens, saldos ou movimentos de teste sem uma segunda autorização operacional.

- [ ] **Step 5: Depois da autorização, aplicar uma única migração e executar somente verificações de esquema/RPC.**

  Aplicar o arquivo integral com a ferramenta SQL autorizada. Em seguida, executar apenas consultas de metadados e chamadas sem efeitos colaterais para confirmar que as tabelas, view, políticas e RPCs existem. Não inserir dados demonstrativos nem criar pedidos durante essa verificação.

## Task 4: Implementar o recurso HTTP protegido de estoque

**Files:**
- Modify: `api/operations/[resource].ts`
- Create: `api/operations/inventory.test.ts`
- Modify: `client/src/services/operationsService.ts`

- [ ] **Step 1: Escrever testes de contrato que falham para acesso, validação e idempotência.**

  Em `api/operations/inventory.test.ts`, instanciar `createInventoryHandler` com dependências falsas e cobrir todos os caminhos abaixo:

  ```ts
  await expect(handler(new Request("https://app.test/api/operations/inventory"))).resolves.toHaveProperty("status", 401);
  expect(await responseJson(await handler(staffPost({ action: "create-item", name: "Arroz", unit: "kg", minimumStock: 2 })))).toEqual({ message: "Acesso restrito à administração." });
  expect(await responseJson(await handler(adminPost({ action: "create-movement", type: "LOSS", quantityDelta: -1 })))).toEqual({ message: "Dados de movimentação inválidos." });
  expect(createMovement).not.toHaveBeenCalled();
  ```

  Cobrir `GET` de itens, `GET ?historyItemId=<uuid>&limit=20`, `POST create-item`, `POST create-movement`, `PATCH update-item` e `PATCH set-item-active`. Verificar que `staff` consegue apenas `ENTRY` e `INTERNAL_CONSUMPTION`, enquanto perda, ajuste e todos os comandos cadastrais são recusados no servidor com 403.

- [ ] **Step 2: Executar os testes de contrato e confirmar a falha.**

  Run: `pnpm vitest run api/operations/inventory.test.ts`

  Expected: `FAIL`, pois o recurso e seu criador de handler ainda não foram implementados.

- [ ] **Step 3: Declarar contratos de resposta e implementar `createInventoryHandler`.**

  Em `client/src/services/operationsService.ts`, acrescentar tipos serializáveis:

  ```ts
  export type VercelInventoryItem = {
    id: string;
    name: string;
    unit: InventoryUnit;
    minimumStock: number;
    balanceQuantity: number;
    level: InventoryLevel;
    isActive: boolean;
  };

  export type VercelInventoryMovement = {
    id: string;
    inventoryItemId: string;
    type: InventoryMovementType;
    quantityDelta: number;
    reason: string | null;
    note: string | null;
    actorDisplayName: string | null;
    balanceAfter: number;
    createdAt: string;
  };
  ```

  Em `api/operations/[resource].ts`, validar a carga com uma união discriminada Zod. O recurso deve usar `guards.requireStaff()` para leitura e entrada/consumo. Antes de delegar `LOSS`, `ADJUSTMENT`, criação, edição ou inativação, deve executar `guards.requireAdmin(request)`. Todos os comandos devem acrescentar `actorUserId: actor.id`; o valor do ator não pode ser aceito no JSON do navegador.

  O dispatcher deve delegar `inventory` ao criador de handler e preservar os recursos consolidados da Task 1.

- [ ] **Step 4: Conectar o repositório Supabase às RPCs e à visão de saldo.**

  Implementar dependências padrão que consultem `inventory_item_balances` para a lista e a tabela de movimentos com o perfil do ator para o histórico. Para criação, edição, inativação e movimento, chamar apenas as RPCs definidas na Task 3. Mapear erros conhecidos de RPC para mensagens seguras, em particular `A movimentação deixaria o estoque negativo.` e `Insumo não encontrado ou inativo.`. Nunca usar `insert`, `update` ou `delete` direto do handler para alterar saldos.

- [ ] **Step 5: Expor métodos do serviço cliente e confirmar o contrato.**

  Acrescentar os métodos abaixo no retorno de `createVercelOperationsService`:

  ```ts
  listInventory() {
    return api<VercelInventoryItem[]>("/api/operations/inventory");
  },
  listInventoryHistory(inventoryItemId: string, limit = 20) {
    return api<VercelInventoryMovement[]>(`/api/operations/inventory?historyItemId=${encodeURIComponent(inventoryItemId)}&limit=${limit}`);
  },
  createInventoryMovement(input: CreateInventoryMovementInput) {
    return api<VercelInventoryMovement>("/api/operations/inventory", { method: "POST", body: { action: "create-movement", ...input } });
  },
  ```

  Implementar também `createInventoryItem`, `updateInventoryItem` e `setInventoryItemActive` com o mesmo padrão de `action` e método HTTP. O formulário cliente deve gerar `crypto.randomUUID()` apenas para a chave de idempotência da movimentação.

- [ ] **Step 6: Executar os testes de contrato e confirmar que passam.**

  Run: `pnpm vitest run api/operations/inventory.test.ts api/operations/orders.test.ts api/operations/alerts.test.ts api/operations/printJobs.test.ts`

  Expected: `PASS`. Os testes precisam demonstrar o bloqueio server-side, a preservação das rotas anteriores e a ausência de escrita direta de saldo.

## Task 5: Construir a projeção pura e a tela interna de estoque

**Files:**
- Create: `client/src/lib/inventoryBoard.ts`
- Create: `client/src/lib/inventoryBoard.test.ts`
- Create: `client/src/pages/Inventory.tsx`
- Create: `client/src/pages/Inventory.test.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/pages/Operations.tsx`
- Modify: `client/src/pages/Operations.vercel.test.tsx`

- [ ] **Step 1: Escrever as regressões puras de apresentação antes da interface.**

  Em `client/src/lib/inventoryBoard.test.ts`, testar busca, ordenação e níveis com dados estáveis:

  ```ts
  expect(filterInventoryItems(items, "arroz").map((item) => item.id)).toEqual(["rice"]);
  expect(sortInventoryItems([healthy, critical, attention]).map((item) => item.id)).toEqual(["critical", "attention", "healthy"]);
  expect(getInventoryLevelLabel("critical")).toBe("Estoque crítico");
  ```

- [ ] **Step 2: Executar os testes puros e confirmar a falha.**

  Run: `pnpm vitest run client/src/lib/inventoryBoard.test.ts`

  Expected: `FAIL` com módulo inexistente.

- [ ] **Step 3: Implementar `inventoryBoard.ts` com funções determinísticas.**

  Exportar `filterInventoryItems(items, query)`, `sortInventoryItems(items)`, `getInventoryLevelLabel(level)` e `formatInventoryQuantity(quantity, unit)`. A ordenação deve ser `critical`, `attention`, `healthy`, então nome em ordem alfabética. `formatInventoryQuantity` deve usar `pt-BR`, até três casas decimais e nunca converter entre unidades.

- [ ] **Step 4: Escrever os testes de interface que falham.**

  Em `client/src/pages/Inventory.test.tsx`, usar `InventoryContent` com `role` e `loadInventory` injetáveis. Cobrir: bloqueio de `customer`, nenhum pedido HTTP quando o papel não opera, resumo com itens críticos, busca, estado vazio, erro recuperável, painel de entrada para staff, ausência de botões de perda/ajuste para staff e disponibilidade desses controles para admin.

  ```tsx
  render(<InventoryContent role="staff" loadInventory={vi.fn().mockResolvedValue([criticalRice])} />);
  expect(await screen.findByText("Estoque crítico")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Registrar entrada" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Registrar perda" })).not.toBeInTheDocument();
  ```

- [ ] **Step 5: Executar os testes de interface e confirmar a falha.**

  Run: `pnpm vitest run client/src/pages/Inventory.test.tsx`

  Expected: `FAIL`, porque a página e seus componentes ainda não existem.

- [ ] **Step 6: Implementar a página responsiva e os formulários controlados.**

  Criar `Inventory.tsx` reaproveitando `OperationsAccessGate`, `useAuth`, `useLocation`, `Button`, `Input`, `Select`, `Dialog` e o padrão visual de `CounterPdv.tsx`/`KitchenBoard.tsx`. A página deve carregar os itens apenas quando `canAccessOperation(role)` for verdadeiro. Exibir cabeçalho com retorno para `/operacao`, resumo, campo de busca, lista e botão de histórico.

  O formulário de movimento deve aceitar somente tipos permitidos pelo papel atual. Para staff, apresentar ações claras `Registrar entrada` e `Registrar consumo`. Para admin, apresentar adicionalmente `Registrar perda` e `Registrar ajuste`. `LOSS` e `ADJUSTMENT` devem exigir motivo visível; antes de enviar, criar `idempotencyKey: crypto.randomUUID()`. Durante envio, desabilitar o botão e, após sucesso, recarregar lista e histórico sem alterar manualmente o saldo local.

  O cadastro/edição/inativação de insumos deve estar em um painel administrativo visível apenas para admin. Não renderizar botões de alteração ou exclusão de movimento, porque o histórico é imutável. Em telas estreitas, renderizar cartões em vez de tabela horizontal; todos os estados precisam de texto além da cor e foco visível.

- [ ] **Step 7: Registrar rota e atalho no hub operacional.**

  Em `client/src/App.tsx`, incluir:

  ```tsx
  import Inventory from "./pages/Inventory";
  // ...
  <Route path={"/operacao/estoque"} component={Inventory} />
  ```

  Em `client/src/pages/Operations.tsx`, adicionar um botão de destaque secundário que aponte para `/operacao/estoque`, com ícone `PackageSearch` e rótulo `Abrir estoque`. Em `Operations.vercel.test.tsx`, acrescentar:

  ```tsx
  expect(screen.getByRole("link", { name: "Abrir estoque" })).toHaveAttribute("href", "/operacao/estoque");
  ```

- [ ] **Step 8: Executar os testes de tela, projeção e navegação.**

  Run: `pnpm vitest run client/src/lib/inventoryBoard.test.ts client/src/pages/Inventory.test.tsx client/src/pages/Operations.vercel.test.tsx`

  Expected: `PASS`. A interface deve mostrar corretamente crítico/atenção/adequado, proteger controles por papel e conter apenas movimentos aprovados para o papel.

## Task 6: Integrar, validar e documentar sem publicar

**Files:**
- Modify: `docs/superpowers/specs/2026-08-27-nucleo-estoque-design.md`
- Modify: `todo.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Adicionar regressões de integração que garantam que estoque não afeta pedidos.**

  Acrescentar no teste de handler de estoque uma dependência falsa de pedidos que lança se for chamada. Criar uma entrada e um consumo e afirmar que somente `createInventoryMovement` é chamado. Acrescentar também inspeção de código/mocks que confirma que `Inventory.tsx` não importa serviço de checkout, pedido, pagamento ou impressão.

- [ ] **Step 2: Executar toda a validação do projeto.**

  Run: `pnpm test && pnpm check && pnpm build && pnpm build:vercel-runtime && git diff --check`

  Expected: todos os testes aprovados, TypeScript sem erro, PWA e runtime Vercel compilados e nenhuma falha de whitespace. Se `build:vercel-runtime` gerar `.js` em `server/vercel/_lib`, confirmar que eles representam o TypeScript atual antes da execução da suíte final.

- [ ] **Step 3: Revisar visualmente as rotas modificadas.**

  Capturar `/operacao/estoque` em viewport desktop e celular sem sessão, verificando a barreira de acesso. Cobrir a experiência autenticada por testes happy-dom; não criar saldo ou movimento real de demonstração sem autorização operacional explícita.

- [ ] **Step 4: Atualizar documentação e acompanhamento.**

  Atualizar a especificação com status implementado, arquivos entregues, resultado da validação e os limites que permanecem fora do escopo. Atualizar `CLAUDE.md` com a nova rota, a regra de saldo por movimentações, permissões e o procedimento de autorização de migração. Marcar apenas os itens concluídos do núcleo de estoque em `todo.md`; manter os sete itens dependentes de Asaas/SMTP desmarcados.

- [ ] **Step 5: Criar checkpoint recuperável sem publicar nem enviar ao GitHub.**

  Ler `todo.md` integralmente para verificar as marcações. Criar checkpoint descrevendo rota, autorização server-side, movimentos imutáveis, auditoria, idempotência, saldo negativo bloqueado, consolidação de handlers e evidências de validação. Declarar expressamente que não houve push GitHub, publicação Vercel, cobrança, iFood, SMTP, hardware ou agente local.

## Revisão do plano

| Requisito da especificação | Tarefa coberta |
|---|---|
| Saldo derivado apenas de movimentos | Tasks 2, 3, 4 e 5 |
| Entradas/consumos por staff e admin | Tasks 3, 4 e 5 |
| Perdas/ajustes somente por admin com motivo | Tasks 2, 3, 4 e 5 |
| Auditoria e idempotência | Tasks 3 e 4 |
| Estoque nunca negativo | Tasks 2, 3 e 4 |
| Rota interna responsiva e acessível | Task 5 |
| Sem baixa por pedido ou integração externa | Tasks 3 e 6 |
| Sem 13ª função Vercel | Task 1 |
| Migração somente após autorização | Task 3 |
| Testes, build, revisão visual e checkpoint | Task 6 |

Uma busca textual do plano não contém os marcadores proibidos `TBD`, `TODO`, `implement later` ou instruções vagas de validação. As assinaturas, unidades, tipos de movimento e nomes de rota são consistentes com a especificação aprovada.
