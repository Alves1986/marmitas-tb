# Homologação controlada em produção — 20 de agosto de 2026

## Escopo

Esta validação reutilizou exclusivamente o pedido de teste `TB-20260819-C82294251937`, criado anteriormente para homologação. Não foi criado novo pedido, cobrança, cliente ou envio de impressão. A execução ocorreu após a confirmação da sessão administrativa corrigida.

| Dimensão | Evidência | Resultado |
|---|---|---|
| Vitrine pública | A rota principal respondeu e exibiu o catálogo em produção. | Validada em verificação anterior registrada. |
| Acompanhamento público | A página de acompanhamento carregou sem expor dados de pedido sem consulta. | Validada em verificação anterior registrada. |
| Acesso administrativo | Novo login aceito e `/admin` carregado com sessão e módulos internos. | Validado após a correção de papel administrativo. |
| Pedido controlado | Pedido de teste localizado com status `aguardando_pagamento` e pagamento `pending`. | Confirmado antes da transição. |
| Transição operacional | Status alterado de `aguardando_pagamento` para `confirmado`, com evento de auditoria. | Concluída. |
| Cobrança | `payment_status` permaneceu `pending`. | Nenhuma cobrança foi criada ou confirmada. |

## Transição executada

O pedido de teste foi alterado uma única vez para `confirmado`. A alteração foi limitada ao identificador conhecido do pedido e condicionada ao status anterior `aguardando_pagamento`, evitando uma sobrescrita acidental. Em seguida, foi registrado um evento `status_changed` com origem `aguardando_pagamento`, destino `confirmado` e a indicação de que se tratava de homologação controlada.

> O status operacional foi atualizado para validar a fila. O status de pagamento permaneceu pendente. Essa distinção é deliberada nesta fase de teste, que não possui credenciais Asaas configuradas nem realiza cobrança real.

## Impressão

Não houve solicitação de impressão nesta transição. A consulta de evidência identificou três trabalhos de impressão já existentes para o pedido, todos criados em 19 de agosto de 2026 — dois concluídos e um marcado como falho. Como a transição atual ocorreu em 20 de agosto de 2026 e não inseriu novo `print_job`, esses registros são históricos e não foram produzidos por esta homologação.

## Limites e próximos passos

A homologação confirmou disponibilidade pública, proteção das rotas internas sem sessão, acesso administrativo autenticado e transição controlada da fila, sem cobrança nem impressão. A ativação do Sandbox do Asaas continua bloqueada até o cadastro seguro de `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN` na Vercel. O envio confiável de convites e recuperação de senha continua pendente de domínio institucional e SMTP verificado.
