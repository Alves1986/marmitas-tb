# Tutoriais por perfil e assistente de ajuda com IA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Oferecer tutoriais completos de cliente e gestão e um assistente de IA recolhível, contextual e somente orientativo em todas as superfícies aplicáveis da Marmitas TB.

**Architecture:** O conteúdo de ajuda passa a ter uma única fonte canônica em `shared/helpContent.ts`, consumida por páginas, launcher e servidor. O cliente abre o componente existente `AIChatBox` dentro de uma casca de drawer; o servidor recebe uma pergunta curta e um contexto de superfície, deriva o papel quando necessário e chama `invokeLLM` sem ferramentas, mutações ou banco. A operação `help` entra no dispatcher `api/operations/[resource].ts`, mantendo o projeto abaixo do limite de 12 funções Vercel.

**Tech Stack:** React 19, TypeScript, Wouter, Tailwind CSS 4, shadcn Sheet, Vitest, happy-dom, Zod, Vercel Functions, Supabase Auth e proxy LLM server-side com `claude-haiku-4-5`.

> **Registro de execução — 27/08/2026:** os quatro blocos de conteúdo, páginas, operação consolidada, launcher, PDFs e documentação foram concluídos. A validação registrou 382 testes aprovados e 2 pulados, com tipagem, build PWA, runtime Vercel e `git diff --check` aprovados. O launcher passou a renderizar mensagens como texto seguro com quebras de linha, sem o renderizador Markdown pesado, para manter o bundle principal abaixo do limite de precache PWA. O checkpoint é a única etapa restante deste plano.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `shared/helpContent.ts` | Tipos, tópicos, prompts, páginas de ajuda e instrução factual compartilhada pela interface e pelo servidor. |
| `shared/helpContent.test.ts` | Valida superfícies permitidas, dados por perfil e ausência de conteúdo operativo sensível. |
| `client/src/lib/helpRouting.ts` | Converte rota atual em contexto público, interno ou sem launcher. |
| `client/src/lib/helpRouting.test.ts` | Regressão de roteamento da ajuda, incluindo exclusão de totem e painel de chamadas. |
| `client/src/services/helpService.ts` | Cliente HTTP tipado para a operação consolidada de ajuda. |
| `client/src/services/helpService.test.ts` | Valida o POST sem papel ou dados pessoais e o tratamento da resposta. |
| `server/vercel/_lib/operations/help.ts` | Validação Zod, derivação server-side de papel, instrução de segurança e invocação textual do modelo. |
| `server/helpHttp.test.ts` | Cobre superfícies públicas, barreira interna, limite de conversa, resposta e falha genérica. |
| `api/operations/[resource].ts` | Registra o recurso `help` sem criar uma função adicional. |
| `server/operationsResourceHttp.test.ts` | Garante que o dispatcher encaminha `help` e preserva os recursos existentes. |
| `client/src/components/help/HelpAssistant.tsx` | Launcher, drawer, links de tutorial, perguntas sugeridas e estado efêmero de conversa. |
| `client/src/components/help/HelpAssistant.test.tsx` | Cobre abertura, perfil visível, envio, erro recuperável e links corretos. |
| `client/src/components/help/HelpGuidePage.tsx` | Renderizador acessível das seções canônicas de cada tutorial. |
| `client/src/pages/CustomerHelp.tsx` | Página pública `/ajuda/pedidos`. |
| `client/src/pages/ManagementHelp.tsx` | Página protegida `/ajuda/gestao`, reutilizando `OperationsAccessGate`. |
| `client/src/pages/HelpPages.test.tsx` | Cobre conteúdo do cliente e barreira da página de gestão. |
| `client/src/App.tsx` | Registra as duas páginas de ajuda e monta o launcher contextual fora do totem e das chamadas. |
| `docs/guias/tutorial-cliente-marmitas-tb.md` | Fonte editorial do tutorial de pedidos. |
| `docs/guias/tutorial-gestor-marmitas-tb.md` | Fonte editorial do tutorial de gestão. |
| `/home/ubuntu/webdev-static-assets/marmitas-tb-tutoriais/cliente/documento/main.typ` | Fonte externa ao repositório do PDF ilustrado do cliente. |
| `/home/ubuntu/webdev-static-assets/marmitas-tb-tutoriais/gestao/documento/main.typ` | Fonte externa ao repositório do PDF ilustrado do gestor. |
| `CLAUDE.md` | Registra arquitetura, modelo, rota e limites da assistência. |
| `todo.md` | Marca os três itens de tutorial/IA após a validação integral. |

