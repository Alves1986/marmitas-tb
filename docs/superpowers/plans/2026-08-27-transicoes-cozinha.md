# Plano de implementação — transições controladas na cozinha

> **Para agentes de implementação:** habilidade obrigatória: usar `executing-plans` para executar este plano tarefa a tarefa. As etapas usam caixas de seleção para rastreamento.

**Objetivo:** Permitir que `staff` e `admin` avancem um pedido na tela `/operacao/cozinha` de `confirmado` para `em_preparo` e de `em_preparo` para `pronto_para_retirada`, preservando a prioridade visual de balcão e a confirmação server-side.

**Arquitetura:** A interface reutilizará `PATCH /api/operations/orders` por meio de `vercelOperationsService.transitionOrder`, sem criar endpoint ou schema. Um módulo puro definirá a única ação disponível para cada cartão. A página manterá pendência e falha local por pedido, atualizando o cartão somente depois da resposta positiva do servidor, enquanto o polling de 10 segundos continua como reconciliação.

**Tecnologias:** React 19, TypeScript, Vitest/happy-dom, Wouter, Tailwind 4, Vercel Functions e Supabase já configurados.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `client/src/lib/kitchenBoard.ts` | Declarar a próxima ação permitida sem alterar o pedido. |
| `client/src/lib/kitchenBoard.test.ts` | Cobrir o mapeamento determinístico de estado para ação. |
| `client/src/pages/KitchenBoard.tsx` | Renderizar controles por cartão, pendência, erro e atualização pós-servidor. |
| `client/src/pages/KitchenBoard.test.tsx` | Cobrir botão, chamada, bloqueio, sucesso, falha e prioridade COUNTER. |
| `server/vercel/operations/orders.test.ts` | Confirmar que o endpoint continua usando o ator autenticado e aplica transições válidas. |
| `docs/superpowers/specs/2026-08-27-transicoes-cozinha-design.md` | Registrar o estado implementado e as exclusões deliberadas. |
| `todo.md` | Marcar somente as tarefas concluídas após a validação. |

### Tarefa 1: Determinar a ação permitida de um cartão

**Arquivos:**
- Modificar: `client/src/lib/kitchenBoard.ts`
- Modificar: `client/src/lib/kitchenBoard.test.ts`

- [ ] **Etapa 1: Escrever a regressão que falha.**

```ts
expect(getKitchenOrderAction("confirmado")).toEqual({
  label: "Iniciar preparo",
  nextStatus: "em_preparo",
});
expect(getKitchenOrderAction("em_preparo")).toEqual({
  label: "Marcar pronto",
  nextStatus: "pronto_para_retirada",
});
expect(getKitchenOrderAction("pronto_para_retirada")).toBeNull();
expect(getKitchenOrderAction("concluido")).toBeNull();
```

- [ ] **Etapa 2: Executar a regressão.**

Executar `pnpm vitest run client/src/lib/kitchenBoard.test.ts`. O resultado esperado é falha por `getKitchenOrderAction` inexistente.

- [ ] **Etapa 3: Implementar o mapeamento mínimo.**

```ts
export type KitchenOrderAction = {
  label: "Iniciar preparo" | "Marcar pronto";
  nextStatus: "em_preparo" | "pronto_para_retirada";
};

export function getKitchenOrderAction(status: KitchenOrder["status"]): KitchenOrderAction | null {
  if (status === "confirmado") return { label: "Iniciar preparo", nextStatus: "em_preparo" };
  if (status === "em_preparo") return { label: "Marcar pronto", nextStatus: "pronto_para_retirada" };
  return null;
}
```

- [ ] **Etapa 4: Executar a regressão em verde.**

Executar `pnpm vitest run client/src/lib/kitchenBoard.test.ts`. O resultado esperado é aprovação da suíte.

### Tarefa 2: Executar a transição confirmada no cartão

**Arquivos:**
- Modificar: `client/src/pages/KitchenBoard.tsx`
- Modificar: `client/src/pages/KitchenBoard.test.tsx`

- [ ] **Etapa 1: Escrever as regressões que falham.**

Adicionar casos de DOM que renderizem um pedido `confirmado`, passem `transitionOrder={vi.fn().mockResolvedValue({ id: "order-id", status: "em_preparo" })}` e comprovem que o botão acessível contém `Iniciar preparo`; depois do clique, a função é chamada com `("order-id", "em_preparo")`. Adicionar um caso com Promise pendente que confirme o botão desabilitado e texto `Atualizando…`. Adicionar um caso rejeitado com `new Error("Conflito de status")` que confirme `role="alert"`, preserve o botão e não mova o cartão antes do êxito.

- [ ] **Etapa 2: Executar as regressões.**

Executar `pnpm vitest run client/src/pages/KitchenBoard.test.tsx`. O resultado esperado é falha por ausência dos controles e da prop `transitionOrder`.

- [ ] **Etapa 3: Implementar estado por pedido e ação direta.**

Acrescentar à prop `KitchenBoardContentProps`:

