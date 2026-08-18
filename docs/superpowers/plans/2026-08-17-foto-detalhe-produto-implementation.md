# Foto em destaque no detalhe do produto — Plano de implementação

> **Para agentes de implementação:** HABILIDADE SECUNDÁRIA OBRIGATÓRIA: use `executing-plans` para executar este plano tarefa por tarefa. Os passos usam caixas de seleção para acompanhamento.

**Objetivo:** Exibir a imagem real de um produto no topo da janela de personalização, sem alterar a inclusão na sacola nem o fluxo de opções.

**Arquitetura:** A mudança fica restrita ao `ProductConfigurator`, que já recebe o objeto `Product` com `imageUrl`. A imagem será renderizada condicionalmente no início do cabeçalho do diálogo; a suíte de fluxo por teclado validará tanto a imagem existente quanto a ausência de uma região vazia para itens sem imagem.

**Tecnologias:** React 19, TypeScript, Tailwind CSS 4, shadcn/ui Dialog, Vitest e Testing Library.

---

### Tarefa 1: Especificar a foto condicional no configurador

**Arquivos:**
- Modificar: `client/src/components/delivery/keyboard-flow.test.tsx:29-47`
- Testar: `client/src/components/delivery/keyboard-flow.test.tsx`

- [ ] **Passo 1: Escrever os testes que falham para produto com e sem imagem**

Adicione uma imagem ao fixture `configurableProduct` e inclua os dois testes abaixo dentro de `describe("fluxo acessível de pedido", ...)`:

```tsx
it("mostra a foto do produto no topo da configuração", () => {
  render(
    <OrderProvider>
      <ProductConfigurator product={configurableProduct} onOpenChange={vi.fn()} />
    </OrderProvider>,
  );

  const productImage = screen.getByRole("img", { name: /foto de marmita para teste/i });
  expect(productImage.getAttribute("src")).toBe("/manus-storage/marmita-teste.jpg");
});

it("não reserva uma área de imagem quando o produto não possui foto", () => {
  const productWithoutImage = { ...configurableProduct, imageUrl: undefined };
  render(
    <OrderProvider>
      <ProductConfigurator product={productWithoutImage} onOpenChange={vi.fn()} />
    </OrderProvider>,
  );

  expect(screen.queryByRole("img", { name: /foto de marmita para teste/i })).toBeNull();
});
```

Defina a propriedade no fixture:

```tsx
imageUrl: "/manus-storage/marmita-teste.jpg",
```

- [ ] **Passo 2: Executar a especificação para confirmar a falha**

Execute:

```bash
pnpm exec vitest run client/src/components/delivery/keyboard-flow.test.tsx
```

Resultado esperado: falha no teste `mostra a foto do produto no topo da configuração`, pois nenhum elemento `img` é renderizado atualmente.

### Tarefa 2: Renderizar a foto em destaque no cabeçalho

**Arquivos:**
- Modificar: `client/src/components/delivery/ProductConfigurator.tsx:59-63`
- Testar: `client/src/components/delivery/keyboard-flow.test.tsx`

- [ ] **Passo 1: Adicionar a renderização condicional antes do título**

No início de `DialogHeader`, antes do `div` que contém o rótulo `Personalize seu pedido`, insira:

```tsx
{product.imageUrl ? (
  <img
    src={product.imageUrl}
    alt={`Foto de ${product.name}`}
    className="h-48 w-full rounded-2xl object-cover sm:h-56"
  />
) : null}
```

Mantenha o bloco existente de título, preço e descrição imediatamente após a imagem. Não altere `handleAdd`, `choiceMap`, `selections`, o rodapé fixo nem os botões de opções.

- [ ] **Passo 2: Executar a especificação para confirmar aprovação**

Execute:

```bash
pnpm exec vitest run client/src/components/delivery/keyboard-flow.test.tsx
```

Resultado esperado: todos os testes do arquivo são aprovados, incluindo seleção por teclado, fechamento por Escape e os dois cenários de imagem.

### Tarefa 3: Validar responsividade e regressões

**Arquivos:**
- Modificar: `todo.md`
- Validar visualmente: rota `/` em 1280×720 e 375×812

- [ ] **Passo 1: Executar a validação completa**

Execute:

```bash
pnpm test && pnpm check && pnpm build
```

Resultado esperado: suíte, checagem de tipos e build de produção concluídos sem erro.

- [ ] **Passo 2: Revisar visualmente o configurador**

Abra a vitrine, selecione um produto com foto e confirme em desktop e celular que a imagem fica acima do título, o conteúdo permanece rolável e o botão `Adicionar` continua visível. Em seguida, confirme um produto sem foto para validar a ausência de espaço vazio.

- [ ] **Passo 3: Concluir o acompanhamento e salvar a versão**

Marque em `todo.md` como concluídos os itens abaixo:

```markdown
- [x] Exibir a foto do produto ao abrir sua configuração no cardápio.
- [x] Corrigir a comparação visual usada para aprovar o posicionamento da foto do produto.
```

Salve um checkpoint com uma descrição que mencione a foto em destaque e a validação do configurador.
