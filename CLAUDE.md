# CLAUDE.md — Contexto de Desenvolvimento da Marmitas TB

**Projeto:** `marmitas-tb-delivery`  
**Repositório autorizado:** `Alves1986/marmitas-tb` (privado)  
**Produção:** <https://marmitastb.vercel.app>  
**Idioma e moeda:** português brasileiro e real brasileiro (R$).  
**Última atualização:** 27 de agosto de 2026.

> Este arquivo é o ponto de partida para qualquer manutenção. Ele preserva decisões operacionais, limites de segurança e o fluxo de validação do projeto. Não registre senhas, tokens, chaves, dados pessoais de clientes ou credenciais de terceiros neste repositório.

## 1. Produto e escopo atual

A Marmitas TB é uma aplicação de delivery própria para Telêmaco Borba/PR. Ela reúne vitrine pública, sacola, checkout, acompanhamento por telefone, operação de cozinha, administração, gestão financeira, upload de fotos e um totem demonstrativo para autoatendimento.[1] [2]

| Área | Rota | Público | Estado atual |
|---|---|---|---|
| Cardápio e checkout | `/` | Cliente | Disponível; sacola persistida no navegador |
| Acompanhamento | `/acompanhar` | Cliente | Consulta por telefone ou código com telefone |
| Totem rápido | `/totem` | Atendimento presencial | Demonstrativo e local; não cria pedido real nem cobra |
| Acesso interno | `/acesso` | Equipe autorizada | E-mail e senha individuais |
| Definição de senha | `/definir-senha` | Membro convidado | Convite e recuperação, condicionados a SMTP |
| Operação | `/operacao` | `staff` e `admin` | Fila, status, alertas e impressão/reimpressão |
| Estoque | `/operacao/estoque` | `staff` e `admin` | Saldo por movimentos, histórico e lançamentos auditáveis; sem baixa automática por pedido |
| Despesas operacionais | `/operacao/despesas` | Perfil autorizado | Registro operacional de despesas |
| Administração | `/admin` | `admin` | Financeiro, cardápio, equipe e configurações |
| Ajuda de pedidos | `/ajuda/pedidos` | Cliente | Tutorial de pedido e PDF ilustrado complementar |
| Ajuda de gestão | `/ajuda/gestao` | `staff` e `admin` | Tutorial operacional e administrativo protegido pela barreira de operação |

## 2. Arquitetura e diretórios importantes

| Camada | Tecnologia | Locais principais | Regra de manutenção |
|---|---|---|---|
| Interface | React 19, Vite 7, TypeScript, Tailwind 4 e shadcn/ui | `client/src/` | Manter responsividade, acessibilidade e estados de carregamento, vazio e erro |
| Rotas | Wouter | `client/src/App.tsx` | Registrar rotas públicas e internas de forma explícita |
| Lógica do totem | React e estado local | `client/src/pages/Totem.tsx`, `client/src/lib/totem.ts` | Não introduzir Supabase, cobrança ou pedido real sem autorização específica |
| API | Funções TypeScript para Vercel | `api/`, `server/vercel/_lib/` | Preservar autorização no servidor e contratos por domínio |
| Assistência de ajuda | IA server-side sem ferramentas | `shared/helpContent.ts`, `server/vercel/_lib/operations/help.ts`, `client/src/components/help/` | Orientar por perfil sem mutações, dados pessoais ou credenciais |
| Dados e acesso | Supabase Auth, Postgres e Storage | `api/`, cliente Supabase e migrações | Nunca expor privilégios administrativos ao navegador |
| Pagamentos | Asaas Sandbox | webhook e helpers de pagamento | Não ativar cobrança real sem autorização e homologação |
| Implantação | GitHub privado e Vercel | `vercel.json`, repositório dedicado | Não enviar ao repositório `Alves1986/ministral` |

O Plano Hobby da Vercel admite no máximo **12 funções serverless** por implantação. A arquitetura atual usa 11 funções; pedidos, alertas, impressão, estoque e ajuda são roteados pelo dispatcher `api/operations/[resource].ts`. Não fragmente contratos existentes sem avaliar esse limite.[2]

## 3. Autorização e segurança

Os perfis de acesso são `customer`, `staff` e `admin`. O cliente não acessa rotas internas; `staff` trabalha na fila; e `admin` também gerencia cardápio, equipe, configurações e finanças. A proteção precisa existir tanto na interface quanto nas funções de servidor.[2]

