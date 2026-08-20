# Diagnóstico de acesso interno — 20 de agosto de 2026

## Resumo

Foi investigado o relato de que a senha do acesso interno não era aceita. A análise confirmou que a autenticação por e-mail e senha era bem-sucedida; o bloqueio acontecia **depois** da autenticação, na validação do papel associado ao perfil.

> Nenhuma senha foi visualizada, solicitada, redefinida ou registrada durante o diagnóstico. A intervenção autorizada alterou somente o papel do perfil atual, de `customer` para `admin`.

## Causa raiz

Os registros de auditoria do Supabase indicaram que a conta anterior vinculada ao e-mail administrativo havia sido removida e uma nova conta para o mesmo e-mail havia sido criada. A nova conta conseguiu efetuar login, mas o perfil correspondente estava associado ao papel `customer`.

O fluxo da aplicação aceita a senha, carrega o perfil e permite as rotas internas apenas para `staff` ou `admin`. Como o novo perfil era `customer`, o fluxo encerrava o acesso com a mensagem genérica de credenciais, embora a senha estivesse correta.

| Camada | Evidência observada | Conclusão |
|---|---|---|
| Supabase Auth | Eventos de login bem-sucedidos para a conta atual. | A senha estava válida. |
| Perfil em `public.profiles` | O perfil atual possuía o papel `customer`. | O acesso administrativo era recusado pela regra de autorização. |
| Tela `/acesso` | O erro de papel interno era tratado junto com erro de credencial. | A mensagem exibida induzia a interpretação de senha inválida. |

## Intervenção autorizada

Após autorização explícita do responsável, foi promovido **somente o perfil atual identificado** para o papel `admin`. A atualização retornou a confirmação do papel resultante. Nenhum e-mail, senha, usuário adicional, pedido, cobrança, configuração de SMTP ou domínio foi modificado.

| Ação | Resultado |
|---|---|
| Atualizar papel do perfil atual de `customer` para `admin` | Concluída e confirmada. |
| Preservar a senha existente | Concluída; nenhuma redefinição foi acionada. |
| Separar mensagem de perfil sem acesso da mensagem de credencial inválida | Implementada localmente com regressão automatizada. |

## Correção de interface e teste de regressão

Foi criado primeiro um teste que falhava quando uma conta autenticada possuía um papel sem acesso interno. A falha comprovou que a tela sempre mostrava “Não foi possível entrar com essas credenciais.” A implementação passou a exibir uma orientação específica quando a senha foi aceita, mas o perfil ainda não foi liberado para a equipe.

| Verificação | Resultado |
|---|---|
| Teste específico de `StaffAccess` | 8 testes aprovados, incluindo a nova regressão. |
| Suíte completa | 256 testes aprovados e 2 pulados, em 80 arquivos. |
| Checagem TypeScript | Concluída sem erro. |
| Build da aplicação, PWA e runtime Vercel | Concluídos sem erro bloqueante. |
| `git diff --check` | Concluído sem erro de espaços. |

## Retomada e publicação

O papel administrativo já foi corrigido no Supabase. A confirmação visual posterior demonstrou um novo evento de login válido e a rota `/admin` exibiu a sessão autenticada, o e-mail da conta e todos os módulos administrativos. Portanto, o redirecionamento esperado após a autenticação foi comprovado sem alterar dados operacionais.

O aprimoramento de mensagem está validado no ambiente local e aguarda a decisão de publicação do próximo commit na branch `main`, pois esse envio pode iniciar uma implantação na Vercel.
