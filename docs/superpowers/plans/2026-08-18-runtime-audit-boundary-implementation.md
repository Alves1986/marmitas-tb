# Runtime Audit Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Status de execução em 18 de agosto de 2026:** tarefas 1 a 5 implementadas e validadas. A regressão completa aprovou 62 arquivos de teste, 179 testes e 2 pulados intencionalmente; TypeScript e build de produção também concluíram. Restam o checkpoint consolidado e a atualização da branch de migração.

**Goal:** Garantir que o runtime Vercel não consulte nem execute mutações tRPC/MySQL, gravando a autoria operacional e administrativa exclusivamente com UUIDs da sessão Supabase.

**Architecture:** O corte será reforçado na seleção existente de runtime, sem criar conversores entre IDs. Consultas legadas serão explicitamente desativadas no runtime Vercel; handlers de funções continuarão derivando a autoria de `requireStaff` ou `requireAdmin`, nunca do JSON enviado pelo navegador.

**Tech Stack:** React 19, TypeScript, tRPC 11, Vitest, Testing Library, Supabase Postgres, Vercel Functions.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade após a alteração |
|---|---|
| `client/src/components/operations/OrderQueue.tsx` | Desativar as duas consultas tRPC quando a fila estiver no runtime Vercel. |
| `client/src/components/operations/OrderQueue.vercel.test.tsx` | Provar que a fila Vercel não consulta o legado e usa UUIDs na impressão. |
| `client/src/pages/Operations.vercel.test.tsx` | Provar que o reconhecimento Vercel não chama `trpc.operations.acknowledge`. |
| `api/operations/orders.test.ts` | Provar que `actorUserId` do corpo é ignorado e o UUID da sessão é usado. |
| `api/operations/alerts.test.ts` | Provar que o reconhecimento usa apenas o UUID do guarda Supabase. |
| `api/admin/settings.test.ts` | Provar que atualizações administrativas recebem o UUID do administrador validado. |
| `docs/operacao/supabase-vercel-homologacao.md` | Registrar a fronteira de identidade e os requisitos de validação da prévia. |

### Task 1: Desativar leituras tRPC na fila quando Vercel estiver ativo

**Files:**
- Modify: `client/src/components/operations/OrderQueue.tsx:126-127`
- Test: `client/src/components/operations/OrderQueue.vercel.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

No mock de `trpc.operations`, exponha `list.useQuery` e `printJobs.useQuery` como spies. Renderize `OrderQueue` com `isVercelRuntime()` retornando `true` e afirme que ambos recebem `enabled: false`:

```ts
expect(legacyListQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({
  enabled: false,
  refetchInterval: false,
}));
expect(legacyPrintJobsQuery).toHaveBeenCalledWith(undefined, expect.objectContaining({
  enabled: false,
  refetchInterval: false,
}));
```

- [ ] **Step 2: Executar o teste para confirmar a falha**

Run: `pnpm vitest run client/src/components/operations/OrderQueue.vercel.test.tsx`

Expected: FAIL porque as opções atuais têm somente `refetchInterval: false` e o React Query ainda pode executar o carregamento inicial do legado.

- [ ] **Step 3: Implementar a alteração mínima**

Atualize as duas consultas legadas em `OrderQueue.tsx`:

```ts
const legacyDataQueryOptions = { enabled: !useVercelApi, refetchInterval: useVercelApi ? false : 10_000 };
const legacyPrintJobsQueryOptions = { enabled: !useVercelApi, refetchInterval: useVercelApi ? false : 10_000 };

const { data: legacyData, isLoading: legacyLoading, error: legacyError } =
  trpc.operations.list.useQuery(undefined, legacyDataQueryOptions);
const { data: legacyPrintJobs = [] } =
  trpc.operations.printJobs.useQuery(undefined, legacyPrintJobsQueryOptions);