No núcleo de estoque ativo, `staff` e `admin` consultam a posição e registram entrada ou consumo interno. Somente `admin` pode cadastrar/inativar insumos e registrar perdas ou ajustes; estes exigem motivo e auditoria. O saldo é sempre derivado de movimentações, nunca editado diretamente nem reduzido por pedidos nesta etapa.

| Prática obrigatória | Regra |
|---|---|
| Cadastro interno | Não existe auto cadastro público; gestores criam ou convidam membros |
| Senhas | Exigir senha individual com 12 ou mais caracteres |
| Segredos | `SUPABASE_SERVICE_ROLE_KEY`, chaves Asaas e tokens só podem existir no servidor/ambiente Vercel |
| Dados pessoais | Não imprimir nem registrar telefone, endereço ou credenciais em logs/documentos |
| Assistente de IA | Conversa efêmera, sem banco, ferramentas ou ações; rejeitar e-mail, CPF, telefone e UUID antes de consultar o modelo |
| Revogação | Retirar acesso alterando o papel do membro pela gestão administrativa |
| SMTP | Permanece pendente até que a empresa defina domínio institucional e conclua DNS/SMTP |

## 4. Regras funcionais essenciais

### 4.1 Catálogo, pedidos e operação

O catálogo possui categorias, produtos, opções e fotos. O administrador carrega imagens JPG, PNG ou WebP de até 5 MB; o navegador converte o arquivo para WebP e a aplicação persiste somente a referência do arquivo no Storage. Não grave bytes de imagens no banco ou no repositório.[1]

Pedidos públicos devem respeitar as transições operacionais suportadas, e a tela de acompanhamento deve compreender qualquer estado exposto pela fila. Antes de mudar regras de pedido, atualizar tipos compartilhados, API, tela operacional, acompanhamento, testes e documentação no mesmo conjunto de mudanças.[2]

### 4.2 Administração e finanças

O painel administrativo usa navegação lateral contextual, mostrando um módulo por vez. Os módulos são: visão geral, pedidos, financeiro, revisões, auditoria, relatórios, cardápio, equipe e configurações. Despesas devem ser registradas e aprovadas ou rejeitadas pelos fluxos previstos, preservando auditoria; não criar dados financeiros artificiais para demonstração.[1]

### 4.3 Totem de pedidos rápidos

O totem é uma rota pública, vertical e **estritamente local**. Ele atende uma demonstração presencial: opções → marmita → bebida → sobremesa opcional → revisão → nome opcional → pagamento demonstrativo → retirada. PIX e cartão são somente simulações.[3] [4]

| Regra do totem | Comportamento obrigatório |
|---|---|
| Avanço | A primeira seleção de marmita, bebida ou sobremesa adiciona o item e avança; sobremesa pode ser pulada |
| Retorno | Ações de voltar preservam a seleção e permanecem acessíveis em tela vertical |
| Pagamento | Não avançar sem PIX ou cartão demonstrativo selecionado |
| Tag | Exibir `MTB-001` e incrementar localmente; reiniciar em `MTB-001` quando a data local mudar |
| Inatividade | Após 90 segundos sem toque ou teclado, limpar estado local e voltar ao início |
| Encerramento manual | Na retirada, `Encerrar atendimento` limpa o estado e retorna imediatamente ao início |
| Recibo | A impressão é do navegador via `window.print()`; não envia comanda externa |
| Limite | Não criar pedido no Supabase, não acionar máquina de cartão e não fazer cobrança |

## 5. Variáveis e integrações externas

Variáveis prefixadas por `VITE_` são visíveis no cliente e não podem conter segredos. Segredos são configurados fora do código, no ambiente de produção adequado.[2]

| Grupo | Exemplos | Situação |
|---|---|---|
| Supabase público | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Necessário para cliente autenticado e consultas permitidas |
| Supabase administrativo | `SUPABASE_SERVICE_ROLE_KEY` | Exclusivo do servidor; nunca expor |
| Asaas | `ASAAS_ENVIRONMENT`, `ASAAS_API_URL`, `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` | Sandbox; credenciais externas pendentes |
| SMTP | Host, porta, usuário, senha e remetente | Bloqueado até domínio institucional e DNS validados |

## 6. Fluxo obrigatório de mudança

1. Registre qualquer recurso, correção ou ajuste solicitado no final de `todo.md` como item não concluído.
2. Quando houver mudança de comportamento, escreva ou atualize o plano técnico e crie uma regressão Vitest que falhe antes da implementação.
3. Faça a menor alteração que satisfaça o teste, mantendo contratos existentes.
4. Atualize documentos afetados e marque o item do backlog como concluído.
5. Execute, no mínimo, os comandos abaixo; para alterações relevantes, valide também a interface na rota afetada.

