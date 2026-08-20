# Guia Técnico de Arquitetura e Manutenção — Marmitas TB

**Versão:** 1.0  
**Última atualização:** 20 de agosto de 2026  
**Projeto de aplicação:** `marmitas-tb-delivery`  
**Repositório oficial:** `Alves1986/marmitas-tb` (privado)  
**Produção:** [marmitastb.vercel.app](https://marmitastb.vercel.app/)

> Este é o documento de referência para manutenção futura. Antes de alterar o sistema, leia a seção correspondente, trabalhe em checkpoint recuperável e execute a validação completa. Não use este guia para expor chaves, senhas, tokens ou dados pessoais.

## 1. Arquitetura vigente

A aplicação é uma SPA construída com React e Vite, hospedada pela Vercel. As rotas públicas e internas chamam funções HTTP TypeScript em `api/`, que se conectam ao Supabase para autenticação, dados relacionais e referências de imagens. O Asaas permanece isolado em modo Sandbox para PIX de teste. O envio transacional de e-mails está planejado por SMTP, mas depende de um domínio institucional que ainda não foi definido.[1] [2]

![Diagrama de arquitetura da Marmitas TB](/manus-storage/arquitetura-marmitas-tb_e43a0ef6.png)

*Figura 1 — Componentes e fluxos principais. O nó SMTP pontilhado indica dependência externa ainda pendente.*

| Camada | Tecnologia e localização | Responsabilidade | Regra de manutenção |
|---|---|---|---|
| Interface | React 19, Vite, Tailwind e componentes em `client/src/` | Vitrine, checkout, acompanhamento, operação e administração | Preserve responsividade e estados de carregamento, vazio e erro |
| Autenticação | Supabase Auth | Sessões, login por senha, convite e recuperação | Nunca usar chave de serviço no navegador |
| Dados | Supabase Postgres | Pedidos, perfis, catálogo, despesas e auditoria | Alterar schema apenas por processo aprovado e documentado |
| Arquivos | Supabase Storage | Fotos WebP de produtos por URL assinada | Nunca salvar bytes de imagem no banco ou no repositório |
| API | Vercel Functions em `api/` e helpers em `server/vercel/_lib/` | Autorização, regras de negócio e integração segura | Usar `asVercelNodeHandler` nos exports padrão |
| Pagamento | Asaas Sandbox | PIX de homologação, quando credenciais existirem | Não ativar cobrança real sem aprovação explícita |
| Publicação | GitHub privado e Vercel | Controle de versão e implantação | Publicar apenas o repositório dedicado e mediante autorização |

## 2. Mapa de rotas e funções

As rotas de página estão definidas em `client/src/App.tsx`. As páginas públicas são `/` e `/acompanhar`; `/acesso` recebe a equipe; `/definir-senha` completa convites ou recuperação; `/operacao`, `/operacao/despesas` e `/admin` exigem as permissões correspondentes.[3]

| Caminho | Público-alvo | Finalidade |
|---|---|---|
| `/` | Cliente | Cardápio, sacola, checkout e instalação PWA |
| `/acompanhar` | Cliente | Consulta de pedido por telefone ou código com telefone |
| `/acesso` | Operação e administração | Login por e-mail e senha, recuperação e navegação de retorno |
| `/definir-senha` | Membro convidado | Criar ou redefinir a senha individual |
| `/operacao` | `staff` e `admin` | Fila de pedidos, alertas, transição de status e reimpressão |
| `/operacao/despesas` | Perfil autorizado | Registro operacional de despesas |
| `/admin` | `admin` | Gestão financeira, cardápio, equipe e configurações |

O projeto usa as funções HTTP abaixo. O Plano Hobby da Vercel deve continuar dentro do limite de doze funções por implantação; a arquitetura atual concentra contratos por domínio para reduzir a quantidade de funções.[4]

| Função | Escopo | Observação de manutenção |
|---|---|---|
| `api/public/menu.ts` | Público | Retorna cardápio exibido na vitrine |
| `api/public/orders.ts` | Público | Cria e consulta pedidos públicos com validação de referência |
| `api/operations/orders.ts` | Interno | Lista e atualiza a fila operacional |
| `api/operations/alerts.ts` | Interno | Suporta alertas da operação |
| `api/operations/printJobs.ts` | Interno | Registra e baixa jobs de impressão ou reimpressão |
| `api/admin/catalog.ts` | Administrador | Gerencia cardápio e URL assinada de imagem |
| `api/admin/finance.ts` | Administrador | Financeiro, despesas, revisões e auditoria |
| `api/admin/settings.ts` | Administrador | Configuração operacional da loja |
| `api/admin/staff.ts` | Administrador | Membros, papéis, convite e recuperação controlada |
| `api/webhooks/asaas.ts` | Serviço externo | Webhook autenticado e idempotente do Asaas Sandbox |

## 3. Modelo de permissão e autenticação

Os papéis de `profiles` são `customer`, `staff` e `admin`. O cliente não recebe acesso à operação interna. O papel `staff` trabalha na fila, e `admin` também acessa gestão, equipe, cardápio e finanças. A proteção deve ocorrer no cliente para uma experiência clara e no servidor para segurança efetiva.[5]

No novo fluxo, o administrador chama `POST /api/admin/staff` com a ação de criação. A função exige administrador autenticado, normaliza o e-mail, cria convite por `auth.admin.inviteUserByEmail`, grava o perfil com nome e papel e aponta o retorno para `/definir-senha`. O reenvio exige que o perfil já seja `staff` ou `admin`; portanto, não é possível converter indevidamente um cliente em destinatário de convite apenas pelo botão de reenvio.[6]

| Prática obrigatória | Motivo | Implementação vigente |
|---|---|---|
| Não criar conta pública | Evita entrada não autorizada na equipe | Cadastro público bloqueado no provedor de e-mail do Supabase |
| Não revelar existência de e-mail | Reduz enumeração de contas | Mensagem neutra em login e recuperação |
| Usar senha com 12+ caracteres | Eleva o padrão mínimo de credencial | Validação controlada em `/acesso` e `/definir-senha` |
| Manter serviço administrativo no servidor | Impede vazamento de privilégios | `SUPABASE_SERVICE_ROLE_KEY` é lida apenas pelos helpers Vercel |
| Revogar por papel | Interrompe acesso interno preservando histórico | Alterar membro para `customer`/Sem acesso via gestão |

> **Pendência deliberada:** a configuração de SMTP próprio não está ativa. Nenhum domínio foi comprado ou registrado. Assim, convite e recuperação só devem entrar na rotina quando o domínio institucional estiver definido, os registros DNS forem validados e um teste controlado tiver sido aprovado.[2]

## 4. Variáveis e segredos

Variáveis que começam com `VITE_` são incorporadas no bundle e não podem conter segredo. Chaves privadas devem existir apenas no ambiente Vercel. Nunca inclua valores reais em commits, prints, documentos ou mensagens.[1]

| Variável | Onde deve existir | Uso | Tratamento |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Cliente e Vercel | URL pública do projeto Supabase | Pode ser pública |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Cliente e Vercel | Cliente Supabase com políticas de acesso | Pode ser pública, mas não substitui RLS/guardas |
| `SUPABASE_SERVICE_ROLE_KEY` | Somente Vercel | Convites, perfis e operações administrativas privilegiadas | Segredo crítico; nunca enviar ao cliente |
| `ASAAS_ENVIRONMENT` | Vercel | Mantém pagamento no modo Sandbox | Usar `sandbox` enquanto não houver aprovação de produção |
| `ASAAS_API_URL` | Vercel | Base URL do ambiente Asaas | Deve corresponder ao ambiente escolhido |
| `ASAAS_API_KEY` | Vercel | Autenticação do Asaas | Segredo; pendente de cadastro pelo responsável |
| `ASAAS_WEBHOOK_TOKEN` | Vercel | Verificação do webhook Asaas | Segredo; não registrar em log |

Ao alterar uma variável do projeto WebDev, use o mecanismo seguro de segredos e execute um teste associado. Para a Vercel, atualize os ambientes adequados e faça nova implantação; uma variável adicionada depois do build não altera o JavaScript já publicado.

## 5. Fluxo seguro de desenvolvimento e publicação

Todo desenvolvimento deve começar com item novo em `todo.md`, plano técnico quando houver mudança de comportamento e teste que falha antes da implementação. A sequência abaixo é a referência para recursos e correções.

| Etapa | Evidência esperada | Não fazer |
|---|---|---|
| 1. Diagnosticar | Reprodução documentada ou requisito claro | Alterar código por suposição |
| 2. Cobrir | Teste Vitest inicialmente falhando | Escrever apenas teste depois da correção |
| 3. Implementar | Menor alteração que satisfaz o teste | Misturar refatoração extensa sem necessidade |
| 4. Validar | `pnpm test`, `pnpm check`, `pnpm build` e `pnpm build:vercel-runtime` | Declarar sucesso sem saída dos comandos |
| 5. Verificar interface | Captura de tela das rotas afetadas | Basear aceitação visual somente no código |
| 6. Salvar | Checkpoint com descrição clara | Usar `git reset --hard` para recuperação |
| 7. Publicar | Autorização explícita e `git push github main` | Enviar para qualquer repositório diferente de `Alves1986/marmitas-tb` |
| 8. Homologar | URL de implantação e domínio oficial conferidos | Assumir que a Vercel propagou sem verificação |

Os comandos de validação efetivos estão em `package.json`.[7]

```bash
pnpm test
pnpm check
pnpm build
pnpm build:vercel-runtime
```

Em caso de indisponibilidade de preview, leia os arquivos de `.manus-logs/` pelo terminal. Para produção, use os logs da Vercel; não inclua tokens, payloads integrais ou dados pessoais na documentação de incidente.

## 6. Alterações recorrentes

### 6.1 Criar ou alterar produto

O caminho operacional preferencial é o painel **Administração → Cardápio**. A tela converte arquivos JPG, PNG ou WebP de até 5 MB para WebP, pede URL assinada no Storage e salva somente a referência da imagem. Uma alteração de modelo de produto que exija coluna nova, regra de preço diferente ou consulta adicional precisa de teste e de alteração compatível de backend.[8]

### 6.2 Alterar regras de pedido ou status

As transições de status ficam concentradas na fila de operação e nos contratos de pedido. Antes de adicionar estado novo, atualize: os tipos compartilhados, as regras de transição, a visualização de acompanhamento, a fila, os testes e a documentação. Não deixe a fila permitir uma transição que o acompanhamento público não saiba apresentar.[9]

### 6.3 Evoluir pagamentos

O Asaas atual é Sandbox e possui emissão condicional. Para migrar a pagamentos reais, deve haver autorização formal, credenciais distintas, webhook HTTPS registrado, teste de idempotência e revisão de todos os rótulos que mencionam teste. Não reutilize chaves de Sandbox em produção.[10]

### 6.4 Recuperar de uma alteração problemática

Primeiro suspenda a publicação adicional e registre a evidência. Em seguida, verifique a versão mais recente que passou por testes e use o checkpoint do projeto para rollback. Evite `git reset --hard`, pois ele pode descartar contexto local necessário para auditoria. Dados do Supabase não são revertidos automaticamente pelo rollback de código; trate banco e arquivos com cautela.

## 7. Roteiro de diagnóstico

| Sintoma | Fonte inicial | Diagnóstico provável | Ação segura |
|---|---|---|---|
| `/admin` redireciona para acesso | Sessão e papel no perfil | Usuário sem sessão ou sem `admin` | Entrar novamente e revisar papel pela gestão de um administrador válido |
| Fila sem atualizar | Logs da API de operações e conexão | Sessão vencida, rede ou API indisponível | Recarregar, autenticar e então abrir logs sem dados pessoais |
| Convite não chega | Supabase Auth e SMTP | SMTP não configurado, DNS pendente ou caixa de spam | Não reenviar repetidamente; concluir o SMTP e testar com conta controlada |
| Imagem de produto falha | Validação no navegador e endpoint catálogo | Tipo/tamanho inválido ou URL assinada expirada | Reenviar arquivo permitido menor que 5 MB |
| Pagamento não cria PIX | Variáveis Asaas e logs do endpoint | Segredos ausentes ou modo Sandbox não configurado | Manter checkout em teste até a configuração ser revisada |
| Domínio mostra bundle antigo | Implantações e aliases Vercel | Cache de edge ou alias não associado | Verificar a implantação, invalidar cache e reassociar domínio apenas com autorização |

## 8. Checklist de retomada do SMTP

Quando houver domínio institucional definido, o responsável técnico deve escolher o provedor SMTP, validar o domínio e o remetente e preencher as credenciais no Supabase. O Resend foi apenas preparado como opção inicial e não recebeu domínio nesta etapa. A sequência segura está resumida abaixo.[2] [11]

| Ordem | Ação | Critério de aceite |
|---|---|---|
| 1 | Confirmar domínio e responsável pelo DNS | Nenhuma compra ocorre sem autorização do titular |
| 2 | Adicionar o domínio ao provedor SMTP | Provedor retorna registros DNS de validação |
| 3 | Publicar registros DNS | SPF/DKIM/DMARC ou registros exigidos passam na validação do provedor |
| 4 | Criar credencial SMTP e remetente | Segredo guardado apenas no painel do provedor/Supabase |
| 5 | Habilitar SMTP no Supabase | Host, porta, usuário, senha e remetente validados |
| 6 | Testar convite e recuperação | E-mail chega, abre `/definir-senha` e gera sessão correta |
| 7 | Registrar evidência | Data, conta de teste e resultado sem expor segredos |

## 9. Catálogo de documentos

| Documento | Conteúdo | Quando consultar |
|---|---|---|
| [Manual operacional ilustrado](./manual-operacional-ilustrado.md) | Uso por cliente, operação e administração | Treinamento e rotina diária |
| [Acesso interno por senha](./acesso-interno-por-senha-operacao.md) | Política, configuração externa e SMTP | Alterar equipe, convite ou recuperação |
| [Evidências de publicação](./evidencias-publicacao-autenticacao-2026-08-20.md) | Histórico de publicação da autenticação e alias | Diagnosticar implantação/domínio |
| [Homologação Asaas](./operacao/asaas-homologacao.md) | PIX Sandbox, variáveis e webhook | Retomar integração de pagamento |
| [Homologação Supabase e Vercel](./operacao/supabase-vercel-homologacao.md) | Migração e roteiro de ambiente | Diagnosticar infraestrutura |

## Referências

[1]: https://supabase.com/docs/guides/auth/auth-smtp "Supabase — Custom SMTP"
[2]: ./acesso-interno-por-senha-operacao.md "Estado e procedimento do acesso por senha"
[3]: ../client/src/App.tsx "Rotas da aplicação"
[4]: ../vercel.json "Configuração de rewrites e funções Vercel"
[5]: ../shared/permissions.ts "Papéis e permissões internas"
[6]: ../api/admin/staff.ts "Endpoint administrativo de equipe"
[7]: ../package.json "Scripts de validação e build"
[8]: ../client/src/services/productImageUpload.ts "Conversão e validação de imagem"
[9]: ../client/src/components/operations/OrderQueue.tsx "Fila e transições operacionais"
[10]: ./operacao/asaas-homologacao.md "Pagamento Asaas em Sandbox"
[11]: https://resend.com/docs/send-with-smtp "Resend — SMTP"
