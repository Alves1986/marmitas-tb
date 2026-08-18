# Homologação Supabase e Vercel

## Objetivo

Este roteiro controla a passagem da Marmitas TB para **Supabase** e **Vercel** sem ativar uma publicação de produção. Ele deve ser preenchido durante uma prévia explicitamente autorizada; não substitui a validação operacional da cozinha nem autoriza cobranças no Asaas.

## Estado registrado

O projeto Vercel `marmitas-tb` foi criado sem repositório conectado e sem deployment. O domínio `marmitastb.vercel.app` está configurado no painel Vercel, mas não há preview ou produção publicada. O responsável confirmou que as variáveis de ambiente foram cadastradas no cofre da Vercel e que a URL de autenticação do Supabase já aponta ao domínio informado. Os valores das variáveis não foram registrados neste documento.

| Item | Situação | Evidência ou condição |
| --- | --- | --- |
| Projeto Supabase `hwkgplnzvcaobjozfmqx` | Concluído | Schema inicial, RLS, catálogo e Storage foram migrados. |
| Projeto Vercel `marmitas-tb` | Concluído | Projeto vazio criado; Git não conectado e nenhum deployment iniciado. |
| Domínio `marmitastb.vercel.app` | Concluído | Painel indica domínio corretamente configurado, sem deployment. |
| Variáveis na Vercel | Declarado pelo responsável | Devem ser verificadas apenas em uma prévia autorizada, sem expor valores. |
| URL base do Supabase Auth | Declarado pelo responsável | Antes do OTP, confirmar uso de HTTPS e Redirect URL da prévia. |
| Migração do webhook Asaas | Concluído | `20260818190000_process_asaas_webhook_event.sql` aplicada e a função RPC foi verificada como restrita à `service_role`. |
| Segredos Asaas | Bloqueado por decisão operacional | `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN` continuam ausentes. |

## Prévia autorizada

Quando uma prévia for autorizada, conecte a branch `feat/supabase-vercel-migration` ao projeto Vercel, configure `marmitastb/` como diretório raiz e dispare **somente uma implantação de Preview**. Não acione Production nem altere o domínio durante esse procedimento.

> A prévia é necessária para verificar a presença das variáveis em build e funções, validar o domínio HTTPS e testar o retorno do OTP. Nenhuma chave sensível deve aparecer em logs, capturas de tela ou artefatos de build.

| Verificação de aceitação | Resultado esperado | Status |
| --- | --- | --- |
| Vitrine e carrinho | Catálogo ativo, total em BRL e carrinho persistente após recarregar. | Pendente de prévia |
| OTP da equipe | E-mail provisionado recebe código; e-mail não provisionado não recebe acesso. | Pendente de prévia |
| Operação | Perfil `staff` usa a fila e não acessa catálogo administrativo. | Pendente de prévia |
| Administração | Perfil `admin` altera catálogo, equipe e configurações por endpoints Vercel. | Pendente de prévia |
| Rastreio público | Telefone retorna dados reduzidos; código com telefone retorna apenas o pedido correspondente. | Pendente de prévia |
| Webhook Asaas | Sem token, responde `401`; sem credenciais Sandbox, responde `503`. | Pendente de prévia |
| Segredos no build | Nenhum arquivo em `dist` contém chaves de serviço ou tokens Asaas. | Pendente de prévia |

## Autoria de auditoria por runtime

| Ambiente | Canal de mutação | Identidade persistida |
| --- | --- | --- |
| Preview/Production Vercel | Funções `/api` Vercel + Supabase | UUID de `profiles.id` derivado exclusivamente do Bearer token validado |
| Desenvolvimento local | tRPC + MySQL | Número de `users.id`, sem interoperabilidade com Supabase |

No runtime Vercel, as consultas tRPC da fila operacional ficam explicitamente desativadas. As mutações de catálogo, equipe, configurações, operações, alertas e impressão percorrem os serviços Vercel/Supabase; UUIDs recebidos no JSON não podem substituir o UUID extraído pelo guarda de sessão. O legado numérico permanece restrito ao fallback de desenvolvimento e não recebe UUIDs do Supabase.

Uma prévia somente poderá ser aceita se as ferramentas de rede não registrarem requisições a `/api/trpc` durante ações administrativas e operacionais no runtime Vercel.

## Critérios para avançar

Somente após todos os testes de prévia serem aprovados, a migração de dados operacionais estar verificada e o responsável autorizar expressamente uma publicação será possível conectar a branch padrão e iniciar o fluxo de produção. Até esse ponto, as rotas tRPC/MySQL permanecem como fallback local deliberado e não devem receber UUIDs do Supabase.
