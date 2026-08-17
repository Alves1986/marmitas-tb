# Marmitas TB — Operação de Pedidos, Gestão e Pagamentos Híbridos

**Autoria:** Manus AI  
**Data:** 17 de agosto de 2026  
**Status:** Aprovado para especificação e revisão do plano de implementação

## Objetivo

Evoluir a vitrine de pedidos da Marmitas TB para uma operação integrada e rastreável. O sistema deve registrar pedidos reais no banco de dados, permitir o acompanhamento público por código, oferecer gestão de cardápio e operação diária em painéis com permissões distintas, alertar sobre novos pedidos e emitir comandas em computador dedicado à cozinha.

O pagamento será desenvolvido em uma arquitetura híbrida orientada ao Asaas. Nesta fase não haverá cobrança financeira real. O checkout usará um adaptador de teste que reproduz estados de pagamento e preserva o contrato técnico necessário para uma integração oficial futura.

## Papéis e permissões

| Papel | Pode executar | Não pode executar |
|---|---|---|
| Cliente | Criar pedido, acompanhar pedido pelo código, ver seu estado de pagamento e dados de entrega. | Acessar dados de outros pedidos, dados internos ou painéis de operação. |
| Equipe operacional | Ver fila, receber alertas, atualizar status permitido, abrir e reimprimir comandas. | Alterar cardápio, equipe, configurações ou dados de pagamento. |
| Administrador | Tudo que a equipe executa, além de gerenciar cardápio, opções, disponibilidade, equipe, configurações e modo de pagamento. | Nenhuma restrição funcional dentro do sistema. |

As permissões serão aplicadas no servidor. Ocultar botões no cliente não será considerado controle de acesso.

## Domínio e persistência

O banco de dados será a fonte de verdade para a operação. O pedido terá um número público não sequencial, cliente, endereço ou retirada, itens congelados no momento da compra, valores em centavos, modalidade, observações, status atual e histórico de transições. Cada item persistirá seu nome, quantidade, valor unitário, opções e observações, sem depender de futuras mudanças do cardápio.

| Entidade | Finalidade |
|---|---|
| `menu_categories` e `menu_products` | Organizam categorias, descrições, preços, fotos, promoções e disponibilidade. |
| `product_option_groups` e `product_options` | Definem tamanho, embalagem, acompanhamentos e adicionais. |
| `orders` e `order_items` | Guardam a venda imutável, valores, cliente, entrega e dados operacionais. |
| `order_status_events` | Mantêm a linha do tempo auditável de mudanças de status. |
| `payments` e `payment_events` | Isolam referência, método, estado e eventos de pagamento do pedido. |
| `staff_members` | Associam usuários autenticados ao papel administrativo ou operacional. |
| `print_jobs` | Registram criação, tentativa, sucesso ou falha de impressão da comanda. |
| `store_settings` | Mantêm dados operacionais da loja, taxa, horário, modo de pagamento e impressão. |

## Fluxo de pedido e acompanhamento

O checkout cria um pedido com itens, endereço quando aplicável e estado de pagamento inicial. No modo híbrido, o adaptador de teste retorna uma referência de cobrança e um estado determinístico de pagamento, sem processar dados financeiros sensíveis. O pedido pago ou autorizado entra na fila operacional. O acompanhamento público exige o código do pedido e exibe apenas resumo, modalidade, situação de pagamento e linha do tempo.

| Status do pedido | Transições permitidas | Exposição ao cliente |
|---|---|---|
| `aguardando_pagamento` | `confirmado`, `cancelado` | Pagamento pendente. |
| `confirmado` | `em_preparo`, `cancelado` | Pedido recebido. |
| `em_preparo` | `pronto`, `saiu_para_entrega`, `cancelado` | Em preparo. |
| `pronto` | `concluido`, `cancelado` | Pronto para retirada. |
| `saiu_para_entrega` | `concluido`, `cancelado` | Saiu para entrega. |
| `concluido` ou `cancelado` | Nenhuma transição operacional posterior | Resultado final. |

Transições inválidas serão recusadas no servidor. Um cancelamento posterior a pagamento confirmado será registrado separadamente para que um eventual estorno seja operado por fluxo financeiro próprio quando o Asaas estiver ativo.

## Painéis e gestão de cardápio

O painel operacional prioriza a fila por urgência. Cada pedido exibirá código, horário, modalidade, pagamento, itens, observações, status, comando de impressão e ações permitidas. Um pedido novo confirmado gera destaque visual persistente e som enquanto não for reconhecido pela equipe.

