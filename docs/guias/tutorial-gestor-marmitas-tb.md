# Tutorial do Gestor — Gestão completa da Marmitas TB

## Finalidade e responsabilidades

Este guia é destinado a gestores e equipe autorizada da Marmitas TB. Ele organiza o uso dos módulos administrativos e operacionais em uma sequência segura. A área interna trabalha com papéis de acesso: **admin** possui gestão completa; **staff** atua nas rotinas permitidas de operação.

> Utilize uma credencial individual e encerre a sessão ao sair de um computador compartilhado. O assistente de IA explica fluxos, mas não executa alterações, vendas, pagamentos ou comandos em nome de quem o utiliza.

| Perfil | Atuação principal |
|---|---|
| `admin` | Gestão de cardápio, equipe, configurações, financeiro, relatórios, estoque completo e operação. |
| `staff` | Consulta e execução das rotinas operacionais liberadas, como fila, PDV, cozinha e movimentos de estoque permitidos. |
| Cliente | Usa apenas as áreas públicas de pedido e acompanhamento. |

## 1. Acesso e saída segura

Entre por **Acesso da equipe** com o e-mail e a senha cadastrados para o seu perfil. Depois da autenticação, navegue para a gestão ou para a operação conforme sua responsabilidade. O botão **Sair** deve ser usado ao final do turno ou antes de liberar o equipamento para outra pessoa.

Se um acesso for recusado, confirme se a credencial é individual e se o perfil correto foi liberado. Não compartilhe senha, código, token ou link de definição de senha com ninguém, inclusive no chat de ajuda.

## 2. Usar o painel administrativo

O painel `/admin` concentra a visão geral e o menu dos módulos. Os indicadores exibem dados operacionais e financeiros existentes no sistema; eles não substituem a conferência do pedido ou do lançamento que originou o valor.

| Módulo | Uso principal | Boa prática |
|---|---|---|
| Visão geral | Consultar indicadores e atalhos | Confira o período e a origem dos dados antes de decidir. |
| Pedidos | Consultar pedidos e sua situação | Use a fila para a execução operacional. |
| Cardápio | Cadastrar ou editar categorias, produtos, opções, preços, fotos e disponibilidade | Revise o conteúdo antes de salvar e confirme a mensagem de sucesso. |
| Equipe | Administrar membros e papéis autorizados | Conceda apenas o menor acesso necessário. |
| Financeiro | Consultar receitas e despesas registradas | Não trate estimativas como valor conciliado. |
| Relatórios | Filtrar e exportar análises | Selecione o período correto antes da exportação. |
| Configurações | Conferir parâmetros operacionais | Serviços externos exigem configuração e validação próprias. |

## 3. Gerir o cardápio

No módulo **Cardápio**, administradores podem organizar categorias, produtos e opções. A disponibilidade determina o que pode ser apresentado ao cliente. As fotos são enviadas pelo fluxo próprio do cadastro, com tratamento de imagem pelo sistema; não é necessário guardar arquivos de imagem na área local do projeto.

Antes de salvar uma mudança, confira nome, descrição, preço em BRL, categoria, opções obrigatórias e disponibilidade. Após salvar, confirme a resposta do sistema. Alterações de cardápio não devem ser usadas para corrigir um pedido já confirmado; trate pedidos pela fila operacional.

## 4. Administrar a equipe

O módulo **Equipe** é destinado a perfis de gestão. Cadastre ou mantenha apenas pessoas que realmente precisam de acesso, atribuindo o papel adequado. A criação de contas internas é restrita; não há autoatendimento público para credenciais de equipe.

Ao desligar ou mudar a responsabilidade de uma pessoa, revise o acesso dela. A prática recomendada é manter administradores em número limitado e usar o perfil de equipe para a rotina operacional que não exige gestão completa.

## 5. Consultar financeiro e relatórios

O módulo **Financeiro** consolida receitas e despesas registradas. Despesas lançadas pela equipe podem permanecer em rascunho e exigir aprovação ou rejeição administrativa antes de impactarem o fluxo de caixa. Os relatórios permitem aplicar filtros e, quando disponível, exportar dados para análise.

| Rotina | Sequência segura |
|---|---|
| Consultar receita | Selecione o período → confira a forma e a situação de pagamento → compare com os pedidos. |
| Tratar despesa | Revise categoria, valor e justificativa → aprove ou rejeite conforme a política da operação. |
| Exportar relatório | Defina filtros → revise o resultado → use a exportação somente em ambiente autorizado. |

