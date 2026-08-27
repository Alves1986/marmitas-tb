# Tela de Cozinha Somente Consulta — Plano de Implementação

> **Para agentes autônomos:** HABILIDADE OBRIGATÓRIA: usar execução incremental de tarefas, com TDD em cada alteração. As etapas usam checkboxes para rastreamento.

**Objetivo:** Criar a rota interna `/operacao/cozinha`, somente consulta, que destaca pedidos `COUNTER` ativos e organiza os demais pedidos ativos em colunas de produção.

**Arquitetura:** A tela reutilizará `GET /api/operations/orders`; o contrato operacional será ampliado apenas com `sourceChannel` e `counterTicket`, ambos derivados do pedido existente no Supabase. Um módulo puro fará o filtro, a ordenação e a separação em faixa de balcão/colunas, permitindo testes sem navegador. A página React consumirá o serviço operacional existente, sem mutações, sem polling adicional ao já utilizado no componente e sem tabelas, endpoints ou filas novas.

**Tecnologias:** React 19, TypeScript, Wouter, Tailwind 4, Vitest + happy-dom, Vercel Functions TypeScript e Supabase Postgres via cliente administrativo server-side.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `api/operations/orders.ts` | Incluir origem e senha de balcão na projeção de leitura já protegida. |
| `server/vercel/operations/orders.test.ts` | Confirmar que a API operacional mantém autorização e projeta os novos campos. |
| `client/src/services/operationsService.ts` | Declarar os dois novos campos no tipo de leitura Vercel. |
| `client/src/lib/kitchenBoard.ts` | Filtrar pedidos ativos e criar grupos de exibição puros e ordenados. |
| `client/src/lib/kitchenBoard.test.ts` | Cobrir segregação COUNTER, estados ativos, ausência de duplicação e ordem cronológica. |
| `client/src/pages/KitchenBoard.tsx` | Renderizar a tela de cozinha somente consulta e atualizar a cada 10 segundos. |
| `client/src/pages/KitchenBoard.test.tsx` | Cobrir acesso, conteúdo de leitura, vazio, falha e ausência de mutações. |
| `client/src/App.tsx` | Registrar a rota `/operacao/cozinha`. |
| `client/src/pages/Operations.tsx` | Adicionar atalho operacional para a tela de cozinha. |
| `client/src/pages/Operations.vercel.test.tsx` | Confirmar o atalho de navegação na área operacional. |

## Tarefa 1: Ampliar a projeção operacional somente leitura

**Arquivos:**
- Modificar: `api/operations/orders.ts:13-28,66-89,107-128`
- Modificar: `client/src/services/operationsService.ts:6-21`
- Testar: `server/vercel/operations/orders.test.ts`

- [ ] **Passo 1: Escrever a regressão de contrato do endpoint.**

Adicionar ao mock de retorno de `listOrders()` um pedido `COUNTER` com `counterTicket: "MTB-001"`. Confirmar que `GET` devolve o mesmo valor e que o perfil não operacional continua recebendo `403`.

```ts
expect(response.status).toBe(200);
await expect(response.json()).resolves.toEqual([
  expect.objectContaining({ sourceChannel: "COUNTER", counterTicket: "MTB-001" }),
]);
```

- [ ] **Passo 2: Executar a regressão para observar RED.**

Executar:

```bash
pnpm vitest run server/vercel/operations/orders.test.ts
```

Resultado esperado: falha porque `OperationalOrder` não expõe os campos de origem e senha.

- [ ] **Passo 3: Implementar a projeção mínima.**

No tipo `RawOperationalOrder`, declarar `source_channel`, `counter_ticket_date` e `counter_ticket_number`. Incluir os três campos no `.select(...)`. No mapeamento, retornar `sourceChannel: order.source_channel` e `counterTicket` como `MTB-${String(order.counter_ticket_number).padStart(3, "0")}` somente para `COUNTER` com senha persistida; retornar `null` nos demais casos.

```ts
sourceChannel: order.source_channel,
counterTicket: order.source_channel === "COUNTER" && order.counter_ticket_number
  ? `MTB-${String(order.counter_ticket_number).padStart(3, "0")}`
  : null,
```

Atualizar `VercelOperationalOrder` com:

```ts
sourceChannel: "OWN_APP" | "KIOSK" | "COUNTER" | "IFOOD" | "WHATSAPP" | "PHONE";
counterTicket: string | null;
```

- [ ] **Passo 4: Executar a regressão para observar GREEN.**

