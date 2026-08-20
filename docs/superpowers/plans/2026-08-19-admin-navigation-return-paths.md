# Navegação administrativa e retornos operacionais Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer com que a administração tenha uma navegação lateral contextual com apenas um módulo visível por vez e fornecer retornos inequívocos para `/admin` nas telas operacionais.

**Architecture:** A barra lateral existente continuará sendo o ponto de navegação global. Quando a rota ativa for `/admin`, ela exibirá um grupo contextual de módulos administrativos que atualiza o fragmento da URL; `AdminView` escutará esse fragmento e renderizará somente o conteúdo do módulo selecionado. As telas de fila e despesas ganharão links diretos e independentes para a gestão, sem remover seus retornos operacionais e públicos atuais.

**Tech Stack:** React 19, TypeScript, Wouter, shadcn/ui Sidebar, Tailwind CSS 4, Vitest e Testing Library.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade depois da alteração |
|---|---|
| `client/src/components/DashboardLayout.tsx` | Exibir a navegação global e, exclusivamente em `/admin`, o grupo lateral de módulos administrativos. |
| `client/src/pages/Admin.tsx` | Resolver o módulo pelo hash, manter o foco/estado ativo e renderizar uma única área de conteúdo administrativo. |
| `client/src/pages/Operations.tsx` | Exibir os atalhos da fila: Gestão administrativa, Registrar despesa e Cardápio. |
| `client/src/pages/OperationsExpenses.tsx` | Exibir os atalhos: Gestão administrativa e Voltar para a fila. |
| `client/src/components/admin/admin.test.tsx` | Cobrir a seleção de módulo, itens do menu contextual e o isolamento do conteúdo. |
| `client/src/pages/Operations.vercel.test.tsx` | Cobrir o atalho da fila para `/admin`. |
| `client/src/pages/OperationsExpenses.vercel.test.tsx` | Novo arquivo para cobrir o atalho de despesas para `/admin`. |

### Task 1: Definir e cobrir o contrato de módulos administrativos

**Files:**
- Modify: `client/src/pages/Admin.tsx:27-37,137-170`
- Modify: `client/src/components/admin/admin.test.tsx`

- [ ] **Step 1: Escrever o teste que falha para a resolução de módulo pelo hash e conteúdo exclusivo.**

```tsx
import { AdminView, adminModuleDefinitions, moduleFromAdminHash } from "@/pages/Admin";

it("resolve o módulo de cardápio pelo hash e não mantém a visão geral visível", () => {
  expect(moduleFromAdminHash("#admin-catalog")).toBe("catalog");
  window.location.hash = "#admin-catalog";
  render(<AdminView actorRole="admin" />);

  expect(screen.getByRole("button", { name: "Cardápio" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("heading", { name: "Gerenciar cardápio" })).toBeInTheDocument();
  expect(screen.queryByText("Resumo financeiro do período")).not.toBeInTheDocument();
  expect(adminModuleDefinitions.map((item) => item.id)).toEqual([
    "overview", "finance", "reviews", "audit", "reports", "catalog", "team", "settings",
  ]);
});
```

- [ ] **Step 2: Executar o teste para registrar a falha inicial.**

Run: `pnpm vitest run client/src/components/admin/admin.test.tsx`

Expected: FAIL porque `moduleFromAdminHash` e `adminModuleDefinitions` ainda não existem e a página ainda renderiza todos os módulos.

- [ ] **Step 3: Criar o contrato estável de módulo e a resolução de hash.**

Em `client/src/pages/Admin.tsx`, substituir `adminModuleLinks` por uma definição tipada e exportar a função de resolução:

```tsx
export const adminModuleDefinitions = [
  { id: "overview", label: "Visão geral", hash: "#admin-overview" },
  { id: "finance", label: "Financeiro", hash: "#admin-finance" },
  { id: "reviews", label: "Revisões", hash: "#admin-reviews" },
  { id: "audit", label: "Auditoria", hash: "#admin-audit" },
  { id: "reports", label: "Relatórios", hash: "#admin-reports" },
  { id: "catalog", label: "Cardápio", hash: "#admin-catalog" },
  { id: "team", label: "Equipe", hash: "#admin-team" },
  { id: "settings", label: "Configurações", hash: "#admin-settings" },
] as const;

export type AdminModuleId = (typeof adminModuleDefinitions)[number]["id"];

export function moduleFromAdminHash(hash: string): AdminModuleId {
  return adminModuleDefinitions.find((item) => item.hash === hash)?.id ?? "overview";
}
```

