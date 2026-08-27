# Transições controladas na cozinha — Marmitas TB

**Data:** 27 de agosto de 2026  
**Status:** Implementado localmente e aguardando checkpoint de validação  
**Escopo:** evolução pontual da rota interna `/operacao/cozinha`.

## 1. Objetivo

A tela de cozinha deixará de ser apenas de consulta para permitir que a equipe avance a produção com duas ações diretas e seguras. A mudança deve reduzir deslocamentos para a fila operacional, preservar a prioridade dos pedidos de balcão e manter a autoria da mudança no servidor.

> A cozinha avança a produção; ela não cancela pedidos, não recua etapas, não confirma pagamentos, não reimprime comandas e não controla hardware.

## 2. Fluxo autorizado

| Estado exibido no cartão | Ação única | Estado solicitado | Disponível para |
|---|---|---|---|
| `confirmado` | **Iniciar preparo** | `em_preparo` | `staff` e `admin` |
| `em_preparo` | **Marcar pronto** | `pronto_para_retirada` | `staff` e `admin` |
| `pronto_para_retirada` | Nenhuma | — | Somente consulta |

Os pedidos de origem `COUNTER` permanecem na faixa **Prioridade balcão** enquanto estiverem em qualquer um desses três estados. A faixa exibirá o estado atual e a única ação que ainda pode ser tomada, sem repetir o cartão nas colunas abaixo. Os demais pedidos seguirão nas colunas existentes de Novo pedido, Em preparo e Pronto para retirada.

## 3. Interação no posto de cozinha

Cada cartão elegível exibirá um botão grande, de altura mínima de 44 px, com rótulo de ação e destino explícitos. Não haverá modal de confirmação. Ao tocar ou clicar, o botão fica indisponível e passa a informar que a atualização está sendo realizada. A posição, o estado e a ação do cartão só mudam após resposta positiva do servidor.

Se a resposta falhar — por sessão, rede, mudança concorrente ou transição recusada — o cartão conservará o estado anterior e exibirá um aviso recuperável associado àquele pedido. O botão volta a ficar disponível para uma nova tentativa apenas quando isso for seguro. O polling atual de 10 segundos permanece como reconciliação de leitura; ele não deve esconder uma falha nem simular uma transição local.

## 4. Arquitetura e segurança

Nenhuma rota HTTP, tabela, função SQL, migração ou credencial será criada para este incremento. A tela reutilizará o `PATCH /api/operations/orders` existente e o contrato de transição operacional já validado. O navegador enviará somente o `orderId` e o próximo estado permitido; o endpoint continuará a determinar a autoria a partir da sessão autenticada, usando `requireStaff` no servidor.

| Camada | Responsabilidade |
|---|---|
| `client/src/lib/kitchenBoard.ts` | Expor a próxima ação permitida por estado e evitar ações para pedidos prontos ou inativos. |
| `client/src/services/operationsService.ts` | Reutilizar a transição operacional existente, sem criar cliente paralelo. |
| `client/src/pages/KitchenBoard.tsx` | Renderizar ação por cartão, controlar pendência/erro local e recarregar a fila após sucesso. |
| `api/operations/[resource].ts` e handler de pedidos | Continuar encaminhando e autorizando a mudança de estado sem aceitar autoria do navegador. |

A interface esconde ações de perfis sem acesso, mas esse controle é complementar. A garantia obrigatória permanece no endpoint: perfis `customer` não poderão consultar nem transicionar pedidos internos. A prioridade de impressão e a fila de impressão não serão tocadas.

## 5. Tratamento de consistência

O cliente calcula a próxima ação apenas para a experiência de apresentação. A autoridade final é o mecanismo de transição já existente no servidor. Em caso de conflito, o cliente mostrará a mensagem recebida ou uma mensagem segura de indisponibilidade e pedirá nova carga da fila; jamais tentará forçar o status, enviar tentativa automática ou reaproveitar a ação para outro pedido.

Não haverá estado otimista. Isso evita que um pedido seja apresentado como pronto antes da confirmação efetiva e mantém a ordem cronológica da fila coerente em telas simultâneas.

## 6. Estados visuais e acessibilidade

A tela deve manter os estados existentes de carregamento, sem pedidos e erro geral. O novo erro do cartão terá `role="alert"` ou associação acessível equivalente, com o código/senha do pedido no contexto. Botões de ação incluirão o identificador de comanda no nome acessível, terão foco visível e não dependerão apenas da cor para comunicar o estado. Em telas estreitas, os controles ocuparão a largura útil do cartão para uso em tablet.

## 7. Testes e validação

O desenvolvimento seguirá TDD, começando por uma regressão que falha. A cobertura deverá verificar a próxima ação válida por status, ausência de ações para pedidos prontos/inativos, manutenção de `COUNTER` na faixa priorizada sem duplicação, chamada com estado destino correto, bloqueio durante requisição, atualização somente após sucesso, erro recuperável após falha e ausência de chamada para perfil não autorizado.

O endpoint existente manterá testes de autorização, de autoria derivada da sessão e de recusa de transições inválidas. A validação final incluirá `pnpm test`, `pnpm check`, `pnpm build`, `pnpm build:vercel-runtime` e `git diff --check`, além de revisão visual desktop e mobile da barreira sem sessão e da tela autenticada quando a sessão estiver disponível.

## 8. Fora do escopo

Este incremento não inclui cancelamento, retorno de estado, edição de pedido, reimpressão, baixa de estoque, tela pública de chamadas, notificações externas, agente local, impressora, maquininha, iFood, Asaas, SMTP, domínio, migração de banco ou escrita no Supabase fora da atualização de status já atendida pelo endpoint existente.

## 9. Registro de implementação local — 27/08/2026

A página `/operacao/cozinha` agora exibe uma ação única no cartão de cada pedido apto: **Iniciar preparo** para pedidos confirmados e **Marcar pronto** para pedidos em preparo. Pedidos prontos não exibem ação. Os pedidos COUNTER permanecem exclusivamente na faixa prioritária, sem duplicação nas colunas, e usam a mesma regra de ação do respectivo estado.

Cada cartão bloqueia apenas sua própria ação enquanto a solicitação está pendente. A tela mantém a posição e o status anterior até que o endpoint operacional existente confirme a transição. Em falha, mostra um aviso recuperável no cartão e libera nova tentativa; não há alteração otimista, repetição automática, cancelamento, retorno de etapa ou chamada de impressão.

O fluxo reutiliza `vercelOperationsService.transitionOrder` e `PATCH /api/operations/orders`. O servidor continua derivando a autoria da sessão de equipe e respondendo conflitos de transição com erro recuperável. Não foram criadas rotas, tabelas, funções SQL, migrações, agentes, hardware ou integrações externas.