```

Não condicione hooks React. As mutações tRPC podem continuar declaradas, pois somente são invocadas nos ramos `!useVercelApi`.

- [ ] **Step 4: Executar o teste para confirmar a aprovação**

Run: `pnpm vitest run client/src/components/operations/OrderQueue.vercel.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/operations/OrderQueue.tsx client/src/components/operations/OrderQueue.vercel.test.tsx
git commit -m "fix: disable legacy queue queries in vercel runtime"
```

### Task 2: Tornar executável o limite de mutação operacional já implementado

**Files:**
- Modify: `client/src/pages/Operations.vercel.test.tsx`
- Test: `client/src/pages/Operations.vercel.test.tsx`

- [ ] **Step 1: Escrever a regressão de mutação operacional**

No mock de `trpc.operations.acknowledge.useMutation`, retenha `legacyAcknowledgeMutate`. Faça `OrderAlert` disparar `onAcknowledge("18e59e53-81f3-494d-90b9-420dbe4a0892")`. Após resolver `vercelOperationsService.acknowledgeAlert`, afirme:

```ts
expect(vercelOperationsService.acknowledgeAlert).toHaveBeenCalledWith(
  "18e59e53-81f3-494d-90b9-420dbe4a0892",
);
expect(legacyAcknowledgeMutate).not.toHaveBeenCalled();
```

- [ ] **Step 2: Executar a regressão do limite operacional**

Run: `pnpm vitest run client/src/pages/Operations.vercel.test.tsx`

Expected: PASS. O callback atual já separa o caminho `!useVercelApi` do caminho Vercel; a nova asserção transforma essa regra em contrato executável.

- [ ] **Step 3: Preservar a implementação de seleção por runtime**

Em `Operations.tsx`, mantenha este limite explícito e não aceite `actorUserId` como argumento:

```ts
if (!useVercelApi) {
  acknowledge.mutate({ orderId: Number(orderId) });
  return;
}

void vercelOperationsService.acknowledgeAlert(orderId);
```

Não introduza um conversor de ID nem aceite `actorUserId` como argumento de `onAcknowledge`; o handler Vercel deriva a autoria no servidor.

- [ ] **Step 4: Executar o teste para confirmar a aprovação**

Run: `pnpm vitest run client/src/pages/Operations.vercel.test.tsx`

Expected: PASS; a chamada Vercel ocorre com UUID textual e a mutação tRPC não é executada.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Operations.tsx client/src/pages/Operations.vercel.test.tsx
git commit -m "test: enforce vercel operational mutation boundary"
```

### Task 3: Cobrir o limite Vercel dos gerenciadores administrativos

**Files:**
- Create: `client/src/components/admin/Admin.runtime.vercel.test.tsx`
- Test: `client/src/components/admin/Admin.runtime.vercel.test.tsx`

- [ ] **Step 1: Escrever regressões Vercel contra chamadas ao legado**

Mocke `isVercelRuntime` com `true`, `createVercelAdminService` com spies e as mutações tRPC com `mutateAsync`/`mutate` spies. Renderize `MenuManager`, `StaffManager` e `StoreSettingsForm` isoladamente. Após cada ação, afirme o contrato UUID e a ausência do legado:

```ts
expect(adminService.upsertCategory).toHaveBeenCalledWith(expect.objectContaining({
  id: "18e59e53-81f3-494d-90b9-420dbe4a0892",
}));
expect(legacySaveCategory).not.toHaveBeenCalled();

expect(adminService.setStaffRole).toHaveBeenCalledWith(
  "18e59e53-81f3-494d-90b9-420dbe4a0892",
  "staff",
);
expect(legacyUpdateStaff).not.toHaveBeenCalled();

expect(adminService.updateSettings).toHaveBeenCalledWith(expect.objectContaining({
  storeName: "Marmitas TB",
}));
expect(legacyUpdateSettings).not.toHaveBeenCalled();
```

- [ ] **Step 2: Executar os testes para verificar o contrato atual**

Run: `pnpm vitest run client/src/components/admin/Admin.runtime.vercel.test.tsx`

Expected: PASS. Os componentes já usam `enabled: !vercelRuntime` para leituras e os ramos Vercel chamam `adminService` com UUID textual; os testes passam a impedir regressão.

- [ ] **Step 3: Manter a seleção de runtime sem conversão cruzada**

Preserve, em cada gerenciador, a forma abaixo:

```ts
if (vercelRuntime) {
  return adminService.setStaffRole(String(input.userId), input.role === "user" ? "customer" : input.role);
}

return legacyUpdate.mutateAsync({ userId: Number(input.userId), role: legacyRole });
```

