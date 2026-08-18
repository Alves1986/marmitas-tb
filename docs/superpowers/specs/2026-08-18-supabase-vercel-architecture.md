# Arquitetura alvo — Supabase e Vercel

**Status:** aprovada para planejamento em 18 de agosto de 2026.  
**Decisões do proprietário:** migração completa; Supabase Auth substitui Manus OAuth; equipe entra por código OTP de e-mail; Vite permanece no frontend; Vercel executa as funções TypeScript; homologação inicial usa o domínio `vercel.app` e URLs de prévia.

## Objetivo e fronteiras

A Marmitas TB passará a operar independentemente da infraestrutura atual. O Supabase será a fonte de verdade de identidade, dados relacionais e arquivos futuros; a Vercel hospedará o aplicativo Vite e as funções de servidor. O catálogo e o acompanhamento de pedido continuarão públicos. Os painéis de operação e administração exigirão sessão Supabase e permissão apropriada.

O projeto atual contém um usuário e não contém pedidos, itens, eventos, catálogo ou configurações persistidas. Portanto, a migração deve priorizar a criação segura da estrutura e a verificação de integridade, mas não precisa converter histórico operacional nesta etapa.

> Nenhuma chave do Supabase, token de serviço, credencial de Asaas ou URL privada será versionada, enviada ao navegador ou registrada em logs.

## Visão arquitetural

```mermaid
flowchart LR
  C[Cliente web e PWA] -->|assets estáticos| V[Vercel: Vite/React]
  C -->|OTP por e-mail| SA[Supabase Auth]
  C -->|sessão JWT| API[Vercel Functions em TypeScript]
  API -->|service role somente no servidor| DB[(Supabase Postgres)]
  API -->|arquivos de catálogo| ST[Supabase Storage]
  API -->|pagamentos em modo teste| AS[Asaas Sandbox]
  AS -->|webhook autenticado| WH[/api/webhooks/asaas]
  DB -->|RLS e papéis| DB
  K[Computador quiosque] -->|consulta de fila| API
  API -->|jobs de impressão| DB
```

| Componente | Responsabilidade | Regra de segurança |
|---|---|---|
| **Vite/React/PWA** | Catálogo, carrinho local, checkout, acompanhamento e painéis. | Usa apenas URL e chave publicável do Supabase; nunca usa `service_role`. |
| **Supabase Auth** | Sessões da equipe por OTP de e-mail. | Não cria contas automaticamente; apenas e-mails previamente provisionados podem receber código. |
| **Supabase Postgres** | Pedidos, cardápio, eventos, impressão, configurações e perfis. | RLS habilitado em todas as tabelas expostas; privilégios mínimos para `anon` e `authenticated`. |
| **Supabase Storage** | Imagens futuras do cardápio e ativos gerenciados. | Bucket público somente para leitura de catálogo; escrita via função autenticada de administração. |
| **Vercel Functions** | Operações de domínio, pedidos, status, webhook e Asaas. | Verificam JWT/papel quando aplicável; concentram chaves privadas e chamadas com efeito financeiro. |
| **Asaas** | Permanece em Sandbox e bloqueado sem chaves válidas. | Webhook aceita apenas token dedicado e processa eventos de modo idempotente. |

## Identidade, papéis e acesso

O fluxo de equipe usa o OTP por e-mail do Supabase. A tela de acesso solicitará o e-mail, chamará `signInWithOtp` com `shouldCreateUser: false` e exigirá a confirmação do código. A criação de contas não ocorrerá pelo aplicativo: um administrador provisionará o usuário pelo caminho administrativo server-side, criando o registro no Auth e o perfil correspondente.

O banco terá `profiles.id uuid primary key references auth.users(id) on delete cascade`, nome, e-mail, papel, datas de criação e último acesso. Os papéis preservados serão `user`, `staff` e `admin`; somente `staff` e `admin` serão elegíveis para OTP na etapa atual. O papel será consultado no servidor e refletido em claim de JWT por Custom Access Token Hook para uso nas políticas RLS. A tabela de perfis continuará sendo a fonte de verdade para alterações de papel.

| Recurso | Público anônimo | Usuário autenticado | `staff` | `admin` |
|---|---:|---:|---:|---:|
| Categorias e produtos ativos | Leitura | Leitura | Leitura | Gerenciamento |
| Criar pedido | Via função pública validada | Via função pública validada | Não aplicável | Não aplicável |
| Acompanhar pedido | Via código + telefone, com resposta reduzida | Igual | Igual | Igual |
| Fila operacional, alteração de status e comanda | Não | Não | Sim | Sim |
| Equipe, cardápio integral e configurações | Não | Não | Não | Sim |
| Chaves, Asaas e Storage administrativo | Nunca | Nunca | Via função limitada | Via função limitada |

As funções usarão a chave de serviço apenas no ambiente de servidor e validarão a sessão/papel recebidos antes de qualquer operação privilegiada. A chave publicável serve apenas ao cliente, sujeito às políticas RLS.

## Modelo de dados Postgres

As dez entidades operacionais atuais serão recriadas em `public`, preservando relação e índice. O identificador de negócio de pedidos continua sendo `code`; números monetários permanecem em centavos inteiros.

| Origem atual | Destino Supabase | Ajustes planejados |
|---|---|---|
| `users` | `profiles` + `auth.users` | Trocar `openId` por UUID do Auth; papel fica em perfil e claim. |
| `categories`, `products`, `productOptions` | Mesmas entidades em Postgres | `boolean`, `text`, `bigint identity`, chaves e índice de categoria. |
| `orders`, `orderItems`, `orderEvents` | Mesmas entidades em Postgres | `configuration_json` passa a `jsonb`; datas passam a `timestamptz`; preservar índices de status, telefone normalizado e código. |
| `paymentEvents` | Mesma entidade em Postgres | Payload em `jsonb`; índice único de provedor + evento permanece. |
| `printJobs` | Mesma entidade em Postgres | Fila persistente para o computador de cozinha consultar e imprimir. |
| `storeSettings` | Mesma entidade em Postgres | Mudanças exclusivamente administrativas e auditáveis. |

