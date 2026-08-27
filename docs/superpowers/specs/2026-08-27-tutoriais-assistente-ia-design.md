# Tutoriais por perfil e assistente de ajuda com IA — Marmitas TB

**Status:** Direção aprovada pelo responsável em 27/08/2026.

## Objetivo

Disponibilizar orientação clara para os dois públicos principais da Marmitas TB. O **tutorial do cliente** ensina a realizar e acompanhar um pedido pela experiência pública. O **tutorial de gestão** ensina o gestor a utilizar os módulos internos com segurança. Ambos devem ser acessíveis no próprio sistema, ter versões ilustradas em PDF para treinamento e servir de base factual ao assistente de IA.

> O assistente explica o caminho correto e direciona ao tutorial adequado. Ele não confirma pedidos, não altera dados, não acessa informações pessoais, não processa pagamentos e não executa ações administrativas ou operacionais.

## Experiência aprovada

O sistema exibirá um botão de ajuda discreto e recolhível. Nas rotas públicas de pedido, ele apresenta o **Assistente de pedidos**; nas rotas internas de administração e operação, apresenta o **Assistente de gestão**. Ao abrir, a pessoa encontra uma saudação por contexto, perguntas rápidas, links para o tutorial daquele perfil e uma conversa curta.

| Superfície | Público | Conteúdo inicial | Acesso a tutorial |
|---|---|---|---|
| `/` e `/acompanhar` | Cliente | Escolher marmita, montar sacola, finalizar e acompanhar | Público em `/ajuda/pedidos` e PDF do cliente |
| `/admin` | Administrador | Painel, cardápio, equipe, financeiro, relatórios e configurações | Protegido em `/ajuda/gestao` e PDF do gestor |
| `/operacao`, `/operacao/pdv`, `/operacao/cozinha`, `/operacao/estoque` | Equipe e administrador | Fila, PDV, cozinha, estoque e retorno à gestão | Protegido em `/ajuda/gestao`; papel limita as instruções administrativas |
| `/totem` e `/chamadas` | Totem e painel público | Sem assistente flutuante | Evita distração no autoatendimento e no monitor de retirada |

O painel da IA será um drawer focado, aberto apenas por iniciativa da pessoa. Ele terá botão de fechar, foco inicial, rótulos em português brasileiro e adaptação móvel. A conversa será mantida somente na memória da página e será descartada ao recarregar ou fechar a sessão; não haverá banco, auditoria de perguntas, perfilamento ou uso de dados de pedido como contexto.

## Tutoriais e conteúdo canônico

Os guias em Markdown serão a fonte editorial de verdade. As páginas de ajuda no app apresentarão o mesmo conteúdo em seções curtas e os PDFs serão gerados a partir de versões ilustradas desses guias. Nenhuma instrução assumirá uma forma de pagamento, produto ou disponibilidade que não venha da operação real.

| Guia | Seções obrigatórias | Limites explicitados |
|---|---|---|
| Cliente | Abrir a vitrine, ver a marmita do dia, escolher e personalizar itens, usar sacola, selecionar entrega/retirada, concluir, acompanhar pedido e pedir ajuda | Preços/disponibilidade no catálogo real; pagamento conforme opções exibidas; não compartilhar senha ou dados sensíveis no chat |
| Gestor | Acesso e logout, visão geral, pedidos, cardápio, equipe, financeiro, relatórios, configurações, operação, PDV, cozinha, estoque e chamadas | Gestão é restrita por papel; reimpressão requer ator/motivo; estoque não baixa automaticamente; Asaas permanece condicionado a credenciais; SMTP/domínio seguem pendentes |

Os dois PDFs incluem capa, sumário, capturas próprias do sistema e referência para a página de ajuda correspondente. A documentação técnica também registrará o contrato, o modelo escolhido e a regra de não execução de ações pela IA.

## Arquitetura da assistência

