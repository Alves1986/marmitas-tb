# Fontes para arquitetura de pagamento

A arquitetura escolhida usa o **Asaas** como provedor-alvo, em uma primeira etapa híbrida sem cobrança real. A documentação oficial informa que uma cobrança pode ser criada para Pix, boleto, cartão de crédito, cartão de débito ou TED, e que o sistema integrador deve manter seu identificador e acompanhar o status da cobrança até a conciliação.[1]

Para a Marmitas TB, o fluxo definitivo será: criar pedido interno com pagamento pendente; criar cliente e cobrança no Asaas; exibir os dados de cobrança ao cliente; receber um evento autenticado; registrar a atualização de forma idempotente; e, só então, liberar comanda, alerta operacional e preparo. Em modo híbrido, o mesmo contrato será exercitado com um adaptador de teste, sem chamada ao Asaas e sem cobrança financeira.

## Requisitos para ativação oficial

| Requisito | Aplicação na Marmitas TB |
|---|---|
| Identificador da cobrança | Armazenar a referência retornada pelo Asaas junto ao pedido interno. |
| Eventos de pagamento | Mapear criação, confirmação, recebimento, falha, estorno e chargeback para o histórico do pedido. |
| Idempotência | Registrar o identificador do evento e ignorar reentregas para não duplicar status, alertas ou comandas. |
| Autenticação do evento | Validar o cabeçalho `asaas-access-token` com segredo mantido somente no servidor. |
| Resposta rápida | Registrar o evento e responder com sucesso rapidamente; o processamento complementar ocorrerá após o registro. |
| Eventos mínimos | Configurar somente os eventos de pagamento necessários para não sobrecarregar a operação. |

O Asaas indica que eventos podem ser entregues mais de uma vez, recomenda processamento assíncrono e usa o cabeçalho `asaas-access-token` quando um token de autenticação é configurado.[2] O projeto adotará essas práticas desde o modo de teste.

## Fontes oficiais

[1]: https://docs.asaas.com/docs/payments-overview
[2]: https://docs.asaas.com/docs/about-webhooks
[3]: https://docs.asaas.com/docs/payment-events