Executar:

```bash
pnpm vitest run server/vercel/operations/orders.test.ts && pnpm check
```

Resultado esperado: testes aprovados e TypeScript sem erro.

- [ ] **Passo 5: Salvar checkpoint local do marco.**

Verificar o diff antes do checkpoint:

```bash
git diff --check
```

## Tarefa 2: Criar a projeção pura da cozinha

**Arquivos:**
- Criar: `client/src/lib/kitchenBoard.ts`
- Criar: `client/src/lib/kitchenBoard.test.ts`

- [ ] **Passo 1: Escrever testes de filtragem e agrupamento.**

Criar pedidos sintéticos para `COUNTER confirmado`, `OWN_APP confirmado`, `KIOSK em_preparo`, `OWN_APP pronto_para_retirada`, `COUNTER concluido` e `OWN_APP aguardando_pagamento`. Exigir que apenas os quatro ativos sejam exibidos, que os dois `COUNTER` ativos apareçam apenas na faixa superior e que cada grupo tenha ordem crescente de `createdAt`.

```ts
expect(buildKitchenBoard(orders)).toEqual({
  counterPriority: [expect.objectContaining({ id: "counter-active" })],
  confirmed: [expect.objectContaining({ id: "own-confirmed" })],
  preparing: [expect.objectContaining({ id: "kiosk-preparing" })],
  ready: [expect.objectContaining({ id: "own-ready" })],
});
```

- [ ] **Passo 2: Executar os testes para observar RED.**

Executar:

```bash
pnpm vitest run client/src/lib/kitchenBoard.test.ts
```

Resultado esperado: falha porque o módulo ainda não existe.

- [ ] **Passo 3: Implementar funções puras e exportadas.**

Definir `KitchenOrder` a partir de `Pick<VercelOperationalOrder, "id" | "code" | "customerName" | "customerNotes" | "status" | "createdAt" | "items" | "sourceChannel" | "counterTicket">`. Criar `isKitchenActiveStatus`, `sortOldestFirst` e `buildKitchenBoard`.

```ts
const kitchenStatuses = new Set<OrderStatus>(["confirmado", "em_preparo", "pronto_para_retirada"]);

export function buildKitchenBoard(orders: KitchenOrder[]): KitchenBoard {
  const active = orders.filter((order) => kitchenStatuses.has(order.status));
  const counterPriority = active.filter((order) => order.sourceChannel === "COUNTER").sort(sortOldestFirst);
  const nonCounter = active.filter((order) => order.sourceChannel !== "COUNTER");
  return {
    counterPriority,
    confirmed: nonCounter.filter((order) => order.status === "confirmado").sort(sortOldestFirst),
    preparing: nonCounter.filter((order) => order.status === "em_preparo").sort(sortOldestFirst),
    ready: nonCounter.filter((order) => order.status === "pronto_para_retirada").sort(sortOldestFirst),
  };
}
```

- [ ] **Passo 4: Executar os testes para observar GREEN.**

Executar:

```bash
pnpm vitest run client/src/lib/kitchenBoard.test.ts && pnpm check
```

Resultado esperado: testes e checagem de tipos aprovados.

- [ ] **Passo 5: Salvar checkpoint local do marco.**

Executar:

```bash
git diff --check
```

## Tarefa 3: Implementar a página de cozinha somente consulta

**Arquivos:**
- Criar: `client/src/pages/KitchenBoard.tsx`
- Criar: `client/src/pages/KitchenBoard.test.tsx`
- Modificar: `client/src/App.tsx`

- [ ] **Passo 1: Escrever regressões de interface.**

Renderizar uma variante injetável `KitchenBoardContent` com `role="staff"`, pedidos de cada grupo e consulta simulada. Confirmar título “Cozinha”, faixa “Prioridade balcão”, senha `MTB-001`, os três títulos de coluna, ausência de botões “Iniciar preparo”, “Reimprimir” e “Cancelar pedido”, além do estado vazio e da mensagem de falha.

```tsx
expect(screen.getByText("Prioridade balcão")).toBeTruthy();
expect(screen.getByText("MTB-001")).toBeTruthy();
expect(screen.queryByRole("button", { name: /reimprimir/i })).toBeNull();
expect(screen.queryByRole("button", { name: /iniciar preparo/i })).toBeNull();
```

- [ ] **Passo 2: Executar os testes para observar RED.**

Executar:

```bash
pnpm vitest run client/src/pages/KitchenBoard.test.tsx
```