### Task 1: Conteúdo canônico e páginas de tutorial

**Files:**
- Create: `shared/helpContent.ts`
- Test: `shared/helpContent.test.ts`
- Create: `client/src/components/help/HelpGuidePage.tsx`
- Create: `client/src/pages/CustomerHelp.tsx`
- Create: `client/src/pages/ManagementHelp.tsx`
- Test: `client/src/pages/HelpPages.test.tsx`
- Modify: `client/src/App.tsx:5-64`

- [ ] **Step 1: Escrever as regressões da base canônica e das páginas.**

```ts
it("separa prompts e rota de tutorial conforme a superfície", () => {
  expect(getHelpProfile("storefront")).toMatchObject({ audience: "customer", guidePath: "/ajuda/pedidos" });
  expect(getHelpProfile("admin")).toMatchObject({ audience: "management", guidePath: "/ajuda/gestao" });
  expect(getHelpProfile("totem")).toBeNull();
});

it("mantém o tutorial do cliente sem instruções de gestão", () => {
  expect(getHelpGuide("customer").sections.map(section => section.title)).toContain("Acompanhar o pedido");
  expect(getHelpGuide("customer").body).not.toMatch(/estoque|relatórios|equipe/i);
});
```

```tsx
it("mostra o guia do cliente e protege o guia de gestão", () => {
  render(<CustomerHelp />);
  expect(screen.getByRole("heading", { name: /como pedir na marmitas tb/i })).toBeTruthy();
  expect(screen.getByText(/marmita do dia/i)).toBeTruthy();

  render(<ManagementHelpContent role="user" />);
  expect(screen.getByText(/acesso restrito à equipe/i)).toBeTruthy();
});
```

- [ ] **Step 2: Executar as regressões antes da implementação.**

Run: `pnpm vitest run shared/helpContent.test.ts client/src/pages/HelpPages.test.tsx`

Expected: FAIL porque ainda não há conteúdo canônico nem rotas de ajuda.

- [ ] **Step 3: Definir a fonte canônica e renderizar os guias.**

```ts
export type HelpAudience = "customer" | "management";
export type HelpSurface = "storefront" | "tracking" | "admin" | "operations" | "counter" | "kitchen" | "inventory" | "totem" | "calls";

export type HelpGuideSection = { title: string; body: string; steps: string[] };
export type HelpProfile = { audience: HelpAudience; title: string; guidePath: string; prompts: string[] };

export function getHelpProfile(surface: HelpSurface): HelpProfile | null {
  if (surface === "storefront" || surface === "tracking") return customerProfile;
  if (surface === "totem" || surface === "calls") return null;
  return managementProfile;
}
```

O guia de cliente deve cobrir vitrine, marmita do dia, catálogo, personalização, sacola, entrega/retirada, finalização, acompanhamento e suporte. O guia de gestão deve cobrir acesso/logout, dashboard, pedidos, cardápio, equipe, financeiro, relatórios, configurações, fila, PDV, cozinha, estoque e chamadas, citando os limites reais de Asaas, SMTP, estoque e reimpressão. `HelpGuidePage` deve apresentar título, resumo, sumário com âncoras, seções numeradas, passos ordenados e uma ação de retorno apropriada.

Em `ManagementHelpContent`, usar a assinatura existente `role?: "user" | "staff" | "admin" | null` e envolver o conteúdo em `OperationsAccessGate`. Registrar `/ajuda/pedidos` e `/ajuda/gestao` em `App.tsx`; a página pública não deve exigir sessão.

- [ ] **Step 4: Executar as regressões das páginas e conteúdo.**

