# Operação de acesso interno por e-mail e senha

## Objetivo e escopo

O acesso à **operação** e à **gestão administrativa** da Marmitas TB passa a usar credenciais individuais de e-mail e senha. Não há tela de cadastro público. Um usuário interno só pode ser criado ou convidado por uma pessoa que já possua papel de administrador.

> Senhas nunca são criadas, visualizadas ou transmitidas pela gestão. Cada colaborador as define no link individual recebido por e-mail.

| Pessoa | Rota de entrada | Destino após autenticação | Quem controla o acesso |
| --- | --- | --- | --- |
| Administrador | `/operacao` | `/admin` | Administradores |
| Equipe operacional | `/operacao` | `/operacao` | Administradores |
| Cliente ou usuário sem acesso | Não possui acesso interno | Sem acesso a operação ou gestão | Administradores |

## Fluxo para gestão da equipe

No módulo **Equipe e acessos** de `/admin`, informe o nome, e-mail e papel interno de quem entrará na operação. Ao selecionar **Enviar convite**, o servidor autenticado cria o usuário no Supabase Auth, registra o perfil com o papel escolhido e solicita ao Supabase o envio do e-mail de convite. A resposta do sistema não contém senha, token ou URL de recuperação.

Se o convite expirar ou o colaborador não o encontrar, use **Reenviar convite** na linha do membro. O servidor enviará um novo link para `/definir-senha`. Para desativar o acesso interno de alguém, altere seu papel para **Sem acesso**; isto converte o papel do perfil para `customer`, sem apagar o histórico de pedidos, despesas ou auditoria.

## Configurações externas obrigatórias antes da publicação

Em **20/08/2026**, o painel autenticado do projeto `hwkgplnzvcaobjozfmqx` foi acessado em `Authentication → Sign In / Providers`. As áreas `URL Configuration` e `Emails` também estão disponíveis no mesmo módulo de autenticação e serão usadas somente para os ajustes descritos abaixo.

Na verificação inicial, **Allow new users to sign up** estava ativado; o provedor **Email** e a confirmação de e-mail já estavam habilitados. Apenas a permissão de cadastro público será desativada, sem modificar usuários existentes.

Após a alteração autorizada, a opção **Allow new users to sign up** ficou desativada e a tela voltou ao estado sem alterações pendentes, confirmando o salvamento. O provedor **Email** e **Confirm email** foram mantidos habilitados.

Na verificação de **URL Configuration**, o `Site URL` já está definido como `https://marmitastb.vercel.app`. A lista permite `https://marmitastb.vercel.app/**`, que já cobre explicitamente a rota `/definir-senha`, e também permite os aliases de implantação `https://marmitas-*-andersonalves.vercel.app/**`. Portanto, nenhuma alteração adicional de URL foi necessária.

Em **Emails → SMTP Settings**, o SMTP personalizado está desativado. A habilitação exige host, porta, usuário, senha/chave e remetente verificado de um provedor transacional; como essas credenciais não foram fornecidas, nenhuma tentativa de ativação foi feita e a configuração atual foi preservada.

Estas configurações não são alteradas automaticamente pelo código e devem ser concluídas antes de liberar o novo bundle em produção.

| Local | Configuração | Valor ou ação necessária | Motivo |
| --- | --- | --- | --- |
| Supabase → Authentication → Providers → Email | Cadastro público | **Desativar** a opção que permite novos cadastros | Impede que qualquer visitante crie uma conta interna sem convite. |
| Supabase → Authentication → URL Configuration | Site URL | `https://marmitastb.vercel.app` | Define a origem principal para links de Auth. |
| Supabase → Authentication → URL Configuration | Redirect URLs | Adicionar `https://marmitastb.vercel.app/definir-senha` | Permite que convites e recuperação cheguem à tela segura de definição de senha. |
| Supabase → Authentication → URL Configuration | Redirect URLs de homologação | Adicionar a URL de preview usada na homologação, terminando em `/definir-senha` | Permite testar convite e recuperação fora da produção. |
| Supabase → Authentication → SMTP | Remetente transacional | Configurar SMTP autenticado e domínio/remetente da operação | Evita entrega limitada ou bloqueios dos e-mails de convite e recuperação. |
| Vercel → Environment Variables | `APP_URL` | `https://marmitastb.vercel.app` em Production | Faz o endpoint administrativo gerar convites apontando sempre ao domínio oficial. |