Resultado esperado: falha porque a página ainda não existe.

- [ ] **Passo 3: Implementar `KitchenBoardContent`.**

Usar `OperationsAccessGate` com `role`, `useEffect` com `setInterval(load, 10_000)` e injeção opcional `loadOrders` para testes. Transformar os dados com `buildKitchenBoard`. Criar cartões somente texto com quantidade, nome, observação e hora. Não importar `Button`, `printReceipt`, `transitionOrder`, `requeuePrint` ou `markPrintJob`.

```tsx
<section aria-labelledby="counter-priority-title">
  <h2 id="counter-priority-title">Prioridade balcão</h2>
  {board.counterPriority.map((order) => <KitchenTicket key={order.id} order={order} priority />)}
</section>
```

Usar `KitchenColumn` para os títulos “Novo pedido”, “Em preparo” e “Pronto para retirada”; em mobile, aplicar `grid-cols-1`; em telas largas, `xl:grid-cols-3`.

- [ ] **Passo 4: Registrar a rota protegida.**

Em `client/src/App.tsx`, importar `KitchenBoard` e adicionar:

```tsx
<Route path={"/operacao/cozinha"} component={KitchenBoard} />
```

- [ ] **Passo 5: Executar os testes para observar GREEN.**

Executar:

```bash
pnpm vitest run client/src/pages/KitchenBoard.test.tsx && pnpm check
```

Resultado esperado: interface e tipos aprovados.

- [ ] **Passo 6: Salvar checkpoint local do marco.**

Executar:

```bash
git diff --check
```

## Tarefa 4: Expor a navegação operacional

**Arquivos:**
- Modificar: `client/src/pages/Operations.tsx`
- Modificar: `client/src/pages/Operations.vercel.test.tsx`

- [ ] **Passo 1: Escrever a regressão de atalho.**

Adicionar um teste que encontre o link acessível `Abrir tela de cozinha` apontando para `/operacao/cozinha`.

```tsx
expect((await screen.findByRole("link", { name: "Abrir tela de cozinha" })).getAttribute("href")).toBe("/operacao/cozinha");
```

- [ ] **Passo 2: Executar a regressão para observar RED.**

Executar:

```bash
pnpm vitest run client/src/pages/Operations.vercel.test.tsx
```

Resultado esperado: falha por ausência do atalho.

- [ ] **Passo 3: Adicionar o atalho.**

Importar um ícone semântico de cozinha ou monitoramento já disponível no pacote `lucide-react`. Inserir um `Button asChild` no conjunto de atalhos de `Operations`, com texto exato “Abrir tela de cozinha” e `href="/operacao/cozinha"`. Preservar os links de PDV, despesa, gestão e cardápio.

- [ ] **Passo 4: Executar a regressão para observar GREEN.**

Executar:

```bash
pnpm vitest run client/src/pages/Operations.vercel.test.tsx && pnpm check
```

Resultado esperado: atalho e tipos aprovados.

## Tarefa 5: Validar e documentar o incremento

**Arquivos:**
- Modificar: `docs/superpowers/specs/2026-08-27-tela-cozinha-design.md`
- Modificar: `todo.md`

- [ ] **Passo 1: Atualizar o registro de implementação.**

Alterar o status da especificação para implementado e documentar a rota, os campos projetados, a separação visual de balcão e a inexistência deliberada de mutações, agente e hardware.

- [ ] **Passo 2: Marcar itens concluídos no backlog.**

Marcar como concluídos apenas os itens de levantamento, desenho, implementação e validação da tela de cozinha; não alterar as pendências de Asaas, SMTP, domínio, agente e hardware.

- [ ] **Passo 3: Executar a validação completa.**

Executar:

```bash
pnpm test && pnpm check && pnpm build && pnpm build:vercel-runtime && git diff --check
```

Resultado esperado: todos os testes aprovados, checagem TypeScript limpa, builds concluídos e diff sem erro.

- [ ] **Passo 4: Verificar visualmente as rotas.**

Capturar `/operacao/cozinha` em desktop e viewport móvel. Sem sessão, confirmar a barreira de acesso; com a variante testável, confirmar via happy-dom a composição da faixa/colunas. Não gerar pedidos de teste no Supabase.

- [ ] **Passo 5: Salvar checkpoint sem publicar.**

Salvar um checkpoint com resumo do incremento, evidências de validação e limites mantidos. Não enviar ao GitHub e não publicar na Vercel sem autorização nova.
