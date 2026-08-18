# Gestão de equipe e acessos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que administradores atribuam os papéis Sem acesso, Operação ou Administrador a usuários que já realizaram login.

**Architecture:** A evolução é limitada ao componente administrativo `StaffManager`. A consulta `admin.listStaff` e a mutação protegida `admin.upsertStaff` continuam sendo o contrato de dados; a interface apenas passa a expor os três valores já aceitos pelo servidor por meio de um seletor acessível, com estado de salvamento e erro local.

**Tech Stack:** React 19, TypeScript, tRPC 11, Tailwind CSS, componentes shadcn/ui, Vitest e Testing Library.

---

### Task 1: Especificar a interação do seletor de papel em teste

**Files:**
- Modify: `client/src/components/admin/admin.test.tsx:3-60`
- Test: `client/src/components/admin/admin.test.tsx`

- [ ] **Step 1: Escrever os testes que descrevem os três papéis e o envio da alteração**

```tsx
it.each([
  ["Sem acesso", "user"],
  ["Operação", "staff"],
  ["Administrador", "admin"],
] as const)("atribui %s ao usuário", (label, role) => {
  const onUpdateRole = vi.fn();
  render(<StaffManagerView members={[{ id: 7, name: "Joana", email: "joana@tb.local", role: "user", lastSignedIn: new Date() }]} onUpdateRole={onUpdateRole} />);

  fireEvent.change(screen.getByLabelText(/papel de joana/i), { target: { value: role } });
  expect(onUpdateRole).toHaveBeenCalledWith({ userId: 7, role });
});
```

- [ ] **Step 2: Executar o teste para confirmar a falha antes da implementação**

Run: `pnpm exec vitest run client/src/components/admin/admin.test.tsx`

Expected: FAIL porque a interface ainda não possui o campo rotulado `Papel de Joana`.

- [ ] **Step 3: Adicionar testes de estado pendente e de erro de salvamento**

```tsx
it("informa que a atualização de papel está em andamento", () => {
  render(<StaffManagerView members={[{ id: 7, name: "Joana", email: "joana@tb.local", role: "staff", lastSignedIn: new Date() }]} onUpdateRole={vi.fn()} pending />);

  expect(screen.getByText(/salvando acesso/i)).toBeTruthy();
  expect(screen.getByLabelText(/papel de joana/i)).toHaveProperty("disabled", true);
});

it("apresenta uma falha de atualização sem ocultar a equipe", () => {
  render(<StaffManagerView members={[{ id: 7, name: "Joana", email: "joana@tb.local", role: "staff", lastSignedIn: new Date() }]} onUpdateRole={vi.fn()} errorMessage="Não foi possível atualizar o acesso." />);

  expect(screen.getByRole("alert")).toHaveTextContent(/não foi possível atualizar o acesso/i);
  expect(screen.getByText("Joana")).toBeTruthy();
});
```

- [ ] **Step 4: Executar os testes ampliados para confirmar a falha esperada**

Run: `pnpm exec vitest run client/src/components/admin/admin.test.tsx`

Expected: FAIL até que `StaffManagerView` aceite `errorMessage`, exiba um alerta e ofereça o seletor de papel.

- [ ] **Step 5: Registrar a especificação de testes**

```bash
git add client/src/components/admin/admin.test.tsx
git commit -m "test: define atribuição de papéis da equipe"
```

### Task 2: Implementar o controle de papéis da equipe

**Files:**
- Modify: `client/src/components/admin/StaffManager.tsx:1-58`
- Test: `client/src/components/admin/admin.test.tsx`

- [ ] **Step 1: Ampliar o contrato de visualização para os três papéis**

```tsx
export function StaffManagerView({ members, onUpdateRole, pending = false, errorMessage }: {
  members: StaffMember[];
  onUpdateRole: (input: { userId: number; role: StaffMember["role"] }) => void;
  pending?: boolean;
  errorMessage?: string;
}) {
```

- [ ] **Step 2: Substituir as ações condicionais pelo seletor acessível**

```tsx
<label className="flex items-center gap-2 text-sm font-semibold text-[#481e1f]">
  <span className="sr-only">Papel de {member.name || "usuário sem nome"}</span>
  <select
    aria-label={`Papel de ${member.name || "usuário sem nome"}`}
    value={member.role}
    disabled={pending}
    onChange={(event) => onUpdateRole({ userId: member.id, role: event.target.value as StaffMember["role"] })}
    className="min-h-10 rounded-xl border border-[#d8c4a6] bg-white px-3 text-sm font-semibold text-[#481e1f] outline-none focus:ring-2 focus:ring-[#68703d]"
  >
    <option value="user">Sem acesso</option>
    <option value="staff">Operação</option>
    <option value="admin">Administrador</option>
  </select>
</label>
```

- [ ] **Step 3: Exibir feedback local de salvamento e erro**

```tsx
{pending && <p className="mt-3 text-sm font-medium text-[#68703d]">Salvando acesso…</p>}
{errorMessage && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{errorMessage}</p>}
```

- [ ] **Step 4: Encaminhar o erro da mutação e invalidar a lista ao concluir**

```tsx
const updateRole = trpc.admin.upsertStaff.useMutation({
  onSuccess: () => utils.admin.listStaff.invalidate(),
});

return <StaffManagerView
  members={(data ?? []) as StaffMember[]}
  pending={updateRole.isPending}
  errorMessage={updateRole.error?.message}
  onUpdateRole={(input) => updateRole.mutate(input)}
/>;
```

- [ ] **Step 5: Executar a especificação do componente**

Run: `pnpm exec vitest run client/src/components/admin/admin.test.tsx`

Expected: PASS com os testes de transição entre os três papéis, estado pendente e erro.

- [ ] **Step 6: Registrar a implementação do controle de acessos**

```bash
git add client/src/components/admin/StaffManager.tsx client/src/components/admin/admin.test.tsx
git commit -m "feat: simplifica atribuição de papéis da equipe"
```

### Task 3: Validar a integração administrativa

**Files:**
- Modify: `todo.md`
- Test: `client/src/components/admin/admin.test.tsx`

- [ ] **Step 1: Executar toda a suíte de testes**

Run: `pnpm test`

Expected: PASS sem regressões em permissões, cardápio, operação, pagamentos e gestão administrativa.

- [ ] **Step 2: Executar a checagem estática e o build de produção**

Run: `pnpm check && pnpm build`

Expected: comandos finalizam com código 0.

- [ ] **Step 3: Marcar a tarefa solicitada como concluída**

```markdown
- [x] Criar uma interface administrativa simples para cadastrar membros da equipe e atribuir os papéis de administrador ou operação.
```

- [ ] **Step 4: Criar o checkpoint validado**

```text
Descrição: Interface administrativa de equipe concluída com seletor de Sem acesso, Operação e Administrador, feedback de salvamento/erro e cobertura de testes.
```
