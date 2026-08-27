# PDV de Balcão Híbrido — Plano de Implementação

> **Para agentes de execução:** habilidade necessária: executar o plano tarefa a tarefa, mantendo TDD e checkpoint após cada marco estável.

**Objetivo:** entregar um PDV interno que cria pedidos `COUNTER` confirmados, com configuração completa de produtos, pagamento presencial apenas registrado, senha de retirada e prioridade máxima na fila unificada de impressão.

**Arquitetura:** o navegador autenticado acessa `/operacao/pdv` e chama uma única função Vercel protegida. Essa função fixa a origem `COUNTER`, valida os itens contra o catálogo persistido, delega à transação unificada e retorna uma projeção mínima de confirmação. Uma migração aditiva torna a senha de balcão persistente e concorrente; o cliente nunca escolhe canal, status financeiro ou prioridade de impressão.

**Tecnologias:** React 19, TypeScript, Wouter, Tailwind 4, componentes existentes de UI, Vitest, Vercel Functions TypeScript, Supabase Postgres e Supabase Auth.

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/20260827..._counter_ticket.sql` | Acrescentar senha diária persistida a pedidos de balcão e ampliar a RPC transacional sem remover dados. |
| `scripts/counterTicketMigration.test.ts` | Verificar a estrutura e a serialização da senha de balcão na migração. |
| `server/vercel/_lib/ordersRepository.ts` | Compartilhar a validação de produtos/opções e construir o comando `COUNTER` com valores congelados. |
| `server/vercel/_lib/ordersRepository.test.ts` | Cobrir origem, pagamento confirmado, total e payload de balcão. |
| `api/operations/counter-orders.ts` | Proteger e expor o endpoint de criação de pedidos de balcão. |
| `server/counterOrdersHttp.test.ts` | Cobrir método, papel interno, origem fixa e contrato HTTP. |
| `client/src/services/counterOrderService.ts` | Encapsular o envio idempotente do PDV e seus tipos de confirmação. |
| `client/src/services/counterOrderService.test.ts` | Cobrir payload, idempotência e ausência de chamadas externas. |
| `client/src/pages/CounterPdv.tsx` | Compor catálogo, busca, painel de configuração, carrinho, pagamento e recibo do PDV. |
| `client/src/pages/CounterPdv.test.tsx` | Cobrir o fluxo visível completo em desktop e o erro de submissão. |
| `client/src/App.tsx` | Registrar a rota protegida `/operacao/pdv`. |
| `client/src/pages/Operations.tsx` | Adicionar atalho interno para o PDV. |
| `scripts/vercelFunctionBoundary.test.ts` | Atualizar o inventário de funções, permanecendo dentro do limite atual. |

## Tarefa 1: senha persistente e transação de pedido de balcão

**Arquivos:**
- Criar: `scripts/counterTicketMigration.test.ts`
- Criar: `supabase/migrations/20260827..._counter_ticket.sql`
- Modificar: `scripts/unifiedOrderMigration.test.ts`

- [ ] **Passo 1: escrever o teste inicialmente vermelho da migração.**

```ts
expect(sql).toContain("add column if not exists counter_ticket_date date");
expect(sql).toContain("add column if not exists counter_ticket_number integer");
expect(sql).toContain("pg_advisory_xact_lock");
expect(sql).toContain("v_source_channel = 'COUNTER'");
expect(sql).toContain("counter_ticket_number");
```

- [ ] **Passo 2: executar o teste e confirmar a falha.**

```bash
pnpm vitest run scripts/counterTicketMigration.test.ts
```

Resultado esperado: falha porque a migração ainda não existe.

- [ ] **Passo 3: criar a migração aditiva.** A migração deve adicionar `counter_ticket_date date` e `counter_ticket_number integer` à tabela `orders`; criar índice único parcial para `source_channel = 'COUNTER'` por data e número; e atualizar `public.create_unified_order` para receber e retornar os campos da senha. Dentro da mesma transação, quando a origem for `COUNTER`, deve travar a chave diária com `pg_advisory_xact_lock`, calcular o próximo número daquele dia e preencher os dois campos. Canais existentes deixam ambos os campos nulos.

```sql
if v_source_channel = 'COUNTER' then
  v_ticket_date := timezone('America/Sao_Paulo', now())::date;
  perform pg_advisory_xact_lock(hashtext('counter-ticket:' || v_ticket_date::text));
  select coalesce(max(counter_ticket_number), 0) + 1 into v_ticket_number
  from public.orders
  where source_channel = 'COUNTER' and counter_ticket_date = v_ticket_date;
