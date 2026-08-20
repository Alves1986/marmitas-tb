# Plano de implementação — acesso interno por e-mail e senha

## Objetivo

Substituir o acesso diário da equipe por magic link pelo login individual com **e-mail e senha**, sem alterar os papéis `customer`, `staff` e `admin` já existentes. Não haverá auto cadastro público: somente usuários `admin` poderão provisionar, reenviar a ativação, redefinir credenciais ou remover o acesso interno de outro membro.

O convite inicial e a recuperação de senha continuarão a usar um e-mail de uso único. Eles servirão apenas para o colaborador definir ou redefinir sua própria senha; nunca serão o mecanismo de login diário.

## Premissas e limites

| Item | Decisão |
|---|---|
| Cadastro público | Permanecerá desativado nas configurações do Supabase Auth. |
| Senhas | Nunca serão criadas, retornadas, registradas em logs ou visualizadas por gestores ou desenvolvedor. |
| Primeiro acesso | O gestor cria o membro e o Supabase envia convite seguro para `/definir-senha`. |
| Acesso diário | Tela `/acesso` autentica via `signInWithPassword`. |
| Revogação | O gestor rebaixa o perfil para `customer`, encerrando a permissão interna sem excluir o histórico. |
| Dados e banco | Nenhuma migração é necessária; a tabela `profiles` e os papéis existentes serão reutilizados. |
| Produção | A ativação de e-mail/senha e a desativação de signups só serão publicadas mediante autorização específica, porque modificam a entrada de usuários. |

## Alterações externas a preparar no Supabase

Antes de publicar o novo fluxo, o responsável deverá confirmar, no painel do Supabase Auth:

1. **Email signups** desativado, para impedir criação pública de contas.
2. URL do site definida como `https://marmitastb.vercel.app`.
3. `https://marmitastb.vercel.app/definir-senha` incluída na lista de redirect URLs.
4. Template de convite/redefinição revisado e SMTP transacional configurado quando a operação deixar de ser de homologação.

Essas configurações não serão alteradas durante a implementação local. Enquanto o SMTP próprio não estiver configurado, o envio continuará sujeito ao provedor padrão do Supabase e suas limitações operacionais.

## Fluxos funcionais

### 1. Login diário

1. A pessoa abre `/acesso`.
2. Informa e-mail e senha individual.
3. O cliente chama `supabase.auth.signInWithPassword`.
4. A sessão persistida é carregada pelo `useAuth` já existente.
5. `staff` é direcionado para `/operacao`; `admin` pode acessar `/admin` e `/operacao`; qualquer outro papel é recusado da área interna.
6. Erros de credencial recebem mensagem genérica, sem revelar se determinado e-mail existe.

### 2. Ativação inicial de membro

1. Um administrador abre **Equipe** no painel.
2. Informa nome de exibição, e-mail e papel (`staff` ou `admin`).
3. O frontend chama o endpoint administrativo autenticado.
4. O servidor valida o papel do solicitante, normaliza o e-mail e usa apenas o cliente Supabase com chave de serviço para criar/enviar o convite.
5. O servidor atualiza o registro `profiles` criado pelo fluxo de Auth com `display_name` e papel aprovado.
6. O colaborador recebe um link de ativação, abre `/definir-senha`, escolhe uma senha de ao menos 12 caracteres e passa a usar o login diário.

### 3. Reenvio e recuperação

1. Um gestor pode reenviar o convite de ativação para um membro pendente ou enviar recuperação para um membro ativo.
2. A pessoa também pode solicitar recuperação em `/acesso`, sempre recebendo resposta genérica.
3. O link leva a `/definir-senha`, onde a sessão de recuperação é validada antes da atualização da senha.
4. O resultado não expõe senha, token, existência de conta ou detalhes de perfil na interface nem em logs.

### 4. Revogação de acesso

1. O administrador seleciona **Remover acesso interno**.
2. A aplicação exige confirmação explícita e altera o papel para `customer`.
3. A pessoa deixa de satisfazer os guardas `staff`/`admin` imediatamente, mas pedidos e registros históricos permanecem intactos.
4. A reativação exige nova atribuição de papel e o reenvio da definição de senha, quando necessário.

## Implementação por etapas

### Etapa 1 — Contratos de autenticação e testes do login

**Arquivos a alterar/criar**

- `client/src/lib/supabaseAuth.ts`
- `client/src/lib/supabaseAuth.test.ts` (ou o arquivo de cobertura existente do módulo)
- `client/src/pages/StaffAccess.tsx`
- `client/src/pages/StaffAccess.test.tsx`

**TDD**

