# Acesso interno por senha com gestão restrita

**Data:** 19 de agosto de 2026  
**Status:** Aprovado para planejamento técnico  
**Decisão:** opção A — convite inicial controlado por gestores, seguido de login diário por e-mail e senha.

## Objetivo

Substituir o acesso interno diário por link de e-mail por credenciais individuais de **e-mail e senha**, sem permitir cadastro público. A alteração atende às áreas de gestão (`/admin`) e operação (`/operacao`), preserva os papéis atuais `admin`, `staff` e `customer` e reduz a dependência de links de uso único para o trabalho cotidiano.

> O link de e-mail deixa de ser a forma diária de entrada. Ele será utilizado somente para ativação inicial da conta e para recuperação de senha.

## Política de acesso aprovada

| Papel | Acesso diário | Administração de membros | Primeiro acesso |
|---|---|---|---|
| `admin` | E-mail e senha | Pode criar, convidar, desativar e alterar papel de membros internos | Pode definir ou redefinir a própria senha por e-mail seguro |
| `staff` | E-mail e senha | Não pode criar membros ou alterar permissões | Define a própria senha pelo convite inicial |
| `customer` | Sem acesso a `/admin` e `/operacao` | Não se aplica | Não recebe convite interno |
| Visitante | Sem autenticação interna | Não se aplica | Não existe auto cadastro |

O desenvolvedor não criará nem conhecerá senhas em produção. Ele entrega a capacidade técnica; a operação passa a controlar os próprios membros através de administradores autenticados e registrados em auditoria.

## Experiência de autenticação

### Login diário

A rota `/acesso` passa a apresentar um formulário com os campos **E-mail autorizado** e **Senha**, além de um botão de entrada. Quando o login for válido, a aplicação mantém a sessão persistida no mesmo navegador e redireciona conforme o papel: administradores para `/admin` e equipe operacional para `/operacao`.

A tela preserva os atalhos já existentes para **Ir para gestão** e **Voltar ao cardápio**. Ela exibirá um único link secundário, **Esqueci minha senha**, sem informar se o e-mail está ou não cadastrado, evitando enumeração de contas.

### Convite inicial

No módulo **Equipe e acessos**, disponível somente a administradores, será incluído o formulário **Adicionar membro**. O gestor informa o e-mail, o nome de exibição e o papel `staff` ou `admin`. O navegador chama um endpoint administrativo autenticado; somente o servidor usa a credencial de serviço para criar o usuário e solicitar o convite.

O e-mail recebido pelo colaborador aponta para `/definir-senha`. Nessa tela, a pessoa cria a própria senha e, após sucesso, entra no sistema. Nenhuma senha será apresentada ao gestor, ao desenvolvedor, em logs, em banco de dados da aplicação ou em e-mails.

### Recuperação de senha

O fluxo **Esqueci minha senha** solicita somente o e-mail. A resposta na interface é sempre genérica. Quando a conta for elegível, o provedor envia um e-mail de recuperação para `/definir-senha`; a nova senha invalida a necessidade de solicitar links de acesso no uso normal.

## Arquitetura e limites de segurança

O Supabase Auth continuará sendo a fonte de autenticação. O login diário usará a operação de senha no cliente com a chave pública já existente; operações privilegiadas de criação, convite, desativação e troca administrativa de papel permanecerão em endpoint Vercel protegido por sessão e pela verificação `private.is_admin()`.

O cadastro público de e-mail deverá ser desativado nas configurações de autenticação do Supabase. A chave `SUPABASE_SERVICE_ROLE_KEY` continuará acessível somente ao runtime do servidor e nunca será enviada ao navegador. A lista de URLs permitidas deve conter exclusivamente os redirecionamentos publicados necessários para `/definir-senha` em `https://marmitastb.vercel.app`.

| Controle | Regra de implementação |
|---|---|
| Cadastro público | Desativado no Supabase Auth; não haverá botão de criar conta no frontend. |
| Criação de membros | Apenas `admin`, por endpoint HTTP Vercel com validação de sessão e papel. |
| Senhas | Mínimo de 12 caracteres no formulário; nunca são registradas na aplicação. |
| Convites e recuperação | Links de uso único somente para definição/redefinição de senha. |
| Redirecionamento | Lista explícita de URLs de retorno publicadas; sem URL controlada por parâmetro do usuário. |
| Revogação | Alterar o papel para `customer` impede acesso interno; desativação de conta será ação administrativa explícita. |
| Auditoria | Criar convite, mudar papel, desativar e reenviar convite geram evento de auditoria com ator, alvo, data e ação. |

## Transição do modelo atual

A alteração não remove imediatamente contas existentes. Administradores já cadastrados permanecem elegíveis para receber uma redefinição de senha. Para cada membro da equipe ativo, o gestor realizará um convite controlado ou enviará uma redefinição de senha; depois de a senha ser criada, o acesso diário por link deixa de ser necessário.

Durante a transição, o endpoint antigo de solicitação de link será removido da interface e o servidor continuará recusando novos usuários não provisionados. A migração não cria clientes, não altera produtos, não cria pedidos e não modifica registros financeiros.

## Tratamento de falhas

| Cenário | Comportamento esperado |
|---|---|
| Credenciais inválidas | Mensagem neutra: “Não foi possível entrar com essas credenciais.” |
| Usuário sem papel interno | Sessão pode existir, mas a rota interna exibe acesso não autorizado e não mostra dados administrativos. |
| Convite já pendente | O gestor vê uma opção de reenviar convite, sem duplicar a conta. |
| E-mail já vinculado a conta | O servidor atualiza o papel se autorizado e oferece recuperação/reenvio em vez de recriar o usuário. |
| Link de convite expirado | A tela orienta a solicitar novo convite ao gestor. |
| Sessão expirada | O usuário retorna a `/acesso` e autentica-se com a senha; não depende de novo magic link. |

## Estratégia de testes

O desenvolvimento seguirá TDD. Serão cobertos, no mínimo, o bloqueio de auto cadastro, o login diário com senha, a recuperação com mensagem genérica, o redirecionamento por papel, o bloqueio de criação por não administradores, a criação de convite por administrador, a prevenção de segredo no frontend e os estados de conta já existente ou convite pendente.

Também serão preservados os testes de proteção de `/admin`, `/operacao`, fila operacional, equipe e auditoria. Ao final, serão executados a suíte completa, verificação TypeScript, build PWA, build Vercel e verificação visual das telas de acesso, definição de senha e equipe.

## Critérios de aceite

O fluxo será considerado pronto para homologação quando um administrador puder cadastrar um membro interno sem expor senha, o membro puder definir a própria senha por convite, o login diário funcionar sem link por e-mail, a recuperação de senha não revelar se uma conta existe e usuários sem `staff` ou `admin` não conseguirem acessar gestão ou operação.

## Referências

[1] [Supabase — Password-based Auth](https://supabase.com/docs/guides/auth/passwords)  
[2] [Supabase — Admin Create User](https://supabase.com/docs/reference/javascript/auth-admin-createuser)  
[3] [Supabase — Managing User Data](https://supabase.com/docs/guides/auth/managing-user-data)
