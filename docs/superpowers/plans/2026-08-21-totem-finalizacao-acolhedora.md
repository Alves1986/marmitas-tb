# Totem Marmitas TB — Finalização acolhedora Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar uma tela final acolhedora, manter explícita a proteção por 90 segundos de inatividade e disponibilizar um encerramento manual seguro no totem.

**Architecture:** A jornada continua local dentro de `Totem.tsx`. O temporizador existente permanece como a única fonte de retorno automático; a interface passa a comunicar a regra no início da jornada. A tela `ReceiptStep` receberá conteúdo de sucesso, um indicador animado controlado por CSS e dois caminhos idênticos de limpeza de estado: novo pedido e encerramento manual.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vitest, Testing Library e CSS global.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `client/src/pages/Totem.tsx` | Exibir a orientação de inatividade, a mensagem de sucesso e o botão de encerramento manual. |
| `client/src/pages/Totem.test.tsx` | Provar o texto de sucesso, a limpeza manual e o retorno automático. |
| `client/src/index.css` | Aplicar movimento de sucesso curto e respeitar `prefers-reduced-motion`. |
| `docs/superpowers/plans/2026-08-21-totem-pedidos-rapidos.md` | Registrar a decisão e as validações da evolução. |
| `todo.md` | Marcar os requisitos aprovados assim que cada comportamento estiver validado. |

## Task 1: Definir as regressões da jornada final

**Files:**
- Modify: `client/src/pages/Totem.test.tsx:96-145`

- [x] **Step 1: Escrever o teste que falha para a confirmação acolhedora**

```tsx
expect(screen.getByText(/obrigado/i)).toBeTruthy();
expect(screen.getByText(/seu almoço está sendo preparado com carinho/i)).toBeTruthy();
expect(screen.getByTestId("totem-success-indicator")).toBeTruthy();
```

- [x] **Step 2: Executar o teste e verificar a falha**

Run: `pnpm vitest run client/src/pages/Totem.test.tsx`  
Expected: FAIL porque a tela de retirada ainda não contém “Obrigado!” nem `totem-success-indicator`.

- [x] **Step 3: Escrever o teste que falha para o encerramento manual**

```tsx
fireEvent.click(screen.getByRole("button", { name: /encerrar atendimento/i }));
expect(screen.getByRole("heading", { name: /escolha uma opção/i })).toBeTruthy();
expect(screen.queryByText(/sua senha é/i)).toBeNull();
```

- [x] **Step 4: Executar o teste e verificar a falha**

Run: `pnpm vitest run client/src/pages/Totem.test.tsx`  
Expected: FAIL porque o botão “Encerrar atendimento” ainda não existe.

- [x] **Step 5: Escrever a regressão para a comunicação da regra de inatividade**

```tsx
render(<Totem />);
expect(screen.getByText(/90 segundos sem interação/i)).toBeTruthy();
```

- [x] **Step 6: Executar o teste e verificar a falha**

Run: `pnpm vitest run client/src/pages/Totem.test.tsx`  
Expected: FAIL porque a orientação ainda não aparece na tela inicial.

## Task 2: Implementar a confirmação acolhedora e o encerramento seguro

**Files:**
- Modify: `client/src/pages/Totem.tsx:106-115`

- [x] **Step 1: Mostrar a regra de inatividade no início da jornada**

```tsx
<p className="mt-4 text-sm font-semibold text-[#68703d]">
  Para sua privacidade, o atendimento reinicia após 90 segundos sem interação.
</p>
```

- [x] **Step 2: Inserir o indicador e a mensagem de sucesso na retirada**

```tsx
<div data-testid="totem-success-indicator" className="totem-success-indicator mx-auto grid size-16 place-items-center rounded-full bg-[#e9efd4] text-[#68703d]" aria-hidden="true">
  <CheckCircle2 className="size-10" />
</div>
<h1 className="mt-3 font-display text-4xl">Obrigado!</h1>
<p className="mt-3 text-base text-[#765f50]">Seu almoço está sendo preparado com carinho.</p>
```

- [x] **Step 3: Adicionar o botão de encerramento manual na retirada**

```tsx
<button type="button" onClick={onFinish} className="mt-3 flex min-h-12 w-full items-center justify-center rounded-2xl border border-[#d7bea0] bg-white text-sm font-extrabold text-[#765f50]">
  Encerrar atendimento
</button>
```

- [x] **Step 4: Executar as regressões da página**

Run: `pnpm vitest run client/src/pages/Totem.test.tsx`  
Expected: PASS com a confirmação acolhedora, o encerramento manual e o retorno por inatividade cobertos.

## Task 3: Aplicar movimento seguro para pessoas sensíveis a animação

**Files:**
- Modify: `client/src/index.css`

- [x] **Step 1: Adicionar a animação curta do indicador de sucesso**

```css
@media (prefers-reduced-motion: no-preference) {
  .totem-success-indicator {
    animation: totem-success-pop 360ms cubic-bezier(0.23, 1, 0.32, 1) both;
  }
}

@keyframes totem-success-pop {
  from { opacity: 0; transform: scale(.88); }
  to { opacity: 1; transform: scale(1); }
}
```

- [x] **Step 2: Verificar a preferência de redução de movimento**

Run: `pnpm test`  
Expected: PASS; a classe existe no componente, mas nenhuma animação é aplicada sem `no-preference`.

## Task 4: Validar o fluxo e documentar a decisão

**Files:**
- Modify: `docs/superpowers/plans/2026-08-21-totem-pedidos-rapidos.md`
- Modify: `todo.md`

- [x] **Step 1: Percorrer visualmente o fluxo vertical**

Run: abrir `/totem` em viewport `768×1024`, escolher categoria, marmita, bebida, pular sobremesa, confirmar cartão e observar a retirada.  
Expected: senha legível, mensagem acolhedora, indicador visual, três ações de saída e sem sobreposição do rodapé.

- [x] **Step 2: Registrar a evidência no plano técnico**

```markdown
A confirmação demonstrativa passou a exibir “Obrigado!” e a mensagem de preparo, mantendo a senha de retirada como prioridade. O botão “Encerrar atendimento” limpa o estado local e abre a tela de opções; o temporizador de 90 segundos continua cobrindo abandono sem interação.
```

- [x] **Step 3: Concluir o backlog relacionado**

```markdown
- [x] Confirmar e tornar explícito o retorno automático à tela inicial após 90 segundos sem interação no totem.
- [x] Criar uma confirmação de pedido mais atrativa, com mensagem de agradecimento e animação acessível de sucesso.
- [x] Cobrir em regressão o retorno por inatividade e a nova confirmação de sucesso do totem.
- [x] Adicionar uma ação manual de encerrar atendimento que limpe o estado local e retorne o totem à tela inicial em qualquer etapa aplicável.
```

- [x] **Step 4: Executar a validação final**

Run: `pnpm test && pnpm check && git diff --check`  
Expected: todos os testes aprovados, TypeScript sem erros e nenhum erro de espaço no diff.

- [ ] **Step 5: Salvar checkpoint de revisão**

Use um checkpoint com a descrição da confirmação acolhedora, inatividade de 90 segundos, encerramento manual e validações executadas. A publicação continua manual pelo responsável.