As migrações SQL serão versionadas em `supabase/migrations/`. Cada tabela receberá `revoke` explícito de privilégios excessivos, RLS habilitado e políticas mínimas. O catálogo ativo terá somente `select` anônimo. Pedidos, eventos de pagamento, impressão e configurações não terão acesso direto do cliente; serão manipulados pelas funções server-side, que aplicarão validações de domínio já existentes. A busca pública por pedido não exporá endereço, nome completo ou dados de pagamento além do necessário para acompanhamento.

## API na Vercel

O frontend continuará chamando o contrato de aplicação sob `/api`. A implementação trocará o processo Express persistente por handlers TypeScript serverless sem estado. Serviços puros de domínio — cálculo de pedido, transições, código de pedido, adaptação de pagamento e normalização de telefone — serão extraídos do servidor atual e compartilhados pelos handlers e testes.

| Rota/função | Origem | Comportamento de destino |
|---|---|---|
| `/api/auth/*` | OAuth e sessão Manus | OTP é executado pelo SDK Supabase no cliente; funções só verificam JWT e perfil. |
| `/api/catalog/*` | tRPC público/admin | Leitura pública limitada por RLS; mutações administrativas em função autenticada. |
| `/api/orders/*` | tRPC de pedido e acompanhamento | Criação transacional server-side; rastreamento por código+telefone ou telefone retorna dados mínimos. |
| `/api/operations/*` | tRPC protegido | Exige JWT com papel `staff` ou `admin`; controla fila, status, alertas e jobs de impressão. |
| `/api/admin/*` | tRPC administrativo | Exige `admin`; controla equipe, cardápio e configurações. |
| `/api/webhooks/asaas` | Rota Express atual | Handler serverless dedicado; verifica token dedicado, preserva idempotência e não cria cobrança sem Sandbox configurado. |

Não haverá serviço contínuo para impressora. O navegador do posto de cozinha continuará consultando a fila autenticada, emitindo alertas e acionando a impressão local quando houver um `print_job` pendente. Isso é compatível com execução serverless porque o estado vive no Postgres, não na função.

## Storage e ativos

As imagens já referenciadas por URLs externas continuarão disponíveis durante a migração. Para novos uploads, será criado o bucket `catalogo` no Supabase Storage. Leitura de arquivos publicados será pública; upload, remoção e substituição serão feitos exclusivamente por função administrativa que valida `admin`, tamanho, MIME e nome do objeto. A aplicação guardará a URL ou a chave de armazenamento no produto, sem bytes em tabelas do banco.

## Ambientes, segredos e entrega

Vercel Preview será o ambiente de homologação inicial e receberá a URL `*.vercel.app`. A URL de produção só será adicionada à lista de redirecionamentos do Supabase quando o domínio estiver definido. A arquitetura é preparada para separar Supabase de homologação e Supabase de produção; se os projetos existentes tiverem apenas um ambiente, a conexão só poderá ser aceita após confirmação explícita do proprietário sobre a separação de dados.

| Variável | Local | Vercel Preview/Produção | Exposição |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `.env.local` ignorado | Variável de build | Publicável no cliente |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env.local` ignorado | Variável de build | Publicável no cliente, protegida por RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local` ignorado | Apenas função server-side | Secreta |
| `ASAAS_ENVIRONMENT`, `ASAAS_API_URL` | Ambiente local | Apenas função server-side | Sandbox restrito |
| `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` | Ambiente local | Apenas função server-side | Secretas; permanecem ausentes nesta fase |
| `APP_URL` | Ambiente local | Preview/Produção específico | Não secreta; usada para redirect seguro |

O repositório continuará sendo a fonte de código. A Vercel será conectada ao repositório GitHub existente com diretório raiz `marmitastb/`, instalação via `pnpm`, build `pnpm build` e reescrita de SPA sem afetar caminhos `/api`. A publicação continua dependente de confirmação explícita do usuário; nenhum deploy será realizado automaticamente nesta tarefa.

## Segurança, testes e corte

Antes de apontar usuários para o novo ambiente, a migração precisará comprovar o isolamento por RLS, a recusa de OTP para e-mails não provisionados, a proibição de `service_role` no bundle, as permissões de cada papel, a criação de pedido pública, o rastreamento com resposta reduzida, a idempotência do webhook e o bloqueio do Asaas sem segredos. A suíte unitária existente continuará a cobrir regras de pedido e pagamento; serão acrescentados testes para Supabase, funções serverless e políticas SQL.

O corte será reversível. O ambiente atual permanece intacto até a aprovação de uma prévia funcional na Vercel. Como não há dados operacionais para transportar, o rollback consiste em manter o tráfego no ambiente atual e desabilitar a URL de prévia; nenhuma exclusão será efetuada nas fontes atuais.

## Referências

1. [Supabase — Migrar de MySQL para Supabase](https://supabase.com/docs/guides/platform/migrating-to-supabase/mysql).
2. [Supabase — Login sem senha por e-mail](https://supabase.com/docs/guides/auth/auth-email-passwordless).
3. [Supabase — RBAC com claims personalizados](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac).
4. [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
5. [Vercel — Supabase Marketplace Integration](https://vercel.com/marketplace/supabase).