O componente genérico `AIChatBox` será reaproveitado em uma casca `HelpAssistant`, responsável apenas por abrir/fechar o drawer, selecionar o perfil e administrar uma lista curta de mensagens. O conteúdo das perguntas sugeridas e do tutorial será definido por módulos compartilhados tipados, para a interface e o servidor se referirem à mesma terminologia.

Uma nova operação `help` será adicionada ao dispatcher existente `api/operations/[resource].ts`, sem aumentar a contagem de funções Vercel. O handler aceitará uma pergunta limitada em tamanho, um contexto de superfície permitido e, no máximo, oito mensagens recentes. Para o contexto interno, ele deriva a sessão e o papel no servidor; para a área pública, usa somente o perfil cliente. O servidor chama a camada LLM já fornecida e constrói uma instrução fixa que limita a resposta ao conteúdo do produto e dos tutoriais.

| Camada | Responsabilidade | Regra de segurança |
|---|---|---|
| `shared/helpContent.ts` | Tópicos, prompts rápidos, rotas e base factual de cada perfil | Não contém PII, segredos, comandos SQL ou ações executáveis |
| `client/src/components/help/HelpAssistant.tsx` | Drawer, sugestões, estado efêmero e links de tutorial | Nunca habilita mutações nem coleta dados de pedido |
| `client/src/services/helpService.ts` | POST tipado à operação consolidada | Envia apenas pergunta, conversa curta e contexto de rota |
| `server/vercel/_lib/operations/help.ts` | Validação, derivação de papel e chamada do modelo | Recusa contexto interno sem sessão de equipe; limita mensagem e resposta |
| `api/operations/[resource].ts` | Encaminhamento de `help` | Reusa a única função consolidada |

As respostas devem ser objetivas, em português brasileiro, e conter passos numerados quando apropriado. Ao receber perguntas fora do escopo, pedido de dados privados ou solicitação de ação, o assistente recusa de forma breve, explica que pode orientar e oferece o caminho de tela ou tutorial pertinente. Falhas de rede ou do modelo mostram uma mensagem recuperável e os links estáticos de tutorial continuam disponíveis.

## Modelo de integração

Será utilizado o proxy de modelos já disponível no servidor, sem criar ou expor uma chave no cliente. A integração será de texto, sem ferramentas, funções ou acesso a banco. O modelo não receberá catálogo completo, pedidos, telefone, endereço, e-mail, pagamentos, tokens, senhas ou dados de estoque. A mensagem de sistema conterá apenas o perfil derivado, o nome da superfície e a base canônica resumida de ajuda.

## Testes e aceite

| Critério | Evidência esperada |
|---|---|
| Cliente encontra ajuda sem sair do pedido | Launcher público abre drawer, apresenta prompts de pedido e link para `/ajuda/pedidos`. |
| Gestão recebe ajuda adequada e protegida | Launcher interno envia contexto de gestão; handler exige sessão de equipe e deriva o papel. |
| IA não pode executar ações | Contrato não aceita comandos, IDs de pedido, ferramentas ou payloads de mutação; prompt instrui somente orientação. |
| Conteúdo permanece consistente | Tutoriais, sugestão de pergunta e base da IA usam o mesmo módulo canônico. |
| Falha não bloqueia a operação | Drawer informa indisponibilidade e preserva links aos tutoriais. |
| Material de treinamento existe | Dois guias no app e dois PDFs ilustrados são entregues. |
| Regressões não são introduzidas | TDD, testes de cliente/servidor, tipagem, build PWA, build Vercel, checagem de diferenças e revisão desktop/móvel. |

## Limites desta entrega

Esta entrega não adiciona automação, agente autônomo, geração ou alteração de pedidos, recuperação de senha, integração de CRM, pagamento, WhatsApp, histórico de chat, métricas de conversa, banco de dados, novos segredos ou nova função Vercel. Ela também não desbloqueia Asaas, SMTP, domínio, iFood, hardware ou impressão física.