end if;
```

- [ ] **Passo 4: repetir o teste e a checagem de tipos.**

```bash
pnpm vitest run scripts/counterTicketMigration.test.ts scripts/unifiedOrderMigration.test.ts && pnpm check
```

Resultado esperado: testes aprovados e TypeScript sem erro.

- [ ] **Passo 5: revisar SQL antes de qualquer aplicação.** Confirmar que não há `drop`, alteração de pedidos existentes, permissões ao público ou mudança em status dos canais atuais. A aplicação no Supabase só ocorre após revisão explícita da migração completa.

## Tarefa 2: adaptador de domínio `COUNTER`

**Arquivos:**
- Modificar: `server/vercel/_lib/ordersRepository.ts`
- Modificar: `server/vercel/_lib/ordersRepository.test.ts`

- [ ] **Passo 1: escrever o teste vermelho do construtor.**

```ts
expect(buildCounterUnifiedOrderPayload({
  code: "TB-COUNTER-001",
  idempotencyKey: "5acb1c7d-1630-4b06-9f1e-9496bb3be555",
  displayName: "Anderson",
  paymentMethod: "debit_card",
  orderItems: [{ productId: "product-1", productName: "Marmita", unitPriceInCents: 2500, quantity: 1, configuration: [], note: "" }],
})).toMatchObject({ sourceChannel: "COUNTER", status: "confirmado", paymentStatus: "confirmed", paymentProvider: "counter_record" });
```

- [ ] **Passo 2: executar o teste e confirmar a falha.**

```bash
pnpm vitest run server/vercel/_lib/ordersRepository.test.ts
```

- [ ] **Passo 3: implementar tipos e persistência.** Criar `CreateCounterOrderInput`, `CounterOrderConfirmation`, `BuildCounterUnifiedOrderInput`, `buildCounterUnifiedOrderPayload` e `createSupabaseCounterOrder`. Reutilizar exatamente a validação server-side de disponibilidade, opções obrigatórias e cálculo de preço; não duplicar consultas sem extrair um helper local comum. Mapear pagamento para `cash`, `pix`, `debit_card`, `credit_card` ou `voucher`; fixar `pickup`, `confirmado`, `confirmed`, `counter_record` e referência `counter_<code>`.

```ts
const persisted = await persistUnifiedOrder(client, buildCounterUnifiedOrderPayload({
  code,
  idempotencyKey: input.idempotencyKey,
  displayName: input.displayName,
  paymentMethod: input.paymentMethod,
  orderItems,
}));
return { orderNumber: persisted.code, ticket: persisted.counterTicket, estimatedTime: "15 a 25 min", submittedAt: persisted.createdAt };
```

- [ ] **Passo 4: executar regressões focadas.**

```bash
pnpm vitest run server/vercel/_lib/ordersRepository.test.ts server/vercel/_lib/unifiedOrders.test.ts && pnpm check
```

Resultado esperado: pedidos do aplicativo, totem e balcão usam contratos distintos, mas a mesma transação unificada.

## Tarefa 3: endpoint interno e limite de funções

**Arquivos:**
- Criar: `api/operations/counter-orders.ts`
- Criar: `server/counterOrdersHttp.test.ts`
- Modificar: `scripts/vercelFunctionBoundary.test.ts`

- [ ] **Passo 1: escrever testes HTTP vermelhos.** O teste deve confirmar que `POST` sem sessão interna retorna 403, que uma origem enviada pelo navegador é ignorada, que `idempotencyKey` precisa ser UUID e que o repositório recebe o ator autenticado e os campos de balcão.

```ts
expect(createCounterOrder).toHaveBeenCalledWith(expect.objectContaining({
  sourceChannel: "COUNTER",
  actorUserId: "5acb1c7d-1630-4b06-9f1e-9496bb3be555",
  paymentMethod: "credit_card",
}));
```

- [ ] **Passo 2: executar o teste e confirmar a falha.**

```bash
pnpm vitest run server/counterOrdersHttp.test.ts scripts/vercelFunctionBoundary.test.ts
```

- [ ] **Passo 3: implementar `createCounterOrdersHandler`.** O handler aceita somente `POST`, usa `requireOperator`, valida o corpo com Zod, remove qualquer `sourceChannel`, fixa `COUNTER`, adiciona `actorUserId` e retorna uma projeção de confirmação sem auditoria, dados de cartão ou fila.

```ts
const input = counterOrderInput.safeParse(await request.json());
if (!input.success) return json(400, { error: "Dados do pedido de balcão inválidos." });
const actor = await dependencies.requireOperator(request);
return json(201, await dependencies.createCounterOrder({ ...input.data, sourceChannel: "COUNTER", actorUserId: actor.id }));
```

- [ ] **Passo 4: atualizar a fronteira Vercel.** Incluir `operations/counter-orders.ts` na lista exata de handlers e confirmar que o total permanece menor ou igual a 12. Se o novo handler exceder o limite, consolidar rotas operacionais sem criar uma 13ª função.

- [ ] **Passo 5: executar testes e tipos.**

```bash
pnpm vitest run server/counterOrdersHttp.test.ts scripts/vercelFunctionBoundary.test.ts && pnpm check
```

## Tarefa 4: serviço cliente idempotente do PDV

**Arquivos:**
- Criar: `client/src/services/counterOrderService.ts`
- Criar: `client/src/services/counterOrderService.test.ts`

- [ ] **Passo 1: escrever o teste vermelho do serviço.**

```ts
await service.submit({ id: "counter-session-1", displayName: "", paymentMethod: "cash", items: [{ productId: "19c4f23b-1e6d-4ca1-8e62-c44876fc65f2", quantity: 1, optionIds: [], note: "" }] });
expect(request).toHaveBeenCalledWith("/api/operations/counter-orders", expect.objectContaining({
  method: "POST",
  body: expect.objectContaining({ idempotencyKey: expect.any(String), paymentMethod: "cash" }),
}));
```

- [ ] **Passo 2: executar e confirmar a falha.**

```bash
pnpm vitest run client/src/services/counterOrderService.test.ts
```

- [ ] **Passo 3: implementar a chave por tentativa.** O serviço deve manter a mesma chave enquanto `payload.id` não mudar. O envio deve usar `apiRequest` e não incluir credenciais de adquirente, QR, número de cartão ou chamadas a provedores externos.

- [ ] **Passo 4: repetir teste e TypeScript.**

```bash
pnpm vitest run client/src/services/counterOrderService.test.ts && pnpm check
```

## Tarefa 5: interface híbrida e rota protegida

**Arquivos:**
- Criar: `client/src/pages/CounterPdv.tsx`
- Criar: `client/src/pages/CounterPdv.test.tsx`
- Modificar: `client/src/App.tsx`
- Modificar: `client/src/pages/Operations.tsx`

- [ ] **Passo 1: escrever testes de interface inicialmente vermelhos.** Cobrir bloqueio de acesso, busca por produto, abertura da configuração obrigatória, inclusão no carrinho, recusa de finalização sem pagamento, envio com dinheiro, recibo com senha e manutenção do carrinho se a API falhar.

```tsx
fireEvent.click(screen.getByRole("button", { name: /finalizar venda/i }));
expect(screen.getByText(/selecione a forma de pagamento/i)).toBeTruthy();