O ramo Vercel não pode chamar `Number`, e o ramo local não pode chamar o serviço Vercel.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/admin/Admin.runtime.vercel.test.tsx client/src/components/admin/MenuManager.tsx client/src/components/admin/StaffManager.tsx client/src/components/admin/StoreSettingsForm.tsx
git commit -m "test: enforce vercel admin runtime boundary"
```

### Task 4: Validar autoria UUID contra injeção pelo cliente

**Files:**
- Modify: `api/operations/orders.test.ts`
- Modify: `api/operations/alerts.test.ts`
- Modify: `api/admin/settings.test.ts`
- Test: os mesmos arquivos

- [ ] **Step 1: Escrever regressões contra injeção de autoria**

Em cada teste de handler, envie um JSON com um campo adicional malicioso `actorUserId: "00000000-0000-0000-0000-000000000000"`. Configure o guarda para devolver `id: "18e59e53-81f3-494d-90b9-420dbe4a0892"`. Afirme que as dependências recebem somente o UUID da sessão:

```ts
expect(transitionOrder).toHaveBeenCalledWith(expect.objectContaining({
  actorUserId: "18e59e53-81f3-494d-90b9-420dbe4a0892",
}));
expect(acknowledgeAlert).toHaveBeenCalledWith({
  orderId: "ea45ed58-5818-4de9-ab4e-e3f74a3e16df",
  actorUserId: "18e59e53-81f3-494d-90b9-420dbe4a0892",
});
expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({
  actorUserId: "18e59e53-81f3-494d-90b9-420dbe4a0892",
}));
```

- [ ] **Step 2: Executar os testes de regressão da autoria**

Run: `pnpm vitest run api/operations/orders.test.ts api/operations/alerts.test.ts api/admin/settings.test.ts`

Expected: PASS. Os handlers atuais usam schemas Zod sem `actorUserId` e substituem a autoria por `actor.id`; as novas asserções tornam essa garantia explícita.

- [ ] **Step 3: Preservar a derivação exclusiva da sessão**

Os handlers devem preservar o padrão abaixo e nunca propagar `input.actorUserId`:

```ts
const actor = await dependencies.requireStaff(request);
return dependencies.transitionOrder({
  ...input.data,
  actorUserId: actor.id,
});
```

Para configurações administrativas, use `requireAdmin` e passe `actor.id` à dependência de atualização. O Zod deve continuar definindo o schema de entrada sem `actorUserId`, descartando campos desconhecidos.

- [ ] **Step 4: Executar os testes para confirmar a aprovação**

Run: `pnpm vitest run api/operations/orders.test.ts api/operations/alerts.test.ts api/admin/settings.test.ts`

Expected: PASS, incluindo asserções de UUID da sessão.

- [ ] **Step 5: Commit**

```bash
git add api/operations/orders.test.ts api/operations/alerts.test.ts api/admin/settings.test.ts api/operations/orders.ts api/operations/alerts.ts api/admin/settings.ts
git commit -m "test: protect supabase audit actor from request input"
```

### Task 5: Documentar a fronteira e verificar a regressão completa

**Files:**
- Modify: `docs/operacao/supabase-vercel-homologacao.md`
- Modify: `todo.md`

- [ ] **Step 1: Registrar a fronteira operacional**

Inclua uma seção chamada `## Autoria de auditoria por runtime` com esta tabela:

```markdown
| Ambiente | Canal de mutação | Identidade persistida |
|---|---|---|
| Preview/Production Vercel | `/api` Vercel + Supabase | UUID de `profiles.id` derivado do Bearer token |
| Desenvolvimento local | tRPC + MySQL | Número de `users.id`, sem interoperabilidade com Supabase |
```

Explique que uma prévia só poderá ser aprovada quando as ferramentas de rede não mostrarem requisições a `/api/trpc` durante operações administrativas e operacionais Vercel.

- [ ] **Step 2: Executar regressão completa**

Run: `pnpm test && pnpm check && pnpm build`

Expected: todos os testes aprovados, TypeScript sem erros e build Vite concluído.

- [ ] **Step 3: Marcar tarefas concluídas**

Atualize em `todo.md` os itens:

```markdown
- [x] Projetar, testar e migrar a autoria de auditoria para UUIDs Supabase, mantendo IDs numéricos legados somente como referência histórica compatível.
- [x] Impedir por contrato que mutações administrativas e operacionais no runtime Vercel alcancem o tRPC/MySQL, usando apenas autoria UUID Supabase.
```

- [ ] **Step 4: Commit**

```bash
git add docs/operacao/supabase-vercel-homologacao.md todo.md
git commit -m "docs: record supabase audit runtime boundary"
```

### Task 6: Salvar checkpoint e atualizar a branch de migração

**Files:**
- No code changes.

- [ ] **Step 1: Salvar checkpoint após validação**

Use um checkpoint com a descrição: `Formaliza o corte de auditoria por runtime: consultas e mutações produtivas passam pelo Supabase/Vercel com UUID de sessão; o legado MySQL numérico segue isolado ao desenvolvimento local.`

- [ ] **Step 2: Atualizar o GitHub sem tocar na principal**

```bash
git push origin feat/supabase-vercel-migration
```

Expected: a branch de migração é atualizada; não há `push` para `main` e nenhum deployment é iniciado.
