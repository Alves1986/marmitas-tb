# Marmitas TB Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar um aplicativo web de cardápio e pedidos para a Marmitas TB, responsivo, em português brasileiro, com checkout local completo e integração futura desacoplada.

**Architecture:** O cliente React terá dados estáticos tipados para o catálogo, estado global persistido em `localStorage` para carrinho e checkout, componentes de interface focados em descoberta e conversão, e uma camada de domínio para cálculos. O envio de pedido passará por uma interface de serviço, inicialmente atendida por um adaptador local; a interface visual jamais dependerá de um canal externo específico.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui, React Hook Form, Zod, Vitest e Lucide.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `shared/order.ts` | Tipos de catálogo, carrinho, checkout e contrato de pedido. |
| `client/src/data/catalog.ts` | Categorias, produtos, promoções e configurações do cardápio inicial. |
| `client/src/lib/order.ts` | Cálculos, formatação BRL, validação de linha e persistência local. |
| `client/src/lib/order.test.ts` | Testes dos cálculos e regras puras do pedido. |
| `client/src/services/orderService.ts` | Interface e adaptador local de confirmação de pedido. |
| `client/src/services/orderService.test.ts` | Testes do adaptador e geração de pedido local. |
| `client/src/contexts/OrderContext.tsx` | Estado persistente, ações de carrinho e transição de checkout. |
| `client/src/components/delivery/*` | Header, hero, catálogo, card, configurador, carrinho, checkout e confirmação. |
| `client/src/pages/Home.tsx` | Composição pública da experiência de pedido. |
| `client/src/index.css` | Tokens de creme, vermelho e verde, tipografia, superfícies e responsividade. |
| `client/src/App.tsx` | Providers globais e rota principal. |

### Task 1: Fundamentos de domínio e catálogo

**Files:**
- Create: `shared/order.ts`
- Create: `client/src/data/catalog.ts`
- Create: `client/src/lib/order.ts`
- Create: `client/src/lib/order.test.ts`

- [ ] **Step 1: Criar tipos explícitos.** Definir `Product`, `ProductOptionGroup`, `CartItem`, `DeliveryMode`, `CheckoutDraft`, `OrderPayload`, `OrderConfirmation` e os literais de pagamento; não usar `any`.
- [ ] **Step 2: Escrever o teste de cálculos.** Cobrir subtotal, desconto, taxa para entrega, taxa zero para retirada e formatação `pt-BR`.
- [ ] **Step 3: Implementar funções puras.** Criar `calculateCartSummary`, `formatCurrency`, `createCartItemKey` e `sanitizePersistedCart` em `client/src/lib/order.ts`.
- [ ] **Step 4: Criar catálogo editorial.** Representar as oito categorias solicitadas, produtos de referência, promoções com `originalPrice` e produtos configuráveis com tamanho, embalagem e acompanhamento.
- [ ] **Step 5: Executar o teste.** Rodar `pnpm test -- client/src/lib/order.test.ts` e corrigir qualquer falha.

### Task 2: Estado de pedido e adaptador desacoplado

**Files:**
- Create: `client/src/contexts/OrderContext.tsx`
- Create: `client/src/services/orderService.ts`
- Create: `client/src/services/orderService.test.ts`
- Modify: `client/src/main.tsx`

- [ ] **Step 1: Escrever testes do adaptador.** Verificar que uma confirmação local recebe payload padronizado, cria identificador legível e informa estimativa compatível com a modalidade.
- [ ] **Step 2: Implementar `OrderService`.** Expor `submit(payload: OrderPayload): Promise<OrderConfirmation>` e uma instância `localOrderService` sem chamar APIs externas.
- [ ] **Step 3: Criar contexto persistente.** Carregar apenas dados válidos de `localStorage`, expor ações `addItem`, `updateQuantity`, `removeItem`, `setDeliveryMode`, `setCheckoutDraft`, `clearCart` e salvar após cada alteração.
- [ ] **Step 4: Conectar o provider.** Envolver a aplicação por `OrderProvider` sem alterar a rota pública.
- [ ] **Step 5: Executar testes.** Rodar `pnpm test -- client/src/services/orderService.test.ts client/src/lib/order.test.ts`.

### Task 3: Identidade visual e home de descoberta

**Files:**
- Modify: `client/index.html`
- Modify: `client/src/index.css`
- Create: `client/src/components/delivery/StoreHeader.tsx`
- Create: `client/src/components/delivery/Hero.tsx`
- Create: `client/src/components/delivery/StoreInfo.tsx`
- Modify: `client/src/pages/Home.tsx`