Run: `pnpm vitest run shared/helpContent.test.ts client/src/pages/HelpPages.test.tsx`

Expected: PASS.

### Task 2: Contrato seguro da operação de ajuda

**Files:**
- Create: `server/vercel/_lib/operations/help.ts`
- Test: `server/helpHttp.test.ts`
- Modify: `api/operations/[resource].ts:1-36`
- Modify: `server/operationsResourceHttp.test.ts:5-32`
- Create: `client/src/services/helpService.ts`
- Test: `client/src/services/helpService.test.ts`

- [ ] **Step 1: Escrever regressões de autorização, limites e dispatcher.**

```ts
it("usa somente o perfil cliente na ajuda pública", async () => {
  const ask = vi.fn().mockResolvedValue("Abra a sacola e revise o pedido.");
  const response = await createHelpHandler({ requireStaff, ask })(post("storefront", "Como finalizo?"));

  expect(response.status).toBe(200);
  expect(ask).toHaveBeenCalledWith(expect.objectContaining({ audience: "customer", question: "Como finalizo?" }));
});

it("exige sessão de equipe para ajuda de gestão e nunca aceita papel do cliente", async () => {
  const response = await createHelpHandler({ requireStaff: vi.fn().mockRejectedValue(new ApiAuthError(401, "Sessão necessária.")), ask })(post("admin", "Como vejo relatórios?"));

  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: "Sessão necessária." });
});

it("não registra um décimo segundo endpoint para ajuda", async () => {
  const handler = createOperationsResourceHandler({ ...factories, help: () => async () => json(200, { resource: "help" }) });
  await expect(handler(new Request("https://app.test/api/operations/help"))).resolves.toMatchObject({ status: 200 });
});
```

- [ ] **Step 2: Executar as regressões antes da implementação.**

Run: `pnpm vitest run server/helpHttp.test.ts server/operationsResourceHttp.test.ts client/src/services/helpService.test.ts`

Expected: FAIL porque `help` não é recurso do dispatcher e o contrato HTTP não existe.

- [ ] **Step 3: Implementar handler, serviço e proteção de conteúdo.**

```ts
const helpRequest = z.object({
  surface: z.enum(["storefront", "tracking", "admin", "operations", "counter", "kitchen", "inventory"]),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(600),
  })).min(1).max(8),
});

export type HelpDependencies = {
  requireStaff(request: Request): Promise<AuthenticatedProfile>;
  ask(input: { audience: HelpAudience; role: "staff" | "admin" | "customer"; surface: HelpSurface; question: string; history: HelpMessage[] }): Promise<string>;
};
```

`createHelpHandler` deve aceitar somente `POST`, obter `surface` validada, classificar `storefront` e `tracking` como públicas, chamar `requireStaff` para as demais e fixar `audience`/`role` exclusivamente no servidor. O campo `messages` não pode conter `system`, `tool` ou `function`, e a última mensagem deve ser de usuário. Antes de chamar o modelo, `assertSafeHelpContent` deve rejeitar e-mail, sequência de 11 dígitos de CPF, telefone brasileiro com 10 ou 11 dígitos e UUID; o retorno deve ser `400` com “Não envie dados pessoais ou identificadores de pedido pelo assistente.”

```ts
const result = await invokeLLM({
  model: "claude-haiku-4-5",
  maxTokens: 500,
  messages: [
    { role: "system", content: buildHelpSystemPrompt({ audience, role, surface }) },
    ...history,
    { role: "user", content: question },
  ],
});
```

`buildHelpSystemPrompt` deve exigir português brasileiro, resposta concisa, orientação por passos e recusa educada para pedidos de dados, credenciais, ações, pagamentos ou mudanças no sistema. A chamada não recebe ferramentas. O handler deve limitar a resposta visível a 1.200 caracteres e retornar `json(200, { answer })`; qualquer falha do modelo deve retornar `jsonError(503, "A ajuda está indisponível no momento. Consulte o tutorial desta página.")`.

Em `helpService`, usar `fetch("/api/operations/help", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) })`; a função deve validar `response.ok`, retornar `answer` e lançar `Error` com a mensagem pública do servidor. Atualizar `OperationResource` e `OperationHandlerFactories` com `help` e adicionar `createDefaultHelpHandler` à configuração padrão.

