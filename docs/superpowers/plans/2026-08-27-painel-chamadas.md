# Plano de implementação — painel público de chamadas

> **Para agentes de implementação:** habilidade obrigatória: usar `executing-plans` para executar este plano tarefa a tarefa. As etapas usam caixas de seleção para rastreamento.

**Objetivo:** Criar `/chamadas`, um painel público de monitor que mostra a senha COUNTER pronta mais recente e até cinco anteriores, sem expor dados pessoais ou alterar pedidos.

**Arquitetura:** Uma nova função Vercel `api/public/ready-tickets.ts` envolverá um handler Request/Response adaptado pelo helper Node existente. A projeção server-side buscará somente `counter_ticket_number` e `updated_at` de pedidos COUNTER prontos, mapeará para `PublicReadyTicket` e limitará seis resultados. O cliente consultará o endpoint em carregamento e a cada 10 segundos, separando a primeira senha para a chamada principal.

**Tecnologias:** React 19, TypeScript, Vite/PWA, Tailwind 4, Vitest/happy-dom, Vercel Functions, Supabase Admin server-side.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `server/vercel/_lib/publicReadyTickets.ts` | Projeção minimizada, consulta Supabase e handler HTTP público GET-only. |
| `server/vercel/_lib/publicReadyTickets.test.ts` | Regras de projeção, limite, método e falha genérica. |
| `api/public/ready-tickets.ts` | Adaptador Vercel da única função pública adicional. |
| `scripts/vercelFunctionBoundary.test.ts` | Exigir 11 handlers e incluir a nova função no conjunto permitido. |
| `client/src/lib/publicCallsBoard.ts` | Dividir a primeira senha das até seis devolvidas e limitar cinco secundárias. |
| `client/src/lib/publicCallsBoard.test.ts` | Cobrir ordem preservada, chamada principal e limite. |
| `client/src/services/publicCallsService.ts` | Chamada GET sem parâmetros a `/api/public/ready-tickets`. |
| `client/src/pages/PublicCalls.tsx` | Monitor público 16:9 com estados de carregamento, vazio, falha e polling. |
| `client/src/pages/PublicCalls.test.tsx` | Cobrir privacidade, hierarquia, polling, erro e responsividade sem depender de dados reais. |
| `client/src/App.tsx` | Registrar a rota pública `/chamadas`. |
| `docs/superpowers/specs/2026-08-27-painel-chamadas-design.md` | Atualizar status e registrar limites entregues. |
| `todo.md` | Marcar somente itens concluídos depois da validação. |

### Tarefa 1: Projeção pública minimizada de senhas prontas

**Arquivos:**
- Criar: `server/vercel/_lib/publicReadyTickets.ts`
- Criar: `server/vercel/_lib/publicReadyTickets.test.ts`

- [ ] **Etapa 1: Escrever as regressões que falham.**

```ts
expect(toPublicReadyTickets([
  { counter_ticket_number: 8, updated_at: "2026-08-27T12:00:00.000Z" },
  { counter_ticket_number: 7, updated_at: "2026-08-27T11:59:00.000Z" },
])).toEqual([
  { ticket: "MTB-008", readyAt: "2026-08-27T12:00:00.000Z" },
  { ticket: "MTB-007", readyAt: "2026-08-27T11:59:00.000Z" },
]);
```

Adicionar um caso com sete registros já ordenados e confirmar que são retornados apenas seis. Verificar que o tipo público não possui `id`, `code`, `customerName`, telefone, itens, valor ou pagamento. Adicionar testes do handler que confirmem: GET responde `200`; POST responde `405` com `Allow: GET`; e uma falha do repositório responde `{ error: "Não foi possível carregar as chamadas agora." }` sem repassar detalhes da base.

- [ ] **Etapa 2: Executar as regressões.**

Executar `pnpm vitest run server/vercel/_lib/publicReadyTickets.test.ts`. O resultado esperado é falha pela inexistência do módulo e dos exports.

- [ ] **Etapa 3: Implementar tipos, projeção e handler.**

```ts
export type PublicReadyTicket = { ticket: string; readyAt: string };
type ReadyTicketRow = { counter_ticket_number: number; updated_at: string };

export function toPublicReadyTickets(rows: ReadyTicketRow[]): PublicReadyTicket[] {
  return rows.slice(0, 6).map((row) => ({
    ticket: `MTB-${String(row.counter_ticket_number).padStart(3, "0")}`,
    readyAt: row.updated_at,
  }));
}
```