```bash
pnpm test
pnpm check
pnpm build
pnpm build:vercel-runtime
git diff --check
```

6. Salve um checkpoint descritivo após a validação. Em caso de problema grave, use o checkpoint para recuperação; **não use** `git reset --hard`.
7. Somente envie alterações para `github/main` quando houver autorização expressa do responsável e conferência de que o remoto é `Alves1986/marmitas-tb`.
8. Publicação em produção é uma ação manual do responsável no botão **Publish** após o checkpoint. Verifique a rota afetada no domínio oficial depois da publicação.

## 7. Comandos e verificação

| Objetivo | Comando |
|---|---|
| Desenvolvimento local | `pnpm dev` |
| Todos os testes | `pnpm test` |
| Tipagem | `pnpm check` |
| Build completo | `pnpm build` |
| Runtime Vercel | `pnpm build:vercel-runtime` |
| Formatação | `pnpm format` |

Se o preview falhar, investigue `.manus-logs/` pelo terminal. Para incidentes publicados, use os logs de produção sem copiar segredos ou dados pessoais para tickets, commits ou documentação.[2]

## 8. Limites e pendências deliberadas

O Asaas continua em Sandbox, sem cobranças reais. O SMTP transacional permanece desativado até a definição de um domínio institucional. A migração aditiva `20260827120000_inventory_core.sql` foi aplicada como `inventory_core` no Supabase autorizado, sem criar insumos, saldos ou movimentos de teste. Esses limites são decisões intencionais de segurança e operação; não tente contorná-los por código, dados fictícios ou configuração improvisada.[1] [2]

O assistente utiliza `claude-haiku-4-5` exclusivamente no servidor, pela operação consolidada `POST /api/operations/help`. A superfície enviada é validada; cliente e gestão são distinguidos no servidor, e sessão de `staff` ou `admin` é obrigatória nas telas internas. A conversa não é persistida e não recebe ferramentas, acesso ao banco, segredos, identificadores ou poderes de execução.

## 9. Documentos de referência

| Documento | Uso |
|---|---|
| `docs/tutorial-completo-marmitas-tb.md` | Tutorial funcional completo para treinamento |
| `docs/manual-operacional-ilustrado.md` | Manual de rotina com capturas da versão publicada |
| `docs/guia-tecnico-manutencao.md` | Arquitetura, integrações e manutenção segura |
| `docs/acesso-interno-por-senha-operacao.md` | Credenciais internas, convite e SMTP |
| `docs/superpowers/specs/2026-08-21-totem-pedidos-rapidos-design.md` | Regras do totem demonstrativo |
| `docs/superpowers/specs/2026-08-21-totem-finalizacao-acolhedora-design.md` | Regra de inatividade, finalização e encerramento manual |
| `docs/superpowers/specs/2026-08-27-nucleo-estoque-design.md` | Limites, permissões e contrato do núcleo de estoque ativo |
| `docs/superpowers/plans/2026-08-27-nucleo-estoque.md` | Plano técnico e registro de ativação no Supabase |
| `docs/superpowers/specs/2026-08-27-tutoriais-assistente-ia-design.md` | Escopo dos tutoriais por perfil e da assistência contextual somente orientativa |
| `docs/superpowers/plans/2026-08-27-tutoriais-assistente-ia.md` | Plano técnico, contratos, testes e validação da ajuda integrada |
| `docs/guias/tutorial-cliente-marmitas-tb.md` | Fonte editorial do tutorial de pedido ao cliente |
| `docs/guias/tutorial-gestor-marmitas-tb.md` | Fonte editorial do tutorial completo de gestão |
| `docs/guias/evidencias-tutoriais-2026-08-27.md` | Registro das capturas e revisão visual dos PDFs ilustrados |

## Referências

[1]: ./docs/manual-operacional-ilustrado.md "Manual operacional ilustrado"
[2]: ./docs/guia-tecnico-manutencao.md "Guia técnico de arquitetura e manutenção"
[3]: ./docs/superpowers/specs/2026-08-21-totem-pedidos-rapidos-design.md "Especificação do totem"
[4]: ./docs/superpowers/specs/2026-08-21-totem-finalizacao-acolhedora-design.md "Finalização acolhedora do totem"
