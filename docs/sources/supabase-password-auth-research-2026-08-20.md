# Referências de autenticação por e-mail e senha

Pesquisa realizada em 20 de agosto de 2026 para avaliar a migração do acesso interno da Marmitas TB.

- A documentação do Supabase descreve a autenticação baseada em senha por e-mail e os controles seguros associados: <https://supabase.com/docs/guides/auth/passwords>.
- A referência administrativa confirma que `auth.admin.createUser` cria usuários e deve ser chamada somente no servidor: <https://supabase.com/docs/reference/javascript/auth-admin-createuser>.
- A documentação de gestão de usuários descreve operações administrativas para controlar usuários autorizados: <https://supabase.com/docs/guides/auth/managing-user-data>.

Uso proposto: manter o cadastro público desativado, criar contas exclusivamente por ação administrativa autorizada, nunca expor a chave de serviço ao navegador e permitir que o usuário defina ou redefina a própria senha pelo fluxo seguro do provedor.