> Não cadastre `SUPABASE_SERVICE_ROLE_KEY` no cliente. Ela é utilizada somente pelas funções serverless administrativas para criar convites, consultar o usuário alvo e atualizar o perfil autorizado.

## Provedor SMTP selecionado

Para o volume inicial de convites e recuperação de senha, foi selecionado o **Resend** como provedor transacional. A escolha mantém a integração em SMTP padrão, suportada diretamente pelo Supabase, e evita depender do serviço de e-mail padrão do Supabase, que não é indicado para produção e possui restrições de entrega e de taxa. [1]

| Parâmetro | Valor previsto |
| --- | --- |
| Host SMTP | `smtp.resend.com` |
| Porta | `465` |
| Usuário SMTP | `resend` |
| Senha SMTP | Chave de API do Resend, registrada somente no painel do Supabase |
| Remetente | Endereço de um domínio verificado da Marmitas TB |

O plano gratuito informado pelo Resend prevê até 3.000 mensagens por mês e 100 por dia; o consumo deverá ser acompanhado caso a operação cresça. [2] [3] A conexão ainda requer a criação ou o acesso a uma conta Resend e a verificação do domínio/remetente. Essas etapas podem demandar confirmação por e-mail ou alteração de DNS pelo responsável pelo domínio; nenhuma conta, cobrança ou modificação de DNS será criada sem confirmação no respectivo provedor. [2]

Em 20/08/2026, a conta Resend vinculada a `cassia.andinho@gmail.com` foi encontrada autenticada, mas a área **Domains** não possui nenhum domínio cadastrado ou verificado. Portanto, ainda não há remetente próprio que possa ser utilizado com segurança no Supabase; a próxima etapa depende de um domínio que a Marmitas TB controle e de acesso ao DNS correspondente.

## Ativação inicial do administrador existente

Após a publicação autorizada e a configuração do Supabase, a conta administrativa já existente deve abrir `/operacao`, selecionar **Esqueci minha senha**, informar o próprio e-mail e concluir a definição em `/definir-senha`. A tela confirma a solicitação de modo neutro, sem revelar se um e-mail possui ou não conta cadastrada.

Depois disso, o administrador entra por e-mail e senha e pode convidar os demais membros. Não é necessário nem recomendado criar senha de colaborador no painel do Supabase.

## Roteiro de homologação

| Cenário | Resultado esperado |
| --- | --- |
| Administrador com senha correta | Login concluído e redirecionamento para `/admin`. |
| Membro `staff` com senha correta | Login concluído e redirecionamento para `/operacao`. |
| E-mail ou senha incorretos | Mensagem genérica, sem indicar qual credencial falhou. |
| Senha com menos de 12 caracteres | Formulário bloqueia o envio e explica a política mínima. |
| Recuperação de senha | Confirmação genérica e link para `/definir-senha`, se houver conta válida. |
| Novo convite administrativo | E-mail de convite; membro define a própria senha; nenhum token é exibido na gestão. |
| Reenvio de convite | Novo e-mail de definição de senha; nenhum link é exposto no painel. |
| Papel alterado para Sem acesso | Novo login interno não é permitido; dados históricos permanecem preservados. |

## Limites e observabilidade

O sistema registra a criação e as alterações por meio das rotas administrativas protegidas. A entrega efetiva dos e-mails depende do provedor SMTP configurado no Supabase; falhas de entrega devem ser investigadas no histórico de Auth/SMTP, sem solicitar que colaboradores compartilhem senhas ou links recebidos.

O código local foi validado com testes automatizados, checagem de tipos e builds. A ativação em produção requer publicação autorizada e a confirmação manual do roteiro acima.

## Referências

[1] [Supabase — Send emails with custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

[2] [Resend — Send emails using Supabase with SMTP](https://resend.com/docs/send-with-supabase-smtp)

[3] [Resend — What is Resend Pricing](https://resend.com/docs/knowledge-base/what-is-resend-pricing)
