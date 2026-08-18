# Fontes de homologação do Asaas

Pesquisa efetuada em 18 de agosto de 2026 para orientar a homologação da Marmitas TB. Este registro não contém credenciais.

| Tema | Requisito confirmado | Fonte oficial |
| --- | --- | --- |
| Ambiente de testes | O Sandbox permite desenvolver e homologar sem movimentar valores reais. A URL base é `https://api-sandbox.asaas.com/v3` e exige chave específica do Sandbox. | [Sandbox](https://docs.asaas.com/docs/sandbox) |
| Autenticação da API | A chave deve permanecer fora do código, do cliente e dos logs. As requisições devem informar `access_token` e `User-Agent`; chaves de Sandbox e Produção são distintas. | [Authentication](https://docs.asaas.com/docs/authentication-2) |
| Webhook | O endpoint deve validar o cabeçalho `asaas-access-token`. O token deve ter 32–255 caracteres, sem espaços, e não pode ser uma chave da API. | [Receive Asaas events](https://docs.asaas.com/docs/receive-asaas-events-at-your-webhook-endpoint) |
| Entrega de eventos | O Asaas entrega eventos ao menos uma vez; o processamento deve ser idempotente e devolver resposta 2xx com rapidez. | [Create new Webhook via API](https://docs.asaas.com/docs/create-new-webhook-via-api) |

## Implicações para o projeto

A configuração deve separar explicitamente o ambiente (`sandbox`), a URL base privada, a chave privada da API e o token independente de webhook. A aplicação deve continuar no modo `test` até que as variáveis obrigatórias estejam presentes e uma validação de autenticação no Sandbox seja aprovada. Nenhuma chave pode ser exposta ao frontend, incluída em arquivos versionados ou exibida em logs.