- [ ] **Step 1: Aplicar tokens visuais.** Trocar a paleta padrão pelos tokens semânticos creme, vinho, vermelho, verde e dourado em OKLCH; definir hierarquia tipográfica e reduzir movimento quando solicitado pelo sistema.
- [ ] **Step 2: Criar cabeçalho público.** Incluir marca, indicador de atendimento, navegação por âncoras e acesso ao carrinho; garantir foco visível e rótulos para ícones.
- [ ] **Step 3: Criar hero.** Exibir mensagem de comida caseira, status/horários, CTA para o catálogo e composição visual de marmita sem depender de imagens remotas.
- [ ] **Step 4: Criar bloco de informações.** Exibir Telêmaco Borba/PR, horários, retirada/entrega e vouchers/alimentação aceitos, sem inventar avaliações ou depoimentos.
- [ ] **Step 5: Verificar em viewport móvel.** Confirmar leitura, contraste e CTA de cardápio acessível.

### Task 4: Catálogo, busca e configurador de produto

**Files:**
- Create: `client/src/components/delivery/CategoryFilter.tsx`
- Create: `client/src/components/delivery/ProductCard.tsx`
- Create: `client/src/components/delivery/ProductCatalog.tsx`
- Create: `client/src/components/delivery/ProductConfigurator.tsx`
- Modify: `client/src/pages/Home.tsx`

- [ ] **Step 1: Implementar busca e filtro.** Filtrar por nome, descrição e categoria com estado local memoizado; exibir estado vazio claro.
- [ ] **Step 2: Implementar cards.** Mostrar nome, descrição, preço atual, preço riscado e badge percentual quando `originalPrice` superar `price`.
- [ ] **Step 3: Implementar configurador.** Usar `Dialog` em telas maiores e `Drawer` em telas móveis; exigir seleções de grupos obrigatórios, receber observação livre e inserir uma linha configurada no contexto.
- [ ] **Step 4: Tratar itens simples.** Para produto sem grupos de opção, adicionar diretamente e fornecer feedback pelo toast.
- [ ] **Step 5: Testar fluxo no navegador.** Buscar produto, filtrar categoria, configurar marmita e confirmar atualização do carrinho.

### Task 5: Carrinho, modalidade e checkout em etapas

**Files:**
- Create: `client/src/components/delivery/CartPanel.tsx`
- Create: `client/src/components/delivery/CheckoutFlow.tsx`
- Create: `client/src/components/delivery/CheckoutSuccess.tsx`
- Modify: `client/src/pages/Home.tsx`

- [ ] **Step 1: Implementar painel de carrinho.** Usar `Sheet` lateral no desktop e `Drawer` inferior no mobile; permitir alterar quantidade, remover item e exibir resumo em BRL.
- [ ] **Step 2: Implementar modalidade.** Oferecer entrega e retirada; exibir taxa estimada e campos de endereço apenas para entrega, com instrução explícita para retirada.
- [ ] **Step 3: Construir etapas do checkout.** Criar dados pessoais, endereço condicional, pagamento, revisão e confirmação usando React Hook Form e Zod; telefone, nome, modalidade e pagamento deverão ser obrigatórios.
- [ ] **Step 4: Confirmar pedido.** Chamar exclusivamente `localOrderService.submit`, impedir cliques duplicados e manter dados ao receber erro.
- [ ] **Step 5: Implementar sucesso.** Mostrar número local, resumo, modalidade, estimativa e instrução de próximo passo por WhatsApp; limpar carrinho somente após confirmação bem-sucedida.

### Task 6: Polimento responsivo, integração e qualidade

**Files:**
- Modify: `client/src/pages/Home.tsx`
- Modify: `client/src/index.css`
- Modify: `todo.md`

- [ ] **Step 1: Adicionar barra inferior móvel.** Manter subtotal e CTA de carrinho sempre acessíveis em telas pequenas, sem sobrepor conteúdo final.
- [ ] **Step 2: Incluir resumo lateral desktop.** Exibir resumo discreto, atualizado e acessível quando houver itens, sem duplicar controles do carrinho.
- [ ] **Step 3: Checar estados extremos.** Validar carrinho vazio, busca sem resultado, formulário inválido, falha de adaptador e recuperação após recarregar a página.
- [ ] **Step 4: Executar qualidade.** Rodar `pnpm test`, `pnpm check` e `pnpm build`; resolver erros de tipo, teste ou build.
- [ ] **Step 5: Validar visualmente.** Capturar desktop e mobile, conferir contraste, quebra de conteúdo, navegação de teclado e fluxo completo.
- [ ] **Step 6: Atualizar histórico.** Marcar as tarefas concluídas em `todo.md`, criar checkpoint e entregar a versão para revisão.

## Autorrevisão do plano

O plano cobre todos os requisitos do escopo aprovado: home, categorias, busca, promoções, configuração de produto, carrinho persistente, entrega/retirada, checkout, confirmação, adaptador desacoplado, BRL e responsividade. O pagamento real, a autenticação de cliente e a integração com o Cardápio Web foram deliberadamente excluídos do primeiro corte porque exigem credenciais e contrato técnico oficial; a interface do serviço isola essa evolução futura.