1. Criar testes que falham para `signInWithPassword`, normalização do e-mail, senha mínima de 12 caracteres e mensagem genérica em falha.
2. Implementar `signInWithPassword` com timeout equivalente ao atual, removendo a dependência de `requestTeamOtp` do acesso diário.
3. Atualizar a tela para campos de e-mail e senha, opção de recuperação e estados de carregamento/acessibilidade.
4. Garantir que `shouldCreateUser` não seja usado no fluxo diário e que nenhum código de senha seja escrito em console, toast ou armazenamento local manual.

### Etapa 2 — Rotas de definição e recuperação de senha

**Arquivos a alterar/criar**

- `client/src/App.tsx`
- `client/src/pages/SetPassword.tsx` (novo)
- `client/src/pages/SetPassword.test.tsx` (novo)
- `client/src/lib/supabaseAuth.ts`

**TDD**

1. Adicionar testes que falham para a rota `/definir-senha`, confirmação de senha, regra de 12 caracteres e redirecionamento seguro após conclusão.
2. Criar a página que chama `supabase.auth.updateUser({ password })` apenas depois de detectar uma sessão de recuperação/convite válida.
3. Redirecionar `staff` para `/operacao` e `admin` para `/admin` depois de atualizar a senha e carregar o papel do perfil.
4. Adicionar a rota sem tratá-la como tela pública de catálogo, preservando as proteções de área interna e o comportamento do PWA.

### Etapa 3 — API administrativa de provisionamento

**Arquivos a alterar/criar**

- `api/admin/staff.ts`
- `server/vercel/admin/staff.test.ts`
- `server/vercel/_lib/supabaseAdmin.ts` (somente se for necessário expor método tipado já compatível)

**Contratos HTTP propostos**

| Método | Rota | Corpo | Resultado |
|---|---|---|---|
| `GET` | `/api/admin/staff` | — | Lista membros com e-mail, nome, papel e situação de acesso. |
| `POST` | `/api/admin/staff` | `email`, `displayName`, `role` | Cria convite inicial, atualiza perfil e retorna somente metadados seguros. |
| `PATCH` | `/api/admin/staff` | `userId`, `role` | Altera papel, inclusive revogação para `customer`. |
| `POST` | `/api/admin/staff/:id/activation` | ação `invite` ou `recovery` | Reenvia ativação/redefinição sem retornar token. |

**TDD**

1. Cobrir `401`/`403` para qualquer solicitante sem papel administrativo.
2. Cobrir validação de e-mail, nome e papéis permitidos; recusar `customer` na criação interna.
3. Cobrir criação que chama exclusivamente o Supabase Admin no servidor, grava perfil e não retorna senha ou token.
4. Cobrir reenvio, revogação e erros do provedor com mensagens neutras.
5. Manter a checagem de sessão Bearer e os guardas existentes em `server/vercel/_lib/auth.ts`.

### Etapa 4 — Gestão de equipe no painel

**Arquivos a alterar/criar**

- `client/src/services/adminService.ts`
- `client/src/services/adminService.test.ts`
- `client/src/components/admin/StaffManager.tsx`
- `client/src/components/admin/admin.test.tsx`

**TDD**

1. Estender tipos e mocks para e-mail, estado do convite e ações administrativas, sem materializar senhas no browser.
2. Criar regressões para formulário **Adicionar membro**, confirmação de remoção de acesso, reenvio de ativação e estados de erro.
3. Implementar o formulário e as ações somente quando o usuário atual for `admin`.
4. Manter a lista de membros e a alteração de papéis, retirando o aviso obsoleto de que a pessoa precisa entrar uma vez para aparecer na equipe.

### Etapa 5 — Configuração externa, validação e publicação

1. Sem tocar na configuração de produção, validar localmente os fluxos com mocks e clientes Supabase de teste.
2. Executar `pnpm test`, `pnpm check`, `pnpm build` e `pnpm build:vercel-runtime`.
3. Conferir que o build não incluiu chaves, senhas, tokens ou URLs de redefinição em artefatos públicos.
4. Salvar checkpoint e solicitar autorização explícita para publicar o código.
5. Após a publicação autorizada e a configuração manual do Supabase, executar uma homologação controlada: criar membro de teste, definir senha, entrar, revogar papel e confirmar bloqueio da área interna.

## Critérios de aceite

- Um gestor pode convidar um novo `staff` ou `admin` sem usar o painel Supabase e sem visualizar senha.
- Não existe ação de cadastro público, nem chamada de `signUp` no cliente.
- Uma pessoa ativada entra diariamente por e-mail e senha; não pede magic link enquanto a sessão persistir.
- A redefinição exige link de uso único e permite escolher nova senha de pelo menos 12 caracteres.
- O rebaixamento para `customer` bloqueia `/operacao` e `/admin` em nova validação de sessão.
- Nenhuma resposta de API, log, teste ou interface contém senha, chave de serviço ou token de convite.
- Todos os testes, tipagem e builds previstos terminam sem falhas.