Adicionar um estado inicializado com `moduleFromAdminHash(window.location.hash)`, um listener `hashchange` e um botão por módulo com `aria-current={activeModule === item.id ? "page" : undefined}`. Cada clique deve definir `window.location.hash = item.hash` para permitir links diretos, histórico do navegador e recuperação após atualização.

- [ ] **Step 4: Separar a renderização por módulo.**

Alterar `AdminFinanceDashboard` para receber `activeModule: Extract<AdminModuleId, "overview" | "finance" | "reviews" | "audit" | "reports">` e renderizar somente o bloco correspondente. Em `AdminView`, usar a seleção abaixo e não manter seções ocultas no DOM:

```tsx
const financialModule = activeModule === "overview" || activeModule === "finance" || activeModule === "reviews" || activeModule === "audit" || activeModule === "reports";

{financialModule ? <AdminFinanceDashboard activeModule={activeModule} /> : null}
{activeModule === "catalog" ? <MenuManager /> : null}
{activeModule === "team" ? <StaffManager /> : null}
{activeModule === "settings" ? <StoreSettingsForm /> : null}
```

- [ ] **Step 5: Executar o teste focal para confirmar a passagem.**

Run: `pnpm vitest run client/src/components/admin/admin.test.tsx`

Expected: PASS, com o cardápio renderizado isoladamente quando `#admin-catalog` estiver ativo.

- [ ] **Step 6: Commit lógico.**

```bash
git add client/src/pages/Admin.tsx client/src/components/admin/admin.test.tsx
git commit -m "feat: isolate admin modules by contextual navigation"
```

### Task 2: Reutilizar a barra lateral para os módulos de gestão

**Files:**
- Modify: `client/src/components/DashboardLayout.tsx:23-33,137-143,208-228`
- Modify: `client/src/components/admin/admin.test.tsx`

- [ ] **Step 1: Escrever o teste que falha para o grupo contextual no menu lateral.**

```tsx
it("expõe módulos de gestão na barra lateral quando a rota é /admin", () => {
  mockLocation("/admin");
  render(<DashboardLayout><div>Conteúdo administrativo</div></DashboardLayout>);

  expect(screen.getByRole("navigation", { name: "Módulos administrativos" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Cardápio" })).toHaveAttribute("href", "#admin-catalog");
  expect(screen.getByRole("link", { name: "Pedidos" })).toHaveAttribute("href", "/operacao");
});
```

- [ ] **Step 2: Executar a regressão para confirmar que a navegação contextual ainda não existe.**

Run: `pnpm vitest run client/src/components/admin/admin.test.tsx`

Expected: FAIL porque a barra lateral contém somente Administração, Fila operacional e Cardápio público.

- [ ] **Step 3: Implementar o grupo lateral contextual.**

Em `DashboardLayout.tsx`, exportar `adminSidebarItems`, mantendo os três itens de `dashboardMenuItems` inalterados. Usar itens com `href` para fragmentos e rota para pedidos:

```tsx
export const adminSidebarItems = [
  { label: "Visão geral", href: "#admin-overview", icon: LayoutDashboard },
  { label: "Pedidos", path: "/operacao", icon: ClipboardList },
  { label: "Financeiro", href: "#admin-finance", icon: CircleDollarSign },
  { label: "Revisões", href: "#admin-reviews", icon: ClipboardCheck },
  { label: "Auditoria", href: "#admin-audit", icon: BookOpenCheck },
  { label: "Relatórios", href: "#admin-reports", icon: ChartNoAxesCombined },
  { label: "Cardápio", href: "#admin-catalog", icon: BookOpen },
  { label: "Equipe", href: "#admin-team", icon: Users },
  { label: "Configurações", href: "#admin-settings", icon: Settings },
] as const;
```

Quando `location === "/admin"`, renderizar um `nav` com `aria-label="Módulos administrativos"` abaixo da navegação global. Itens com `href` devem ser `<a href={item.href}>`; o item Pedidos deve manter `setLocation("/operacao")`. Não duplicar o seletor de módulos dentro de `AdminView`: removê-lo depois que a barra lateral estiver operante.

- [ ] **Step 4: Garantir comportamento móvel.**

Manter `SidebarTrigger` existente no cabeçalho móvel. O grupo contextual deve usar os mesmos `SidebarMenuButton` e tooltips da barra global, para abrir no drawer móvel sem criar uma faixa horizontal adicional.