```ts
transitionOrder?: (orderId: string, nextStatus: OrderStatus) => Promise<{ id: string; status: OrderStatus }>;
```

Usar `vercelOperationsService.transitionOrder` como padrão. Armazenar `updatingOrderId: string | null` e `actionErrors: Record<string, string>`. Criar `advanceOrder(order)` que obtém `getKitchenOrderAction(order.status)`, marca o pedido pendente, chama `transitionOrder(order.id, action.nextStatus)`, altera apenas a propriedade `status` do pedido retornado após êxito e limpa o erro. Em falha, guardar a mensagem no mapa de erros; em `finally`, limpar a pendência. Não alterar a fila antes da Promise resolver e não chamar funções de impressão.

Estender `KitchenTicket` com `action`, `isUpdating`, `error` e `onAdvance`. O botão deve usar `disabled={isUpdating}`, exibir `Atualizando…` no estado pendente e ter o nome acessível `${action.label} pedido ${order.counterTicket ?? order.code}`. O aviso de erro deve usar `role="alert"`. A faixa COUNTER e as colunas devem passar os mesmos valores ao cartão, mantendo `buildKitchenBoard` como fonte única para não duplicar itens.

- [ ] **Etapa 4: Executar as regressões em verde.**

Executar `pnpm vitest run client/src/pages/KitchenBoard.test.tsx client/src/lib/kitchenBoard.test.ts`. O resultado esperado é aprovação de todos os cenários.

### Tarefa 3: Garantir o contrato server-side reutilizado

**Arquivos:**
- Modificar: `server/vercel/operations/orders.test.ts`
- Não modificar: `api/operations/[resource].ts`, `server/vercel/_lib/operations/orders.ts`, salvo se a regressão revelar quebra real.

- [ ] **Etapa 1: Escrever a regressão de autoria e transição.**

Adicionar ao teste do endpoint um `PATCH` para `pronto_para_retirada` autenticado como `staff` e confirmar que `transitionOrder` recebe o UUID de `staff.id`, mesmo se o corpo contiver um `actorUserId` diferente. Adicionar um cenário de `nextStatus: "concluido"` originado de `confirmado` e confirmar resposta `400` com a mensagem retornada por `assertTransition`.

- [ ] **Etapa 2: Executar a regressão.**

Executar `pnpm vitest run server/vercel/operations/orders.test.ts`. O resultado esperado é falha se o contrato atual não cobrir integralmente esses cenários.

- [ ] **Etapa 3: Corrigir somente se necessário.**

Se houver falha, manter a forma de entrada abaixo e garantir que a autoria venha exclusivamente de `actor.id`:

```ts
const body = transitionInput.parse(await request.json());
const updated = await transitionOrder({
  orderId: body.orderId,
  nextStatus: body.nextStatus,
  actorUserId: actor.id,
});
```

Não criar endpoint, não aceitar autoria de navegador, não adicionar cancelamento, retorno ou ações de impressão.

- [ ] **Etapa 4: Executar a regressão em verde.**

Executar `pnpm vitest run server/vercel/operations/orders.test.ts`. O resultado esperado é aprovação.

### Tarefa 4: Atualizar documentação e rastreabilidade

**Arquivos:**
- Modificar: `docs/superpowers/specs/2026-08-27-transicoes-cozinha-design.md`
- Modificar: `todo.md`

- [ ] **Etapa 1: Registrar o resultado.**

Alterar o status da especificação para implementado e documentar que apenas `confirmado → em_preparo` e `em_preparo → pronto_para_retirada` foram entregues. Declarar que não foi incluído cancelamento, retorno, reimpressão, agente, hardware, SQL ou integração externa.

- [ ] **Etapa 2: Atualizar as tarefas concluídas.**

Marcar como concluídos somente os itens de levantamento, desenho, interação e ações diretas da cozinha, depois que os testes e a validação completa tiverem passado. Manter as pendências Asaas, SMTP/domínio e ativação do estoque inalteradas.

### Tarefa 5: Validar visualmente e salvar checkpoint

**Arquivos:**
- Nenhum arquivo de produção adicional.

- [ ] **Etapa 1: Rodar a verificação completa.**

Executar:

```bash
pnpm test && pnpm check && pnpm build && pnpm build:vercel-runtime && git diff --check
```

O resultado esperado é testes aprovados, tipagem e builds concluídos e diff sem erro. Avisos conhecidos de tamanho de chunk, mapeamento de browsers e configuração legada do pnpm podem ser registrados se não bloquearem a execução.

- [ ] **Etapa 2: Revisar visualmente.**

Capturar `/operacao/cozinha` em desktop e celular sem sessão para confirmar a barreira. Quando houver sessão de equipe disponível, validar que cartões confirmados e em preparo exibem somente sua próxima ação e que COUNTER permanece na faixa prioritária.

- [ ] **Etapa 3: Salvar checkpoint.**

Criar checkpoint descritivo que mencione as duas transições, autorização server-side, atualização confirmada, bloqueio de repetição, falha recuperável, prioridade COUNTER e a ausência de novas rotas, SQL, hardware, integração externa, push ou publicação.
