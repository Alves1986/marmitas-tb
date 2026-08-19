# Referências de implementação — Asaas Sandbox

Este registro reúne as fontes oficiais consultadas em **19 de agosto de 2026** para a integração de cobrança PIX em ambiente Sandbox. As credenciais não constam neste documento, no repositório ou em quaisquer exemplos.

| Tema | Diretriz aplicada | Fonte oficial |
|---|---|---|
| Segurança de API key | A chave deve permanecer em variável de ambiente protegida; Sandbox e Produção usam chaves e URLs distintas. | [Chaves de API do Asaas](https://docs.asaas.com/docs/chaves-de-api) |
| Cobrança avulsa | A criação usa um cliente Asaas, `billingType: PIX`, `value`, `dueDate` e `externalReference` com o código interno do pedido. | [Criar nova cobrança](https://docs.asaas.com/reference/criar-nova-cobranca) |
| Identidade do pagador | O cadastro usa uma referência externa estável por telefone e pesquisa prévia para reduzir duplicidades. | [Criar novo cliente](https://docs.asaas.com/reference/criar-novo-cliente) |
| Webhook | O endpoint valida o header `asaas-access-token` com token de 32 a 255 caracteres, sem espaços e diferente da API key. | [Receber eventos por Webhook](https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook) |
| PIX | O fluxo emite cobrança PIX e entrega o link de fatura devolvido pelo Asaas para utilização somente em homologação. | [Visão geral do PIX](https://docs.asaas.com/docs/pix-overview) |

> A implementação está limitada a `ASAAS_ENVIRONMENT=sandbox`. A transição para produção requer autorização explícita, chaves distintas e uma homologação integral bem-sucedida.
