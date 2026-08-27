# Tela de cozinha somente consulta — especificação de design

**Status:** Implementado em código; aguardando somente revisão operacional e autorização de publicação.  
**Data:** 27/08/2026.  
**Decisão arquitetural:** criar uma projeção visual de produção sobre a consulta operacional existente, sem endpoint novo, sem escrita no Supabase, sem agente local e sem hardware de impressão.

## 1. Objetivo

Disponibilizar uma rota interna de cozinha que permita acompanhar rapidamente as comandas ativas, destacando pedidos de balcão e seu impacto operacional. A tela é intencionalmente somente consulta: o posto de produção enxerga as prioridades e os itens, enquanto qualquer alteração de pedido permanece na fila operacional já protegida.

## 2. Escopo e limites

| Incluído | Excluído nesta fase |
|---|---|
| Rota protegida `/operacao/cozinha` para `staff` e `admin` | Alterar status, cancelar pedido ou reimprimir |
| Pedidos nos estados `confirmado`, `em_preparo` e `pronto_para_retirada` | Pedidos concluídos, cancelados ou aguardando pagamento |
| Faixa superior para pedidos `COUNTER` ativos | Novo banco, endpoint ou fila paralela |
| Colunas por estado para os demais pedidos ativos | Agente local, impressora física, ESC/POS ou hardware |
| Atualização automática a cada 10 segundos | Integração iFood, gateway, SMTP ou cobrança |
| Estados vazio, carregando e falha recuperável | Dados pessoais desnecessários do cliente |

## 3. Experiência visual

A tela terá um cabeçalho identificado como **Cozinha**, com retorno claro à fila operacional. A primeira região é uma faixa de prioridade com apenas os pedidos `COUNTER` ativos, ordenados cronologicamente. Cada cartão usará uma marcação visual de balcão e exibirá senha `MTB-xxx` quando fornecida pelo pedido, código, horário, itens, quantidades e observações.

Logo abaixo, três colunas representam `Novo pedido`, `Em preparo` e `Pronto para retirada`. Pedidos `COUNTER` não serão duplicados nas colunas: a faixa superior é sua única representação, evitando ruído e reforçando a preferência visual. Pedidos de `OWN_APP`, `KIOSK` e canais futuros compatíveis permanecem nas colunas conforme o estado.

| Região | Conteúdo | Ordenação |
|---|---|---|
| Prioridade balcão | Apenas `COUNTER` ativo | `createdAt` crescente |
| Novo pedido | `confirmado`, exceto `COUNTER` | `createdAt` crescente |
| Em preparo | `em_preparo`, exceto `COUNTER` | `createdAt` crescente |
| Pronto para retirada | `pronto_para_retirada`, exceto `COUNTER` | `createdAt` crescente |

Em monitores de cozinha, as colunas ficam lado a lado. Em telas estreitas, elas ficam empilhadas em ordem operacional. A interface mantém a paleta de creme, vermelho e verde já aplicada na operação, com contraste suficiente e foco visível para links de navegação.

## 4. Dados e segurança

A rota reutiliza exclusivamente `vercelOperationsService.listOrders()`, já protegida por sessão e papel interno. A tela filtra no cliente apenas os estados definidos e usa `sourceChannel` retornado pelo contrato operacional. Será necessário ampliar a projeção de leitura operacional com `sourceChannel` e `counterTicket`, mas sem expor esses campos no acompanhamento público e sem adicionar mutações.

> A prioridade visual não substitui a prioridade persistida de impressão. `COUNTER` continua com prioridade 100 em `print_jobs`; a tela apenas torna essa regra operacional compreensível no posto de cozinha.

## 5. Falhas e critérios de aceite

Se a consulta falhar, a tela mostrará uma mensagem recuperável e não exibirá dados antigos como se fossem atuais. Sem comandas ativas, cada região apresentará um estado vazio objetivo. A atualização é periódica a cada 10 segundos e não deve provocar escrita, confirmação de impressão ou alteração de status.

O incremento será aceito quando testes comprovarem o bloqueio para perfis externos, a separação de `COUNTER`, a ausência de duplicação nas colunas, a exclusão de estados inativos, a ordem cronológica e a inexistência de botões de mutação. Também serão exigidos teste de rota, TypeScript, build PWA/runtime Vercel, revisão visual e `git diff --check`.

## 6. Próximas dependências

Uma futura fase poderá permitir a mudança de status pela cozinha, exibir tela pública de chamadas ou conectar um agente local de impressão. Essas evoluções exigirão novo desenho, autorização explícita e testes próprios; não fazem parte desta tela.

## 7. Registro de implementação — 27/08/2026

A rota protegida `/operacao/cozinha` foi adicionada para `staff` e `admin`. A consulta operacional existente passou a projetar apenas para a equipe os campos de origem do pedido e a senha persistida de balcão, sem alterar o contrato público de acompanhamento. A página separa `COUNTER` ativo em uma faixa prioritária e usa três colunas para os demais pedidos ativos: novo pedido, em preparo e pronto para retirada.

A tela não oferece qualquer mutação, cancelamento, reimpressão, confirmação de impressão, agente local ou integração de hardware. Pedidos concluídos, cancelados, em rota e aguardando pagamento são excluídos da projeção. A proteção visual da rota foi confirmada em desktop e celular sem sessão; a composição autenticada, os estados vazios, as falhas e a ausência de botões de mutação são cobertos por testes de DOM.
