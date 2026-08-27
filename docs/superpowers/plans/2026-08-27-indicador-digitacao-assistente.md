# Indicador de digitação do assistente Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir um indicador acessível de digitação enquanto o assistente de IA prepara sua resposta, sem alterar o contrato de ajuda.

**Architecture:** `AIChatBox` já recebe `isLoading` do launcher. A alteração restringe-se à mensagem visual produzida nesse estado: uma bolha de assistente com três pontos decorativos e texto status. Nenhuma rota, estado de conversa, chamada HTTP ou regra de segurança será modificada.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vitest e happy-dom.

> **Registro de execução — 27/08/2026:** a regressão falhou como esperado sem o estado acessível e passou após a implementação. O indicador renderiza três bolhas decorativas e “Preparando orientação…” sob `role="status"`, reaproveitando `isLoading`; sua animação atua somente sobre opacidade e transform, sendo desativada para redução de movimento. A validação integral concluiu com 383 testes aprovados e 2 pulados, tipagem, build PWA, runtime Vercel e `git diff --check` aprovados. O checkpoint é a única etapa restante deste plano.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `client/src/components/AIChatBox.tsx` | Renderiza a bolha de digitação quando `isLoading` estiver ativo. |
| `client/src/components/AIChatBox.test.tsx` | Confirma a presença, o rótulo acessível e a remoção do estado de digitação. |
| `client/src/index.css` | Fornece a animação limitada a opacidade/transform e o fallback de redução de movimento. |
| `todo.md` | Marca a melhoria concluída após a validação. |

### Task 1: Estado de digitação acessível

**Files:**
- Modify: `client/src/components/AIChatBox.tsx:283-299`
- Create: `client/src/components/AIChatBox.test.tsx`
- Modify: `client/src/index.css`

- [ ] **Step 1: Escrever a regressão de carregamento.**

```tsx
it("mostra o indicador de digitação acessível somente durante o carregamento", () => {
  const { rerender } = render(<AIChatBox messages={[]} onSendMessage={() => undefined} isLoading />);
  expect(screen.getByRole("status")).toHaveTextContent("Preparando orientação");
  expect(screen.getByLabelText("Assistente está preparando uma resposta")).toBeTruthy();

  rerender(<AIChatBox messages={[]} onSendMessage={() => undefined} isLoading={false} />);
  expect(screen.queryByRole("status")).toBeNull();
});
```

- [ ] **Step 2: Executar a regressão antes da implementação.**

Run: `pnpm vitest run client/src/components/AIChatBox.test.tsx`

Expected: FAIL porque o carregamento atual usa somente um ícone giratório sem o rótulo e as bolhas aprovadas.

- [ ] **Step 3: Renderizar a bolha aprovada e a animação segura.**

```tsx
{isLoading && (
  <div className="flex items-start gap-3" role="status" aria-live="polite" aria-label="Assistente está preparando uma resposta">
    <div className="size-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center"><Sparkles className="size-4 text-primary" aria-hidden="true" /></div>
    <div className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
      <span className="typing-dots" aria-hidden="true"><i /><i /><i /></span>
      <span className="ml-2">Preparando orientação…</span>
    </div>
  </div>
)}
```

```css
.typing-dots i { animation: typing-dot 900ms ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .typing-dots i { animation: none; } }
```

- [ ] **Step 4: Executar a regressão e validar a tipagem.**

Run: `pnpm vitest run client/src/components/AIChatBox.test.tsx && pnpm check`

Expected: PASS sem erros TypeScript.

### Task 2: Validação e checkpoint

**Files:**
- Modify: `todo.md`

- [ ] **Step 1: Revisar o drawer de ajuda visualmente.**

Capturar a vitrine e abrir o assistente com uma dependência de ajuda lenta injetada em teste; confirmar que o indicador é visível, não cobre a caixa de texto e respeita a identidade visual.

- [ ] **Step 2: Executar a validação integral.**

Run: `pnpm test && pnpm check && pnpm build && pnpm build:vercel-runtime && git diff --check`

Expected: testes, tipagem, build PWA, runtime Vercel e diferenças válidas.

- [ ] **Step 3: Marcar a melhoria e salvar checkpoint.**

```markdown
- [x] Exibir no assistente de IA um indicador acessível de digitação enquanto a resposta está sendo preparada, sem alterar o contrato ou a segurança da ajuda.
```

O checkpoint deve registrar o indicador, a acessibilidade, a redução de movimento, a validação e a ausência de publicação, envio ao GitHub, alteração de banco, segredo ou integração externa.