- [ ] **Step 4: Executar as regressões de contrato.**

Run: `pnpm vitest run server/helpHttp.test.ts server/operationsResourceHttp.test.ts client/src/services/helpService.test.ts && pnpm build:vercel-runtime`

Expected: PASS, com `help` consolidado e módulos runtime compilados.

### Task 3: Launcher contextual e conversa efêmera

**Files:**
- Create: `client/src/lib/helpRouting.ts`
- Test: `client/src/lib/helpRouting.test.ts`
- Create: `client/src/components/help/HelpAssistant.tsx`
- Test: `client/src/components/help/HelpAssistant.test.tsx`
- Modify: `client/src/App.tsx:20-66`

- [ ] **Step 1: Escrever as regressões de roteamento, abertura e falha recuperável.**

```ts
it.each([
  ["/", "storefront"],
  ["/acompanhar", "tracking"],
  ["/admin", "admin"],
  ["/operacao/estoque", "inventory"],
])("mapeia %s para ajuda %s", (path, surface) => {
  expect(getHelpSurface(path)).toBe(surface);
});

it.each(["/totem", "/chamadas", "/acesso"])('não mostra ajuda em %s', (path) => {
  expect(getHelpSurface(path)).toBeNull();
});
```

```tsx
it("abre o assistente de pedidos com tutorial e exibe falha recuperável", async () => {
  const ask = vi.fn().mockRejectedValue(new Error("A ajuda está indisponível no momento. Consulte o tutorial desta página."));
  render(<HelpAssistantContent surface="storefront" ask={ask} />);

  fireEvent.click(screen.getByRole("button", { name: /abrir assistente de pedidos/i }));
  expect(screen.getByRole("heading", { name: /assistente de pedidos/i })).toBeTruthy();
  expect(screen.getByRole("link", { name: /ver tutorial do cliente/i }).getAttribute("href")).toBe("/ajuda/pedidos");
  fireEvent.click(screen.getByRole("button", { name: /como finalizar meu pedido/i }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/indisponível/i);
});
```

- [ ] **Step 2: Executar as regressões antes da implementação.**

Run: `pnpm vitest run client/src/lib/helpRouting.test.ts client/src/components/help/HelpAssistant.test.tsx`

Expected: FAIL porque ainda não existe launcher nem roteamento contextual.

- [ ] **Step 3: Implementar a casca acessível em torno de `AIChatBox`.**

```tsx
export function HelpAssistant({ path }: { path: string }) {
  const surface = getHelpSurface(path);
  if (!surface) return null;
  return <HelpAssistantContent surface={surface} ask={helpService.ask} />;
}

export function HelpAssistantContent({ surface, ask }: HelpAssistantContentProps) {
  const profile = getHelpProfile(surface)!;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<HelpMessage[]>([]);
  // Abre Sheet, mostra prompts de profile.prompts e só acrescenta mensagens após resposta.
}
```

Usar `Sheet`, `SheetContent`, `SheetHeader` e `SheetTitle` existentes para o drawer. O launcher deve ser um botão fixo acima de `MobileCartBar`, com ícone `CircleHelp`, cores da marca, foco visível e `aria-label` contextual. `AIChatBox` recebe `messages`, `onSendMessage`, `isLoading`, placeholder em português, `height="100%"` e os prompts do perfil. O drawer precisa exibir o link “Ver tutorial do cliente” ou “Ver tutorial de gestão” mesmo antes de uma resposta; erros devem permanecer em `role="alert"` e não apagar a pergunta.

Em `App.tsx`, usar o `location` já obtido por `useLocation` e renderizar `<HelpAssistant path={location} />` depois de `<Router />`. O roteamento deve retornar `null` para totem, chamadas e acesso; para `/ajuda/pedidos` e `/ajuda/gestao`, manter o contexto correspondente.

- [ ] **Step 4: Executar as regressões do launcher.**

