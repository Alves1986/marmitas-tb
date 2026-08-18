# Corte de Auditoria por Runtime — Marmitas TB

**Autora:** Manus AI  
**Data:** 18 de agosto de 2026  
**Status:** Aguardando revisão do responsável

## Objetivo

Consolidar a autoria de mudanças produtivas no Supabase com UUIDs de `profiles.id`, sem converter nem reutilizar os identificadores numéricos do MySQL. A aplicação em produção/homologação deverá usar apenas as funções Vercel protegidas por sessão Supabase. O tRPC/MySQL será preservado como fallback de desenvolvimento local e referência histórica até sua retirada planejada.

## Decisão aprovada

O projeto adotará o **corte por runtime**, em vez de escrita dupla ou conversão integral do banco MySQL. A seleção já existente por `isVercelRuntime()` continua sendo a fronteira de execução: quando o build é de produção e `VITE_API_RUNTIME=vercel`, mutações administrativas e operacionais usam exclusivamente os endpoints `/api` da Vercel.

| Contexto | Persistência permitida | Identidade de auditoria |
|---|---|---|
| Homologação ou produção Vercel | Supabase Postgres por funções Vercel | UUID de `profiles.id` |
| Desenvolvimento local | tRPC/MySQL legado | ID numérico de `users.id` |
| Exportação histórica | Somente leitura no MySQL | ID numérico preservado como referência, sem conversão implícita |

## Componentes e contratos

Os adaptadores do cliente para catálogo, equipe, configurações e operação devem manter uma fronteira explícita: no runtime Vercel, chamam `apiRequest()` e recebem UUIDs; fora dele, acionam o fallback tRPC tipado. Nenhuma camada do cliente pode converter um ID numérico em UUID, nem permitir que um UUID seja enviado a uma mutação do legado.

As funções Vercel devem obter o ator apenas de `requireUser`, `requireStaff` ou `requireAdmin`. O corpo HTTP jamais fornece um `actorUserId` confiável. Os handlers encaminham `actor.id`, que é o UUID validado no token e no perfil Supabase, às gravações de `order_events` e `store_settings`.

> O ID numérico legado não é um identificador interoperável. Ele somente permanece nos snapshots de exportação e na camada de desenvolvimento local até a desativação consciente do MySQL.

## Segurança e tratamento de falhas

As rotas Vercel retornam erro de autenticação ou autorização antes de qualquer gravação. Se uma mutação Supabase falhar após a atualização principal, a API retorna erro e não simula sucesso. A autoria do evento não pode ser substituída por parâmetros do navegador.

## Estratégia de testes

Os testes acrescentados devem comprovar três propriedades. Primeiro, cada rota Vercel usa o UUID retornado pelo guarda de autenticação, ignorando um eventual campo de autoria no corpo. Segundo, os adaptadores do painel chamam a API HTTP quando `isVercelRuntime()` é verdadeiro e não invocam o fallback tRPC. Terceiro, os fluxos legados permanecem limitados aos seus testes de desenvolvimento e aceitam apenas IDs numéricos.

## Critérios de aceite

- Não há chamada tRPC de mutação administrativa ou operacional quando o runtime Vercel está ativo.
- Eventos e configurações gravados no Supabase recebem UUIDs obtidos da sessão, não do cliente.
- Não existe conversão automática entre IDs numéricos e UUIDs.
- Testes, checagem TypeScript e build de produção concluem com sucesso.
- Nenhuma conexão Git, deployment ou cobrança é iniciada durante a alteração.

## Fora de escopo

Esta etapa não remove as tabelas MySQL, não altera a conta de cobrança Asaas, não cria uma prévia Vercel e não migra perfis OAuth históricos. Esses assuntos dependem de validação de prévia, credenciais ou uma decisão de descontinuação do legado.