- [ ] **Step 5: Executar os testes de navegação.**

Run: `pnpm vitest run client/src/components/admin/admin.test.tsx`

Expected: PASS, incluindo o novo `nav` contextual na rota `/admin` e ausência dele em `/operacao`.

- [ ] **Step 6: Commit lógico.**

```bash
git add client/src/components/DashboardLayout.tsx client/src/pages/Admin.tsx client/src/components/admin/admin.test.tsx
git commit -m "feat: add contextual admin sidebar navigation"
```

### Task 3: Corrigir retornos da fila e do formulário de despesas

**Files:**
- Modify: `client/src/pages/Operations.tsx:99-121`
- Modify: `client/src/pages/OperationsExpenses.tsx:52-67`
- Modify: `client/src/pages/Operations.vercel.test.tsx`
- Create: `client/src/pages/OperationsExpenses.vercel.test.tsx`

- [ ] **Step 1: Escrever a regressão de retorno da fila.**

Adicionar ao teste de `Operations`:

```tsx
expect(screen.getByRole("link", { name: /gestão administrativa/i })).toHaveAttribute("href", "/admin");
expect(screen.getByRole("link", { name: /registrar despesa/i })).toHaveAttribute("href", "/operacao/despesas");
expect(screen.getByRole("link", { name: /^cardápio$/i })).toHaveAttribute("href", "/");
```

No novo `OperationsExpenses.vercel.test.tsx`, mockar o serviço administrativo no mesmo padrão de `Operations.vercel.test.tsx` e cobrir:

```tsx
render(<OperationsExpenses />);
expect(screen.getByRole("link", { name: /gestão administrativa/i })).toHaveAttribute("href", "/admin");
expect(screen.getByRole("link", { name: /voltar para a fila/i })).toHaveAttribute("href", "/operacao");
```

- [ ] **Step 2: Executar as duas regressões e confirmar falha inicial.**

Run: `pnpm vitest run client/src/pages/Operations.vercel.test.tsx client/src/pages/OperationsExpenses.vercel.test.tsx`

Expected: FAIL porque os links de gestão não existem nas duas páginas.

- [ ] **Step 3: Inserir os dois retornos explícitos.**

Em `Operations.tsx`, inserir antes de Registrar despesa:

```tsx
<Link href="/admin">
  <Button type="button" variant="outline" className="min-h-10 gap-2">
    <LayoutDashboard className="h-4 w-4" /> Gestão administrativa
  </Button>
</Link>
```

Em `OperationsExpenses.tsx`, inserir antes de Voltar para a fila o mesmo link para `/admin`. Manter os botões existentes e a ordem aprovada: gestão, ação contextual e saída pública na fila; gestão e fila na tela de despesas.

- [ ] **Step 4: Executar as regressões e confirmar passagem.**

Run: `pnpm vitest run client/src/pages/Operations.vercel.test.tsx client/src/pages/OperationsExpenses.vercel.test.tsx`

Expected: PASS, com todos os destinos preservados.

- [ ] **Step 5: Commit lógico.**

```bash
git add client/src/pages/Operations.tsx client/src/pages/OperationsExpenses.tsx client/src/pages/Operations.vercel.test.tsx client/src/pages/OperationsExpenses.vercel.test.tsx
git commit -m "fix: add admin return paths to operations"
```

### Task 4: Verificação integrada da navegação

**Files:**
- Modify: `todo.md`
- Modify: `docs/homologacao-producao-2026-08-19.md`

- [ ] **Step 1: Executar validações estáticas e de interface.**

Run: `pnpm test && pnpm check && pnpm build && pnpm build:vercel-runtime`

Expected: suíte completa aprovada, TypeScript sem erros e dois builds concluídos.

- [ ] **Step 2: Capturar evidência desktop e móvel.**

Abrir `/admin`, selecionar Cardápio, Financeiro e Pedidos; abrir `/operacao` e `/operacao/despesas`. Confirmar que apenas o módulo selecionado permanece no conteúdo, que os dois novos atalhos são legíveis e que a barra lateral se abre pelo trigger em largura móvel.

- [ ] **Step 3: Atualizar documentação e tarefas.**

Marcar como concluídas em `todo.md` as tarefas de menu lateral e retornos administrativos. No relatório de homologação, registrar os destinos, comportamento por hash e a evidência desktop/móvel.

- [ ] **Step 4: Salvar checkpoint.**

```bash
# Use o checkpoint da plataforma após confirmar o todo.md.
```