Run: `pnpm vitest run client/src/lib/helpRouting.test.ts client/src/components/help/HelpAssistant.test.tsx`

Expected: PASS, inclusive em erro de serviço.

### Task 4: Tutoriais editoriais e PDFs ilustrados

**Files:**
- Create: `docs/guias/tutorial-cliente-marmitas-tb.md`
- Create: `docs/guias/tutorial-gestor-marmitas-tb.md`
- Create: `docs/guias/tutorial-cliente-marmitas-tb.typ`
- Create: `docs/guias/tutorial-gestor-marmitas-tb.typ`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Produzir os dois guias editoriais coerentes com `shared/helpContent.ts`.**

O tutorial do cliente deve incluir abertura com a marmita do dia, passos de seleção e personalização, sacola, entrega/retirada, confirmação, acompanhamento e ajuda. O tutorial do gestor deve incluir matriz curta de permissões e instruções de dashboard, pedidos, cardápio, equipe, financeiro, relatórios, configurações, operação, PDV, cozinha, estoque e chamadas; deve diferenciar orientação de execução e declarar explicitamente as pendências de Asaas, SMTP e domínio.

- [ ] **Step 2: Capturar as telas necessárias sem gerar dados operacionais.**

Capturar `/` em desktop e móvel. Para telas internas, usar a sessão já autorizada somente se ela estiver disponível; se não estiver, usar ilustrações diagramáticas que não representem dados operacionais como reais. Salvar fontes em `/home/ubuntu/webdev-static-assets/marmitas-tb-tutoriais/`.

- [ ] **Step 3: Ler `typst-pdf-maker` e compor os PDFs.**

Usar os Markdown como base textual e Tipos para capa, sumário, capturas/diagramas, índice de passos e rodapé de versão. Gerar `tutorial-cliente-marmitas-tb.pdf` e `tutorial-gestor-marmitas-tb.pdf` em `/home/ubuntu/webdev-static-assets/marmitas-tb-tutoriais/`; revisar visualmente todas as páginas e disponibilizá-los por armazenamento estável do projeto, sem adicioná-los ao repositório.

- [ ] **Step 4: Atualizar `CLAUDE.md`.**

Registrar as rotas `/ajuda/pedidos` e `/ajuda/gestao`, a operação consolidada `/api/operations/help`, o uso server-side de `claude-haiku-4-5`, a conversa efêmera, os limites de conteúdo e a proibição de executar ações ou encaminhar dados sensíveis ao modelo.

### Task 5: Validação, documentação e checkpoint

**Files:**
- Modify: `todo.md`

- [ ] **Step 1: Executar a validação integral.**

Run: `pnpm test && pnpm check && pnpm build && pnpm build:vercel-runtime && git diff --check`

Expected: todas as regressões aprovadas, TypeScript sem erros, PWA e runtime Vercel compilados e nenhuma diferença inválida.

- [ ] **Step 2: Revisar as superfícies visuais.**

Capturar `/`, `/ajuda/pedidos`, `/acesso` e uma rota interna protegida em desktop e móvel. Confirmar que o launcher existe somente nas superfícies previstas, não cobre CTA/sacola e não aparece no totem ou em chamadas. Validar o estado autenticado do drawer por testes de DOM com dependência `ask` injetada.

- [ ] **Step 3: Marcar os itens concluídos e salvar checkpoint.**

```markdown
- [x] Criar um tutorial de pedido para clientes, alinhado à nova entrada de venda e às etapas reais de catálogo, sacola, checkout e acompanhamento.
- [x] Criar um tutorial de gestão para administradores, cobrindo acesso, painel, cardápio, equipe, financeiro, relatórios, operação, PDV, cozinha, estoque e limites externos.
- [x] Adaptar o assistente de IA existente para oferecer ajuda contextual por perfil, com respostas ancoradas nos fluxos documentados e sem executar ações operacionais, financeiras ou administrativas.
```

Salvar checkpoint descritivo com conteúdo entregue, operação consolidada, guardas de segurança, modelo, evidência dos PDFs, resultado da validação e a confirmação de que não houve push, publicação, mudança de banco, cobrança ou novo segredo.
