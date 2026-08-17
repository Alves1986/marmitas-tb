# Marmitas TB Delivery — Especificação de Produto

## Objetivo

Evoluir o esqueleto atual da Marmitas TB para uma experiência própria de pedidos online, inspirada em marketplaces de delivery, sem perder a identidade de comida caseira. A primeira versão deverá permitir que uma pessoa descubra o cardápio, encontre uma refeição, configure opções quando necessário, adicione itens ao carrinho, informe entrega ou retirada e confirme um pedido demonstrativo dentro do site.

A integração com o sistema de pedidos existente será preparada desde o início por meio de um contrato de pedido e de um adaptador substituível. Assim, a experiência de checkout não ficará acoplada ao Cardápio Web, WhatsApp ou a uma futura API própria.

## Contexto atual

O pacote inicial contém uma vitrine mínima em Next.js com Tailwind, uma navegação por âncoras, duas categorias estáticas e quatro produtos. O carrinho atual contabiliza apenas a quantidade total e não guarda linhas, opções, preços ou dados do cliente. O README já aponta banco de dados, painel administrativo, checkout e integração de WhatsApp como evoluções naturais.

A página pública do [Cardápio Web da Marmitas TB](https://app.cardapioweb.com/marmitas_tb) foi usada como referência de conteúdo e fluxo. Ela apresenta localização em Telêmaco Borba/PR, horários de almoço e jantar, busca, categorias, promoções, refeições econômicas, mais vendidos, especialidades, promoções para duas pessoas, porções, adicionais, sobremesas e bebidas. Esses dados servem como referência editorial; a primeira versão não fará scraping nem dependerá de acesso não documentado ao serviço externo.

## Princípios de experiência

A interface deverá ser acolhedora, rápida e orientada à conclusão do pedido. O fundo creme e os tons de vermelho e verde do material inicial serão preservados como base, mas com hierarquia visual mais consistente. Produtos devem mostrar claramente nome, descrição, preço e benefício promocional. A busca e as categorias devem reduzir o tempo até o primeiro item no carrinho.

No celular, o fluxo será prioritariamente de uma mão. O carrinho deverá ficar acessível por uma ação persistente, sem esconder o catálogo. No desktop, o catálogo ocupará o espaço principal e o resumo do pedido poderá aparecer em uma coluna lateral ou painel deslizante. Estados vazios, carregamento simulado, erro de validação e confirmação serão tratados visualmente, evitando que a pessoa fique sem saber o que fazer.

## Escopo da primeira versão

| Área | Comportamento esperado | Fora do escopo inicial |
|---|---|---|
| Home | Apresenta marca, horários, localização, benefícios, destaque e CTA para cardápio | CMS e campanhas administráveis |
| Catálogo | Lista categorias e produtos, com busca, filtro por categoria e destaque de promoções | Sincronização automática com catálogo externo |
| Produto | Permite selecionar tamanho, embalagem, acompanhamento ou observação quando aplicável | Editor genérico de combinações ilimitadas |
| Carrinho | Mantém linhas, quantidades, opções, subtotal, taxa estimada e total | Multi-loja ou carrinhos separados |
| Entrega | Alterna entre entrega e retirada; coleta endereço quando necessário | Geocodificação e roteirização real |
| Checkout | Coleta nome, telefone, endereço, observação e forma de pagamento; valida campos | Cobrança ou gateway de pagamento real |
| Confirmação | Gera número de pedido, resumo e próximos passos | Acompanhamento em tempo real |
| Integração | Usa contrato padronizado e adaptador local demonstrativo | API real do Cardápio Web sem credenciais/documentação |
| Persistência | Guarda carrinho e preferências no navegador | Conta autenticada e histórico em banco |

## Arquitetura funcional

O catálogo será representado por tipos explícitos de produto, categoria, opção e promoção. Uma camada de estado do cliente manterá o carrinho e os dados transitórios do checkout. A camada de domínio calculará subtotal, descontos, taxa estimada e total sem depender de componentes visuais.

O pedido confirmado seguirá um contrato estável, contendo identificador local, linhas com produto e opções, valores calculados, dados do cliente, modalidade de recebimento, endereço quando necessário, forma de pagamento e observações. O checkout chamará uma interface de envio de pedido, inicialmente implementada por um adaptador local que simula a confirmação. Um futuro adaptador poderá encaminhar o mesmo objeto ao Cardápio Web, WhatsApp ou backend próprio.

## Fluxo principal

1. A pessoa entra na home e vê o horário de atendimento, a promessa de valor e o CTA para pedir.
2. Ela navega por categorias ou usa a busca para localizar um item.
3. Ao selecionar um item configurável, escolhe tamanho, embalagem, acompanhamento e observações em um painel de produto.
4. O item é adicionado ao carrinho e a interface confirma a ação com atualização de quantidade e valor.
5. No carrinho, a pessoa revisa itens, ajusta quantidades e escolhe entrega ou retirada.
6. Para entrega, informa endereço e recebe uma estimativa de taxa; para retirada, vê a instrução de retirada.
7. No checkout, informa nome, telefone e forma de pagamento, revisa o resumo e confirma.
8. A tela de sucesso mostra número do pedido, valor, modalidade, horário estimado e um próximo passo de contato.

## Tratamento de estados e erros

O carrinho vazio deverá orientar a pessoa de volta ao catálogo. Campos obrigatórios serão validados antes da confirmação, com mensagens próximas ao campo e um resumo acessível para leitores de tela. Valores serão formatados em reais e recalculados a cada alteração de item, opção ou modalidade. Se o adaptador falhar, o checkout deverá preservar os dados preenchidos e permitir tentar novamente, sem duplicar a linha do pedido local.

A aplicação deverá funcionar mesmo sem integração externa configurada. Isso é uma decisão deliberada: a primeira entrega será demonstrável e testável, enquanto o ponto de conexão real ficará concentrado em uma função de serviço bem definida.

## Critérios de aceite

| Critério | Verificação |
|---|---|
| Encontrar produtos | A busca filtra produtos por nome, descrição e categoria sem recarregar a página |
| Montar pedido | O usuário consegue adicionar, alterar quantidade e remover itens |
| Configurar produto | Produtos com opções exibem seleção antes da inclusão no carrinho |
| Calcular valores | Subtotal, desconto, taxa estimada e total são coerentes e formatados em BRL |
| Continuar compra | O carrinho persiste durante a navegação e após recarregar a página |
| Finalizar | O checkout bloqueia dados inválidos e confirma pedidos válidos |
| Recuperar falha | Uma falha de envio preserva o formulário e oferece nova tentativa |
| Responsividade | Home, catálogo, carrinho e checkout são utilizáveis em telas pequenas e grandes |
| Integração futura | O pedido final pode ser enviado por um adaptador sem alterar o fluxo visual |
| Qualidade | Build de produção e verificações automatizadas passam sem erros |

## Decisões futuras

A integração real dependerá de confirmar a existência de API, webhook ou mecanismo oficial de recebimento do Cardápio Web e de obter as credenciais apropriadas. Até essa confirmação, nenhuma automação de scraping, envio de credenciais ou dependência de comportamento interno do site será adicionada. Pagamento real, autenticação, painel administrativo, sincronização de estoque e acompanhamento de status serão tratados em planos separados quando houver necessidade e acesso técnico.