As integrações de cobrança continuam dependentes das credenciais correspondentes. Não ative chaves, tokens, webhooks ou cobranças fora do processo documentado de configuração.

## 6. Operar a fila de pedidos

A rota `/operacao` apresenta a fila interna. Ela é a referência para consultar comandas em andamento e acompanhar alertas. A autoria das ações internas vem da sessão ativa; não tente atribuir manualmente ações a outra pessoa.

Pedidos do balcão (`COUNTER`) recebem prioridade operacional de impressão, sem apagar ou descartar os demais canais. Quando for necessário reimprimir, informe o motivo solicitado pelo sistema: reimpressões são registradas com ator e justificativa.

## 7. Registrar venda no PDV de balcão

Use `/operacao/pdv` para atendimento presencial. Escolha os produtos, faça as configurações disponíveis, revise a venda e registre a forma de pagamento presencial indicada. O PDV aceita registros operacionais de dinheiro, PIX, débito, crédito ou voucher conforme as opções da tela; ele não processa uma cobrança online por si só.

O nome do cliente é opcional. Ao confirmar uma venda de balcão, o sistema gera uma senha diária de retirada no formato `MTB-001` e cria a comanda integrada à fila, com prioridade própria do canal COUNTER.

## 8. Acompanhar a cozinha

Na rota `/operacao/cozinha`, a equipe consulta comandas ativas por estado e vê a faixa prioritária de pedidos COUNTER. As ações grandes do cartão permitem somente as transições liberadas: iniciar preparo a partir de confirmado e marcar pronto a partir de em preparo.

Nunca tente avançar ou repetir uma transição que não esteja disponível. O sistema confirma a ação no servidor antes de atualizar a tela e informa falhas recuperáveis em caso de conflito ou indisponibilidade.

## 9. Controlar o estoque

O estoque em `/operacao/estoque` é calculado exclusivamente por movimentações. Não existe edição direta de saldo e não há baixa automática de pedidos nesta fase.

| Ação de estoque | Staff | Admin | Regra |
|---|---:|---:|---|
| Consultar posição e histórico | Sim | Sim | Saldo e criticidade vêm das movimentações. |
| Registrar entrada | Sim | Sim | Informe a quantidade correta. |
| Registrar consumo interno | Sim | Sim | Use para uso da operação. |
| Cadastrar, editar ou inativar insumo | Não | Sim | Inativar preserva histórico e bloqueia novos lançamentos. |
| Registrar perda ou ajuste | Não | Sim | Motivo é obrigatório e auditável. |

O sistema bloqueia saldo negativo. Registre somente fatos ocorridos, confira o histórico e não crie movimentações de teste na base produtiva.

## 10. Usar o painel de chamadas

O painel público `/chamadas` é para monitores de retirada. Ele mostra somente senhas COUNTER prontas, sem nome, telefone, endereço, itens, valores ou qualquer outro dado pessoal. Mantenha-o em uma tela de atendimento e não o use como painel de gestão ou consulta de pedidos.

## 11. Usar o Assistente de gestão

O botão **Ajuda** nas áreas internas abre o **Assistente de gestão**. Ele reconhece o contexto da tela e explica o caminho para a rotina permitida. Perguntas rápidas incluem acesso à fila, venda no PDV e consulta de estoque; este guia completo também fica disponível pelo próprio drawer.

O assistente não possui acesso a banco, pedidos, catálogo, clientes, pagamentos, estoque, credenciais ou comandos. Não envie dados pessoais, senhas, tokens, códigos de acesso, CPF, telefone, endereço, e-mail ou identificadores de pedido. Para cada ação real, use o módulo do sistema e a permissão do seu perfil.

## 12. Limites e cuidados operacionais

| Tema | Situação atual |
|---|---|
| Asaas | A operação depende de credenciais configuradas e de validação própria; não habilite cobrança sem o processo autorizado. |
| SMTP e domínio | Permanecem dependentes de provedor, remetente verificado e definição de domínio institucional. |
| iFood, hardware e agente de impressão | Não fazem parte deste fluxo de ajuda. |
| Totem | É uma experiência de autoatendimento separada e não mostra o assistente para evitar distração. |
| Dados e auditoria | Ações permitidas devem ocorrer dentro do módulo correto, sob a sessão de quem está trabalhando. |

---

**Versão do guia:** 27/08/2026. Este manual descreve os recursos atuais da Marmitas TB. Para tarefas fora dos módulos explicados, siga o processo técnico e a autorização adequada antes de realizar mudanças.
