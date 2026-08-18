# Homologação segura do Asaas

## Finalidade

Este procedimento prepara a Marmitas TB para integração no ambiente **Sandbox** do Asaas. O Sandbox é separado de Produção e utiliza a base `https://api-sandbox.asaas.com/v3`; portanto, esta etapa não deve criar ou movimentar cobranças reais. [1]

## Estado atual da preparação

O projeto está restrito ao ambiente Sandbox e valida localmente a URL, o formato de chave e o token de webhook. A função Vercel `POST /api/webhooks/asaas` já rejeita chamadas sem token e permanece indisponível enquanto as duas credenciais privadas não estiverem presentes. Por decisão operacional, **`ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN` ainda não foram cadastrados**. Assim, a sonda externa, o recebimento autenticado de webhook e qualquer cobrança oficial permanecem bloqueados de forma segura. O próximo responsável deve cadastrar ambos exclusivamente no cofre de segredos, aplicar a migração `20260818190000_process_asaas_webhook_event.sql` no Supabase e executar as verificações descritas nesta página.

## Cadastro protegido das variáveis

| Variável | Valor permitido | Tratamento |
| --- | --- | --- |
| `ASAAS_ENVIRONMENT` | `sandbox` | Configuração exclusiva do servidor. |
| `ASAAS_API_URL` | `https://api-sandbox.asaas.com/v3` | Configuração exclusiva do servidor. |
| `ASAAS_API_KEY` | Chave de API da conta Sandbox, iniciada por `aact_hmlg_` ou `$aact_hmlg_` | Segredo privado. |
| `ASAAS_WEBHOOK_TOKEN` | Texto aleatório, sem espaços, entre 32 e 255 caracteres e diferente da chave da API | Segredo privado. |

Crie uma conta Sandbox independente e gere uma chave identificada como **Marmitas TB — Homologação**. O Asaas orienta que a chave nunca seja exposta no frontend, em repositórios ou em logs. [2]

Registre a chave e o token exclusivamente no cofre de segredos do projeto. Não envie esses valores por mensagens, não os adicione a `.env.example`, não os publique no GitHub e não crie variáveis com prefixo `VITE_`, pois estas podem ser incorporadas ao cliente.

## Validação sem cobrança

A validação técnica consulta apenas `GET /myAccount/status`, endpoint de leitura que retorna a situação cadastral da conta. Ela não cria cliente, cobrança, pagamento ou transferência. [3]

Após cadastrar os segredos, execute a guarda automatizada `pnpm vitest run server/services/asaasSandboxConfig.secret.test.ts`. Um resultado aprovado confirma que a aplicação reconheceu uma configuração Sandbox pronta. Qualquer falha deve ser corrigida no cofre de segredos, sem copiar a chave para terminal, arquivos ou logs.

> A aplicação mantém o modo de pagamento `test` até uma decisão operacional explícita posterior. Esta homologação não ativa o gateway em Produção.

## Configuração manual do webhook

Depois de autorizar uma prévia HTTPS acessível, registre manualmente no painel Sandbox do Asaas o endpoint `https://SEU-DOMINIO/api/webhooks/asaas`. Configure o mesmo `ASAAS_WEBHOOK_TOKEN` no campo de token de acesso. O Asaas envia esse valor pelo cabeçalho `asaas-access-token`, que a aplicação compara em tempo constante antes de processar qualquer evento. [4]

Cadastre somente os eventos necessários à operação: `PAYMENT_CREATED`, `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE` e `PAYMENT_REFUNDED`. A função registra cada evento com chave única `(provider, external_event_id)` e, para confirmações de pagamento, atualiza o pedido, a auditoria e a fila de impressão em uma única transação no Postgres. Reenvios do mesmo evento recebem sucesso sem duplicar efeitos operacionais. [4]

Em caso de falha, consulte os registros de entrega no painel Sandbox do Asaas e confirme a URL, o código HTTP e a equivalência do token sem revelar o valor do token. Não altere o ambiente para Produção para contornar uma falha de homologação.

## Referências

[1] [Asaas — Sandbox](https://docs.asaas.com/docs/sandbox)

[2] [Asaas — Authentication](https://docs.asaas.com/docs/authentication-2)

[3] [Asaas — Consultar situação cadastral da conta](https://docs.asaas.com/reference/consultar-situacao-cadastral-da-conta)

[4] [Asaas — Receber eventos no webhook](https://docs.asaas.com/docs/receive-asaas-events-at-your-webhook-endpoint)