Criar `listSupabasePublicReadyTickets()` com `createSupabaseAdmin()`, selecionando somente `counter_ticket_number, updated_at` da tabela `orders`, aplicando `.eq("source_channel", "COUNTER")`, `.eq("status", "pronto_para_retirada")`, `.not("counter_ticket_number", "is", null)`, `.order("updated_at", { ascending: false })` e `.limit(6)`. Criar `createPublicReadyTicketsHandler({ listReadyTickets })` que aceite exclusivamente GET, retorne `json(200, await listReadyTickets())` e converta qualquer falha em `jsonError(500, "Não foi possível carregar as chamadas agora.")`.

- [ ] **Etapa 4: Executar as regressões em verde.**

Executar `pnpm vitest run server/vercel/_lib/publicReadyTickets.test.ts`. O resultado esperado é aprovação de todos os cenários.

### Tarefa 2: Expor uma única função Vercel adicional

**Arquivos:**
- Criar: `api/public/ready-tickets.ts`
- Modificar: `scripts/vercelFunctionBoundary.test.ts`

- [ ] **Etapa 1: Escrever a regressão de fronteira.**

Atualizar a lista esperada de handlers para incluir `api/public/ready-tickets.ts`, afirmando que o total é exatamente 11 e permanece menor ou igual a 12. Adicionar a expectativa de que `api/operations/[resource].ts` permanece como dispatcher dos recursos internos, sem expor operações ao painel público.

- [ ] **Etapa 2: Executar a regressão.**

Executar `pnpm vitest run scripts/vercelFunctionBoundary.test.ts`. O resultado esperado é falha pela ausência do handler de chamadas.

- [ ] **Etapa 3: Criar o adaptador público.**

```ts
import { asVercelNodeHandler } from "../../server/vercel/_lib/http.js";
import { createDefaultPublicReadyTicketsHandler } from "../../server/vercel/_lib/publicReadyTickets.js";

export default asVercelNodeHandler(createDefaultPublicReadyTicketsHandler());
```

Não aceitar parâmetros de URL nem corpo no handler. Não adicionar o arquivo a `api/operations/` e não alterar o dispatcher interno.

- [ ] **Etapa 4: Executar a regressão em verde.**

Executar `pnpm vitest run scripts/vercelFunctionBoundary.test.ts`. O resultado esperado é aprovação e total de 11 handlers.

### Tarefa 3: Separar o conteúdo para o monitor público

**Arquivos:**
- Criar: `client/src/lib/publicCallsBoard.ts`
- Criar: `client/src/lib/publicCallsBoard.test.ts`
- Criar: `client/src/services/publicCallsService.ts`

- [ ] **Etapa 1: Escrever a regressão de divisão de chamadas.**

```ts
expect(buildPublicCallsBoard([
  { ticket: "MTB-006", readyAt: "2026-08-27T12:06:00.000Z" },
  { ticket: "MTB-005", readyAt: "2026-08-27T12:05:00.000Z" },
])).toEqual({
  featured: { ticket: "MTB-006", readyAt: "2026-08-27T12:06:00.000Z" },
  recent: [{ ticket: "MTB-005", readyAt: "2026-08-27T12:05:00.000Z" }],
});
```

Adicionar casos para lista vazia e sete tickets, comprovando que `featured` é `null` quando vazio e `recent` nunca contém mais de cinco elementos. Não reordenar a lista recebida, pois a ordenação já é de responsabilidade da função server-side.

- [ ] **Etapa 2: Executar a regressão.**

Executar `pnpm vitest run client/src/lib/publicCallsBoard.test.ts`. O resultado esperado é falha por módulo ausente.

- [ ] **Etapa 3: Implementar modelo e serviço GET.**

```ts
export type PublicReadyTicket = { ticket: string; readyAt: string };
export type PublicCallsBoard = { featured: PublicReadyTicket | null; recent: PublicReadyTicket[] };

export function buildPublicCallsBoard(tickets: PublicReadyTicket[]): PublicCallsBoard {
  return { featured: tickets[0] ?? null, recent: tickets.slice(1, 6) };
}
```

O serviço deve usar `apiRequest<PublicReadyTicket[]>("/api/public/ready-tickets")`, sem init, sem query string e sem enviar corpo, autenticação ou identificador.