fireEvent.click(screen.getByRole("button", { name: /registrar dinheiro/i }));
expect(await screen.findByText(/senha de retirada/i)).toBeTruthy();
```

- [ ] **Passo 2: executar e confirmar a falha.**

```bash
pnpm vitest run client/src/pages/CounterPdv.test.tsx
```

- [ ] **Passo 3: implementar a composição.** Reutilizar os tipos e componentes de produto existentes. A tela deve usar `OperationsAccessGate`; apresentar categorias, busca, cartões de produto, painel de configuração, carrinho e diálogo de pagamento. O aviso "Pagamento registrado presencialmente — nenhuma cobrança será processada" deve ficar visível no diálogo e no recibo. A confirmação deve exibir `MTB-<ticketNumber>` e o código do pedido retornados pelo servidor.

- [ ] **Passo 4: conectar rota e navegação.** Registrar `Route path="/operacao/pdv" component={CounterPdv}` no roteador e adicionar, em `Operations`, um botão "Abrir PDV de balcão" que navega para a rota interna.

- [ ] **Passo 5: repetir testes de interface, rotas e tipos.**

```bash
pnpm vitest run client/src/pages/CounterPdv.test.tsx client/src/App.operations-expense.test.tsx client/src/pages/Operations.vercel.test.tsx && pnpm check
```

## Tarefa 6: aplicação controlada da migração e validação final

**Arquivos:**
- Modificar: `docs/superpowers/specs/2026-08-26-pdv-balcao-design.md`
- Modificar: `todo.md`

- [ ] **Passo 1: revisar o SQL e solicitar confirmação antes da escrita no Supabase.** A migração deve ser uma única aplicação aditiva. Confirmar especificamente a ausência de exclusões, atualização de pedidos existentes, mudanças de permissões públicas ou ativação de pagamentos.

- [ ] **Passo 2: aplicar a migração uma vez no projeto Supabase autorizado.** Usar a ferramenta administrativa do projeto e armazenar o resultado da operação.

- [ ] **Passo 3: confirmar apenas o esquema.** Consultar `information_schema.columns` e `information_schema.routines` com `LIMIT 1`; não inserir pedido de demonstração sem nova autorização operacional explícita.

- [ ] **Passo 4: executar todos os gates.**

```bash
pnpm test && pnpm check && pnpm build && pnpm build:vercel-runtime && git diff --check
```

Resultado esperado: suíte sem falhas, TypeScript sem erros, builds concluídos e diff sem espaço inválido.

- [ ] **Passo 5: revisar visualmente.** Capturar `/operacao/pdv` em desktop e celular, confirmar contraste, painel de configuração, carrinho, diálogo e recibo. Atualizar a especificação com o status implantado e marcar no `todo.md` apenas itens efetivamente concluídos.

- [ ] **Passo 6: criar checkpoint.** Salvar uma versão revisável, sem publicar e sem enviar ao GitHub. A publicação depende de autorização explícita posterior.
