# Desenho de limite de funções Vercel Hobby

**Status:** Aprovado para revisão formal em 18 de agosto de 2026.

## Objetivo

A Marmitas TB deve permanecer compatível com o limite de funções serverless do plano Vercel Hobby sem reduzir recursos, sem alterar URLs públicas e sem disparar nova implantação durante esta etapa. O incidente anterior confirmou que a descoberta de módulos sob `api/` excedeu o limite aceito pelo plano e interrompeu a compilação antes de disponibilizar conteúdo.

> A solução aprovada preserva os handlers HTTP em `api/` e retira apenas bibliotecas, repositórios e testes internos desse diretório.

## Arquitetura aprovada

Os nove endpoints de borda continuam versionados sob `api/`, cada um como função HTTP independente. Os módulos internos passam para `server/vercel/`, deixando explícito que não são rotas públicas. Os imports dos handlers serão atualizados de forma relativa, mas os contratos HTTP, os métodos aceitos, as mensagens de erro e a autenticação Supabase permanecem inalterados.

| Camada | Local após a alteração | Responsabilidade | Exposição HTTP |
|---|---|---|---|
| Handlers públicos, administrativos, operacionais e webhook | `api/**` | Receber `Request`, validar método e delegar para domínio | Sim, nove endpoints |
| Bibliotecas de HTTP, Auth, configuração e Supabase | `server/vercel/_lib/**` | Respostas padronizadas, sessão, variáveis e clientes | Não |
| Domínio e repositório de pedidos | `server/vercel/_lib/**` | Validação, transições e persistência Supabase | Não |
| Testes de funções | `server/vercel/**/*.test.ts` | Cobrir contratos, falhas e segurança | Não |

Os caminhos externos preservados são `/api/public/menu`, `/api/public/orders`, `/api/operations/orders`, `/api/operations/alerts`, `/api/operations/printJobs`, `/api/admin/catalog`, `/api/admin/staff`, `/api/admin/settings` e `/api/webhooks/asaas`.

## Fluxo de dados

O navegador continua chamando a mesma URL. A função sob `api/` recebe a solicitação e importa o domínio interno de `server/vercel/_lib`. Autenticação, autoria UUID e acesso ao Supabase são derivados exclusivamente no servidor, como já ocorre. A mudança é estrutural: não cria rota, não altera payload e não adiciona credenciais.

Falhas de importação, método inválido, sessão inexistente, papel insuficiente e falha Supabase devem manter a resposta atual. Um erro estrutural durante a reorganização é bloqueador e deve ser detectado por testes, `pnpm check` e `pnpm build` antes de qualquer nova prévia.

## Estratégia de validação

Primeiro, uma especificação automatizada verificará a contagem de arquivos de entrada sob `api/` e a ausência de módulos internos nesse diretório. Depois, a suíte existente será transferida com seus módulos, preservando os contratos de cada handler. Por fim, serão executados testes completos, checagem TypeScript e build de produção. A prévia Vercel continua bloqueada até aprovação explícita posterior.

## Limites de escopo

Este trabalho não conecta Git à Vercel, não executa deploy, não altera domínio, não altera variáveis de ambiente e não modifica o repositório existente `Alves1986/ministral`. Também não consolida os nove handlers em uma função curinga, pois isso aumentaria risco de regressão sem necessidade.

## Referências

[1]: https://vercel.com/docs/functions/limitations "Vercel Functions limits"
[2]: https://vercel.com/docs/functions/runtimes/node-js "Vercel Node.js functions"