- [ ] **Etapa 4: Executar a regressão em verde.**

Executar `pnpm vitest run client/src/lib/publicCallsBoard.test.ts`. O resultado esperado é aprovação da suíte.

### Tarefa 4: Construir a página pública em 16:9

**Arquivos:**
- Criar: `client/src/pages/PublicCalls.tsx`
- Criar: `client/src/pages/PublicCalls.test.tsx`
- Modificar: `client/src/App.tsx`

- [ ] **Etapa 1: Escrever as regressões de interface que falham.**

Renderizar `PublicCallsContent` com `loadTickets` injetável. Usar seis tickets e verificar que `MTB-006` aparece como título de nível 1 abaixo de `Acompanhe sua senha`, enquanto `MTB-005` até `MTB-001` aparecem como chamadas recentes. Confirmar que nenhuma string de nome, telefone, endereço, preço, pedido ou UUID aparece. Cobrir estado vazio com `Nenhuma senha chamada agora`, falha com `role="alert"` e atualização disparada pelo intervalo de 10 segundos usando temporizadores falsos.

- [ ] **Etapa 2: Executar as regressões.**

Executar `pnpm vitest run client/src/pages/PublicCalls.test.tsx`. O resultado esperado é falha por página ausente.

- [ ] **Etapa 3: Implementar a tela e rota.**

Implementar `PublicCallsContent({ loadTickets = publicCallsService.listReadyTickets })` com estados `tickets`, `loading` e `error`. Carregar ao montar e repetir com `window.setInterval(..., 10_000)`; cancelar o intervalo no cleanup. Em erro, mostrar apenas `Não foi possível atualizar as chamadas. Tente novamente em instantes.` sem dados antigos. Em vazio, mostrar `Nenhuma senha chamada agora`.

Usar `buildPublicCallsBoard` para renderizar a chamada principal com `h1` e até cinco cartões secundários. Não renderizar `readyAt` para visitantes. Incluir logo existente, texto `Marmitas TB`, orientação `Acompanhe sua senha` e indicador discreto `Atualização automática`. Estilizar para 16:9 com base creme, destaque verde, texto vermelho-escuro, fonte grande, contraste alto e uma única coluna em `max-width` móvel. Aplicar transição apenas de `opacity` na entrada da chamada principal dentro de `@media (prefers-reduced-motion: no-preference)`.

Registrar `Route path="/chamadas" component={PublicCalls}` antes da rota de página não encontrada. Não adicionar controles administrativos, ações de pedido, áudio ou links de operação.

- [ ] **Etapa 4: Executar as regressões em verde.**

Executar `pnpm vitest run client/src/pages/PublicCalls.test.tsx client/src/lib/publicCallsBoard.test.ts`. O resultado esperado é aprovação de carregamento, vazio, falha, privacidade, limite e polling.

### Tarefa 5: Atualizar runtime, documentação e validar

**Arquivos:**
- Modificar: `package.json`
- Modificar: `docs/superpowers/specs/2026-08-27-painel-chamadas-design.md`
- Modificar: `todo.md`

- [ ] **Etapa 1: Cobrir o módulo no build runtime.**

Adicionar `server/vercel/_lib/publicReadyTickets.ts` à lista explícita do script `build:vercel-runtime`, para gerar `publicReadyTickets.js` usado pela função Vercel e pelos testes. Escrever primeiro uma expectativa em `scripts/vercelFunctionBoundary.test.ts` que procura o caminho no script antes de editar `package.json`.

- [ ] **Etapa 2: Documentar a entrega.**

Atualizar a especificação para status implementado, registrar a rota `/chamadas`, o contrato sem PII, o recorte COUNTER/pronto, o limite de seis, a função número 11 e as exclusões preservadas. Marcar no `todo.md` somente os itens desta tela que tenham validação concluída; manter as pendências Asaas, SMTP/domínio e ativação do estoque abertas.

- [ ] **Etapa 3: Rodar a validação completa e salvar checkpoint.**

Executar:

```bash
pnpm test && pnpm check && pnpm build && pnpm build:vercel-runtime && git diff --check
```

Capturar `/chamadas` em 1280×720 e 375×812, conferindo que a tela não mostra PII. Salvar checkpoint que mencione o painel público, o limite e a ordem de senhas, a leitura server-side minimizada, o total de 11 handlers, as validações e a ausência de SQL, dados de teste, push ou publicação.
