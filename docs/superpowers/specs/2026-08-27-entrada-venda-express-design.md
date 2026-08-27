# Entrada pública de venda express — Marmitas TB

**Status:** Direção visual aprovada pelo responsável em 27/08/2026.

## Objetivo

A rota pública `/` deixará de se apresentar como um site institucional amplo e passará a ser a porta de entrada de venda da Marmitas TB. A primeira dobra deve comunicar a marca, destacar a marmita do dia e levar o cliente a iniciar o pedido com uma única ação principal. O catálogo e o checkout existentes continuam sendo a jornada de compra; nenhuma área operacional, administrativa ou de autenticação será exposta na entrada pública.

> A nova entrada deverá responder à pergunta imediata do cliente: “qual é a opção de hoje e como faço meu pedido?”

## Direção aprovada: venda express

A página usará a paleta atual — creme, vinho, vermelho, verde e amarelo — e a logo oficial já cadastrada. O cabeçalho será reduzido ao essencial para compra: identificação da Marmitas TB, acompanhamento público do pedido e sacola. A navegação institucional extensa não terá prioridade visual.

| Região | Conteúdo | Comportamento |
|---|---|---|
| Cabeçalho | Logo, link discreto para acompanhamento e acesso à sacola | Mantém a compra e o pós-venda ao alcance, sem revelar rotas internas. |
| Hero de venda | Selo “Marmita do dia”, imagem real já utilizada no catálogo, mensagem curta e contexto de retirada/entrega | Exibe a oferta do dia sem criar preço, produto ou disponibilidade fictícios. |
| Ação principal | Botão “Realizar pedido” | Desloca com foco e suavidade para o catálogo existente em `#cardapio`. |
| Ação secundária | Link “Ver cardápio completo” ou equivalente | Usa o mesmo destino do catálogo, com menor destaque visual. |
| Catálogo e sacola | Componentes atuais de catálogo, personalização, carrinho e checkout | Permanecem como fonte única de itens, preços, disponibilidade e regras de pedido. |
| Rodapé | Informações essenciais de contato e localização | Fica após a jornada de compra, sem competir com o início do pedido. |

## Conteúdo e dados

O bloco “Marmita do dia” reutilizará temporariamente a imagem e a comunicação de prato já presentes no hero atual. Ele não exibirá preço, composição detalhada ou disponibilidade fixa fora do catálogo, pois tais dados precisam continuar vindo dos registros ativos de produto. A chamada de ação sempre levará ao catálogo real, onde o cliente escolhe e personaliza os itens válidos.

Nenhuma tabela, endpoint, migração, integração de pagamento ou regra de estoque será alterada. O catálogo, a sacola, o checkout e o acompanhamento público conservarão seus contratos atuais. As rotas `/admin`, `/operacao`, `/operacao/pdv`, `/operacao/cozinha` e `/operacao/estoque` permanecem protegidas e fora da navegação pública principal.

## Interação, acessibilidade e responsividade

Em celulares, a ação “Realizar pedido” aparece acima da dobra e convive com a barra de sacola existente sem obstruir conteúdo. Em telas maiores, a imagem da marmita equilibra a mensagem e o botão de pedido. O botão terá rótulo explícito, foco visível e destino semântico para `#cardapio`; a imagem terá texto alternativo descritivo. A revisão incluirá desktop e celular, além de regressões para a presença do destaque, o CTA e a preservação do catálogo.

## Critérios de aceite

| Critério | Evidência esperada |
|---|---|
| A abertura comunica venda imediata | Logo, “Marmita do dia” e “Realizar pedido” aparecem antes do catálogo. |
| O pedido permanece real e consistente | CTA aponta ao catálogo atual; não há preço, produto ou disponibilidade inventados. |
| Operação segue isolada | Não há atalhos públicos para administração ou operação. |
| Uso em celular permanece claro | CTA, sacola e início do catálogo não se sobrepõem nem perdem foco. |
| Regressões não são introduzidas | Testes de interface, tipagem, build e revisão visual são concluídos antes do checkpoint. |

## Limites desta entrega

Esta alteração não cria um motor de recomendação, alteração diária automática de marmita, pedido de balcão adicional, integração de totem, pagamento novo, estoque automático ou publicação. A atualização dinâmica e administrativa da “Marmita do dia” poderá ser desenhada como um incremento futuro, caso desejado.
