# Referências verificadas para a ativação do Asaas

Este registro sustenta a preparação da integração oficial, sem habilitar cobranças nesta etapa. A cobrança única do Asaas é criada pelo endpoint de pagamentos; o campo `externalReference` é recomendado para associar a cobrança ao identificador interno do pedido. O provedor aceita `PIX`, `CREDIT_CARD`, `BOLETO` e `UNDEFINED` como tipo de cobrança, sendo `UNDEFINED` a alternativa quando o pagador deve escolher entre métodos habilitados.[1]

O Asaas entrega webhooks no modelo **at least once**, de modo que o mesmo evento pode ser enviado mais de uma vez. Por isso, a aplicação deve guardar e ignorar eventos repetidos pelo identificador `event.id`. O endpoint deve retornar uma resposta 2xx rapidamente; falhas repetidas provocam tentativas novas e podem interromper a fila de sincronização.[2]

Para autenticar a origem, o token configurado no webhook chega no cabeçalho `asaas-access-token`. A documentação recomenda validar esse cabeçalho e não usar a chave de API como token do webhook.[2] O exemplo de evento inclui `id`, `event` e o objeto `payment`, com eventos como `PAYMENT_RECEIVED`.[2]

## Referências

[1] [Asaas, “Create new payment”](https://docs.asaas.com/reference/create-new-payment)

[2] [Asaas, “Receive events from Asaas in your Webhook endpoint”](https://docs.asaas.com/docs/receive-asaas-events-at-your-webhook-endpoint)

[3] [Asaas, “Introdução — Webhooks”](https://docs.asaas.com/docs/sobre-os-webhooks)
