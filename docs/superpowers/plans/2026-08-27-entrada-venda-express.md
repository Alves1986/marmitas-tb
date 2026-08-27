# Entrada de venda express Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a rota pública `/` em uma abertura de venda express da Marmitas TB, com marca, marmita do dia e início claro do pedido no catálogo real.

**Architecture:** A mudança é deliberadamente visual e local à vitrine pública. `Hero` continua sendo o ponto de destaque da oferta, `StoreHeader` conserva logo e sacola, e `Home` reduz a distância entre a abertura e `ProductCatalog`; nenhum contrato de pedido, dado de catálogo, endpoint ou rota interna é alterado.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Wouter, Vitest e Testing Library.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `client/src/components/delivery/Hero.tsx` | Apresentar a marmita do dia, a mensagem de venda e as ações para abrir o catálogo real. |
| `client/src/components/delivery/Hero.test.tsx` | Cobrir título, imagem descritiva e CTA principal apontando ao catálogo. |
| `client/src/components/delivery/StoreHeader.tsx` | Exibir somente marca, acompanhamento público e sacola no cabeçalho da vitrine. |
| `client/src/components/delivery/StoreHeader.test.tsx` | Confirmar a navegação enxuta e preservar a abertura da sacola. |
| `client/src/pages/Home.tsx` | Colocar o catálogo imediatamente após a abertura de venda e conservar rodapé, sacola e checkout existentes. |
| `client/src/pages/Home.test.tsx` | Verificar a composição de venda sem renderizar informações institucionais antes do catálogo. |
| `todo.md` | Registrar a conclusão do incremento após a validação integral. |

### Task 1: Hero da marmita do dia

**Files:**
- Modify: `client/src/components/delivery/Hero.tsx:1-64`
- Create: `client/src/components/delivery/Hero.test.tsx`

- [x] **Step 1: Escrever a regressão de venda express.**

```tsx
it("destaca a marmita do dia e leva ao catálogo real", () => {
  render(<Hero />);

  expect(screen.getByRole("heading", { name: /marmita do dia/i })).toBeInTheDocument();
  expect(screen.getByRole("img", { name: /carne de panela com purê de batata/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /realizar pedido/i })).toHaveAttribute("href", "#cardapio");
});
```

- [x] **Step 2: Executar a regressão para confirmar a ausência da nova hierarquia.**

Run: `pnpm vitest run client/src/components/delivery/Hero.test.tsx`

Expected: FAIL porque o hero ainda usa “Seu almoço com gosto de casa” como título e “Ver cardápio” como CTA.

- [x] **Step 3: Aplicar a implementação mínima no hero.**

```tsx
<p className="...">Marmita do dia</p>
<h1 className="...">Almoço caseiro, pronto para o seu pedido.</h1>
<p className="...">Escolha a marmita de hoje, personalize e receba no seu ritmo.</p>
<a href="#cardapio" className="...">
  Realizar pedido <ArrowDown className="size-4" />
</a>
<a href="#cardapio" className="...">Ver cardápio completo</a>
```

Manter a foto `catalogAsset("carne-panela.jpg")`, o texto alternativo descritivo e a informação de retirada ou entrega. Remover o botão de rolagem JavaScript se ele se tornar desnecessário; os dois links devem usar o destino semântico `#cardapio`.

- [x] **Step 4: Executar a regressão do hero.**

Run: `pnpm vitest run client/src/components/delivery/Hero.test.tsx`

Expected: PASS com o título, a imagem e o CTA apontando para o catálogo.

### Task 2: Cabeçalho de compra e composição enxuta da vitrine

**Files:**
- Modify: `client/src/components/delivery/StoreHeader.tsx:1-50`
- Create: `client/src/components/delivery/StoreHeader.test.tsx`
- Modify: `client/src/pages/Home.tsx:1-30`
- Create: `client/src/pages/Home.test.tsx`

- [x] **Step 1: Escrever regressões para o cabeçalho de compra e o catálogo próximo ao hero.**

```tsx
it("mantém somente o acompanhamento público e a sacola na navegação principal", () => {
  renderWithOrderContext(<StoreHeader />);

  expect(screen.getByRole("link", { name: /acompanhar pedido/i })).toHaveAttribute("href", "/acompanhar");
  expect(screen.queryByRole("button", { name: "Informações" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /abrir sacola com 0 itens/i })).toBeInTheDocument();
});

it("apresenta o catálogo logo depois da abertura de venda", () => {
  render(<Home />);

  expect(screen.getByRole("main").querySelector("#cardapio")).toBeTruthy();
  expect(screen.queryByText(/tudo para facilitar seu pedido/i)).not.toBeInTheDocument();
});
```

- [x] **Step 2: Executar as regressões antes da mudança.**

Run: `pnpm vitest run client/src/components/delivery/StoreHeader.test.tsx client/src/pages/Home.test.tsx`

Expected: FAIL porque o cabeçalho ainda apresenta Cardápio, Informações e Contato; `Home` ainda renderiza `StoreInfo` antes do catálogo.

- [x] **Step 3: Simplificar o cabeçalho e encurtar a chegada ao catálogo.**

```tsx
<nav className="hidden items-center gap-5 ..." aria-label="Navegação principal">
  <a href="/acompanhar" className="transition-colors hover:text-[#a82926]">Acompanhar pedido</a>
</nav>
```

Em `Home.tsx`, remover a importação e o uso de `StoreInfo`, mantendo a ordem `Hero`, `ProductCatalog`, rodapé, `CartPanel` e `MobileCartBar`. Não remover a barra de sacola mobile, não alterar o checkout e não incluir atalhos para rotas internas.

- [x] **Step 4: Executar as regressões de composição.**

Run: `pnpm vitest run client/src/components/delivery/StoreHeader.test.tsx client/src/pages/Home.test.tsx`

Expected: PASS, com acompanhamento público, sacola e catálogo preservados.

### Task 3: Validação final e registro

**Files:**
- Modify: `todo.md`

- [x] **Step 1: Validar a suíte e a produção local.**

Run: `pnpm test && pnpm check && pnpm build && pnpm build:vercel-runtime && git diff --check`

Expected: todos os testes aprovados, TypeScript sem erros, builds concluídos e nenhuma diferença inválida.

- [x] **Step 2: Revisar a rota pública visualmente.**

Run: capturar `/` em 1280×720 e 375×812.

Expected: logo, marmita do dia e CTA “Realizar pedido” acima da dobra; nenhuma sobreposição com a sacola mobile; nenhuma rota interna exposta.

- [ ] **Step 3: Atualizar o backlog e salvar checkpoint.**

```markdown
- [x] Reposicionar a entrada pública como aplicativo de venda, com identidade Marmitas TB, destaque para a marmita do dia e acesso principal para realizar pedido, preservando as áreas internas protegidas.
```

Salvar um checkpoint descritivo que registre a mudança visual, os componentes preservados, as evidências de validação e a ausência de publicação Vercel ou envio ao GitHub.