O painel administrativo inclui uma visão geral de pedidos, editor de categorias e produtos, editor de grupos de opções e itens, controle de disponibilidade, cadastro de equipe e configurações. Exclusões que afetariam o histórico serão transformadas em indisponibilidade ou arquivamento, preservando pedidos já realizados.

## Alertas e impressão automática

O computador dedicado à cozinha manterá o painel operacional aberto. Ao receber pedido confirmado, a interface toca um som, apresenta notificação visual e cria uma comanda compacta. Em ambiente de navegador configurado em modo quiosque, com impressora térmica definida como padrão, a aplicação solicitará impressão automática sem caixa de diálogo. O painel também terá reimpressão manual, e cada tentativa será registrada em `print_jobs`.

> A automação física exige a preparação local do navegador e da impressora. A aplicação web não instala drivers nem altera configurações do equipamento; ela apenas gera a comanda e dispara a impressão no navegador já preparado.

## Contrato de pagamento Asaas

O adaptador de pagamento terá uma interface comum para `createCharge`, `getChargeStatus` e `handleWebhook`. O adaptador de teste será usado inicialmente. O adaptador Asaas oficial será ativado somente após o fornecimento de credenciais e a validação do ambiente de produção.

Na ativação oficial, o servidor criará e guardará a referência de cliente e cobrança do Asaas, nunca expondo a chave de API ao navegador. As cobranças podem ser configuradas com método escolhido pelo cliente e acompanhadas por status ou webhooks.[1] Os eventos devem ser idempotentes, pois a entrega é de pelo menos uma vez, e o token no cabeçalho `asaas-access-token` deve ser validado antes de qualquer alteração de pedido.[2]

| Evento externo | Ação interna futura |
|---|---|
| Cobrança criada | Atualizar referência e manter pedido aguardando pagamento. |
| Pagamento confirmado ou recebido | Marcar pagamento aprovado, confirmar pedido, criar alerta e comanda. |
| Falha no cartão | Manter pedido aguardando pagamento e orientar nova tentativa. |
| Estorno ou chargeback | Registrar evento financeiro e bloquear conclusão automática. |

## Erros, segurança e auditoria

As operações críticas terão validação de dados, checagem de permissão e registro de evento. Reentregas de eventos de pagamento, cliques repetidos de confirmação e reimpressões não poderão criar pedidos ou comandas duplicadas. O sistema usará estados explícitos para falha de impressão, falha de pagamento e produto indisponível. A chave do Asaas e o token de webhook serão configurados somente como segredos do servidor quando a integração oficial for habilitada.

## Estratégia de validação

O desenvolvimento será dirigido por testes de domínio para cálculo de pedido, transições de status, permissões, idempotência de eventos e criação de comandas. Testes de interface cobrirão o checkout, acompanhamento público, fila operacional, configuração de produto, alertas e ações de impressão. Também serão verificados o build de produção, a aplicação de migrações, o fluxo em desktop e a experiência da equipe no computador dedicado.

## Fora do escopo desta etapa

Esta implementação não efetuará cobrança real no Asaas, não armazenará dados de cartão, não integrará WhatsApp da equipe e não administrará o sistema operacional, drivers ou o modo quiosque do computador da cozinha. Esses elementos estarão preparados ou documentados para ativação posterior.

## Revisão de consistência

A revisão interna verificou a coerência entre objetivo, papéis, entidades, transições, painéis, alertas, impressão e adaptador de pagamento. O fluxo tem uma única fonte de verdade para pedidos e pagamentos, separa o estado do pedido do estado financeiro e impede que a equipe altere cardápio ou configurações. A impressão automática depende explicitamente do computador dedicado configurado em modo quiosque, evitando a suposição de que uma aplicação web possa controlar a impressora em qualquer dispositivo.

Não há marcadores provisórios, requisitos contraditórios ou funcionalidades fora do escopo descrito. A ativação real do Asaas permanece isolada no adaptador do servidor e só ocorrerá após credenciais e configuração do webhook, preservando o modo de teste sem risco de cobrança.

## Referências

[1] [Pagamentos — documentação oficial do Asaas](https://docs.asaas.com/docs/payments-overview)  
[2] [Webhooks — documentação oficial do Asaas](https://docs.asaas.com/docs/about-webhooks)  
