# Manual Operacional Ilustrado — Marmitas TB

**Versão do manual:** 1.0  
**Sistema:** Marmitas TB Delivery  
**Endereço público:** [marmitastb.vercel.app](https://marmitastb.vercel.app/)  
**Atualização:** 20 de agosto de 2026

> Este manual orienta o uso diário do sistema por clientes, equipe operacional e gestores. Ele descreve a versão atualmente publicada e separa claramente os fluxos disponíveis das configurações ainda pendentes.

## 1. Visão geral e perfis de acesso

A Marmitas TB reúne vitrine de cardápio, montagem de pedido, acompanhamento público, fila operacional e gestão administrativa em uma única aplicação. O cliente não cria conta para pedir; a equipe interna usa credenciais individuais, criadas exclusivamente por administradores. O sistema possui três papéis: **cliente**, **operação** e **administrador**. A tabela a seguir resume o que cada perfil pode executar.

| Perfil | Como acessa | Principais permissões | Limites importantes |
|---|---|---|---|
| Cliente | Site público | Consultar cardápio, montar pedido, finalizar compra e acompanhar pedido | Não acessa fila, finanças, cardápio administrativo ou dados de equipe |
| Operação | `/acesso` com e-mail e senha | Consultar fila, avançar status, consultar dados do pedido e reimprimir comanda | Não administra equipe, cardápio, configurações ou relatórios financeiros |
| Administrador | `/acesso` com e-mail e senha | Todos os recursos operacionais, administrativos e de equipe | Deve conceder acesso apenas a pessoas autorizadas |

O controle de acesso está aplicado também no servidor, não apenas nos botões da interface. Um membro sem papel interno não pode receber novo convite pelo painel administrativo.[1]

## 2. Uso pelo cliente

### 2.1 Consultar cardápio e montar a sacola

O cliente inicia no endereço público da Marmitas TB. A vitrine oferece pesquisa por nome, ingrediente ou categoria, além de filtros horizontais por categoria. Cada cartão mostra fotografia, descrição, preço e, quando aplicável, indicação de personalização. Produtos com opções abrem a seleção antes de entrar na sacola; produtos simples entram diretamente e apresentam uma confirmação na tela.[2]

![Vitrine pública e catálogo de produtos da Marmitas TB](/manus-storage/vitrine-catalogo_a642806b.png)

*Figura 1 — Vitrine pública com busca, filtros, fotos e cartões de produtos. Captura realizada na versão publicada em 20 de agosto de 2026.*

O procedimento recomendado é selecionar um item, conferir suas opções quando houver, adicionar à sacola e revisar quantidade e valor antes de avançar. A sacola é persistente no navegador utilizado pelo cliente; mesmo assim, o pedido só existe operacionalmente depois da confirmação do checkout.

### 2.2 Finalizar um pedido

No checkout, o cliente informa dados de contato, escolhe a modalidade de recebimento, seleciona o pagamento e revisa as informações antes da confirmação. Os valores são exibidos em reais. Em caso de inconsistência, o cliente deve voltar uma etapa e corrigir os dados antes de concluir, em vez de fazer um novo pedido duplicado.

Nesta fase, a integração de PIX Asaas permanece em **Sandbox**. Por isso, cobranças de teste podem ser apresentadas apenas quando as credenciais seguras correspondentes estiverem configuradas no ambiente de produção; isso não deve ser interpretado como cobrança real.[3]

### 2.3 Acompanhar pedido sem criar conta

O acompanhamento é público e pode ser aberto em `/acompanhar`. O cliente pesquisa pelo telefone usado no checkout ou, quando necessário, pelo código do pedido junto do telefone. A página mostra somente o pedido ativo mais recente daquele telefone, exibindo situação, pagamento, tipo de recebimento, total e linha do tempo.[4]

![Tela pública de acompanhamento de pedido](/manus-storage/acompanhar-pedido_69c28a1c.png)

*Figura 2 — Consulta de acompanhamento por telefone ou código do pedido. Captura realizada na versão publicada em 20 de agosto de 2026.*

Caso a consulta não encontre o pedido, a primeira verificação deve ser o telefone informado, incluindo o DDD. Se o pedido foi criado há poucos instantes, aguarde a confirmação de tela do checkout antes de refazer a consulta. Não é necessário criar outro pedido apenas porque a atualização operacional ainda não apareceu.

## 3. Acesso interno por e-mail e senha

### 3.1 Entrada diária da equipe

A equipe deve acessar `https://marmitastb.vercel.app/acesso`. O formulário pede e-mail e senha individual; a senha precisa ter ao menos 12 caracteres. O retorno para credenciais inválidas é propositalmente genérico, de modo que não revele se determinado e-mail está cadastrado.

![Tela de acesso interno por e-mail e senha](/manus-storage/acesso-equipe-senha_cbdb3b0b.png)

*Figura 3 — Entrada de equipe por credenciais individuais. Captura realizada na versão publicada em 20 de agosto de 2026.*

Depois de entrar, membros de **operação** seguem para a fila de pedidos, enquanto **administradores** podem abrir a gestão em `/admin`. O acesso anterior por link mágico não é mais usado pela interface interna.[1]

### 3.2 Primeiro acesso, convite e recuperação de senha

Um administrador cria cada membro em **Gestão → Equipe**, informa nome, e-mail e papel e seleciona **Enviar convite**. O membro recebe uma mensagem para definir sua própria senha; o gestor nunca recebe, vê ou escolhe essa senha. A lista de equipe também possui a ação **Reenviar convite** exclusivamente para perfis de operação ou administrador.

Na tela de acesso, a opção **Esqueci minha senha** encaminha o procedimento de recuperação. Tanto o convite quanto a recuperação levam ao endereço `/definir-senha`, onde a pessoa define e confirma a nova senha antes de entrar.

![Tela de definição ou recuperação de senha](/manus-storage/definir-senha_6ab1da09.png)

*Figura 4 — Formulário seguro para criação ou redefinição da senha individual. Captura realizada na versão publicada em 20 de agosto de 2026.*

> **Atenção operacional:** o bloqueio de cadastro público e as URLs de retorno já foram configurados no Supabase. A entrega de convite e recuperação por e-mail ainda depende da configuração de SMTP transacional com um domínio institucional definido. Até essa etapa ser concluída, não é recomendável depender de convite ou recuperação para o atendimento diário.

## 4. Operação diária da cozinha e atendimento

### 4.1 Abrir a fila de pedidos

Após autenticar, a equipe abre `/operacao`. A página oferece retorno ao cardápio, acesso às despesas quando permitido e atalho para a gestão administrativa quando o papel for administrador. Sem sessão de equipe válida, a rota exibe uma tela de entrada e não expõe a fila.

![Entrada protegida da fila operacional](/manus-storage/acesso-operacao_12bdf2ec.png)

*Figura 5 — Ponto de entrada da operação quando não há sessão interna ativa. Captura realizada na versão publicada em 20 de agosto de 2026.*

A fila atualiza automaticamente e usa alertas visuais e sonoros para novos pedidos. Cada cartão apresenta o código, cliente, horário, recebimento, itens, observações, pagamento e prévia da comanda. A equipe deve conferir os itens e eventuais observações antes de iniciar o preparo.[5]

### 4.2 Atualizar o status do pedido

O operador deve mover o pedido conforme o trabalho realmente realizado. As transições usuais são exibidas abaixo; o sistema limita os avanços a estados coerentes da operação.[5]

| Situação atual | Próxima ação usual | Significado operacional |
|---|---|---|
| Confirmado | Iniciar preparo | O pedido foi conferido e entrou na produção |
| Em preparo | Pronto para retirada ou saiu para entrega | A produção terminou e o pedido foi direcionado ao recebimento escolhido |
| Pronto para retirada | Entregar/retirar | O pedido aguarda ou foi entregue ao cliente no balcão |
| Saiu para entrega | Entregar | O pedido está em deslocamento para o cliente |
| Entregue | Encerrar | O atendimento foi concluído |

Cancelamentos devem ser usados apenas quando o pedido realmente não seguirá para produção. Antes de cancelar, o operador deve conferir se há pagamento, observação ou contato do cliente que requeira ação humana.

### 4.3 Imprimir ou reimprimir comanda

Ao imprimir, o sistema prepara a comanda e abre a impressão a partir do gesto do operador. Em celular, se o navegador bloquear a abertura, utilize o menu do navegador e escolha **Compartilhar → Imprimir**. O reenvio também fica registrado como job operacional para auditoria. A impressão física depende da configuração do computador e da impressora da cozinha; ela deve ser homologada no equipamento que será usado diariamente.[5]

## 5. Gestão administrativa

O administrador abre `/admin`. A navegação lateral apresenta um módulo por vez, reduzindo mistura de informações e facilitando a rotina de gestão. Os módulos atualmente disponibilizados são os seguintes.

| Módulo | Uso recomendado |
|---|---|
| Visão geral | Acompanhar resumo financeiro e situação operacional no período atual |
| Pedidos | Consultar a situação geral e abrir a fila operacional |
| Financeiro | Registrar despesas como rascunho para aprovação |
| Revisões | Aprovar ou rejeitar despesas pendentes |
| Auditoria | Consultar eventos financeiros registrados pelo sistema |
| Relatórios | Gerar as ações de relatório a partir do resumo financeiro |
| Cardápio | Criar, editar, organizar e desativar produtos e categorias |
| Equipe | Criar membros, reenviar convite e alterar papéis de acesso |
| Configurações | Ajustar informações operacionais da loja |

### 5.1 Gerenciar cardápio e fotos

Fotos de produto devem ser inseridas no módulo **Cardápio** pelo seletor de arquivo, e não por link manual. O sistema aceita JPG, PNG ou WebP até 5 MB, converte a imagem para WebP no navegador e pede uma URL assinada de armazenamento antes de salvar a referência no catálogo. Essa regra reduz peso da vitrine e evita guardar imagens no banco de dados.[6]

Antes de publicar uma alteração de cardápio, o administrador deve conferir nome, descrição, categoria, preço, disponibilidade e foto. Para evitar divergência no atendimento, qualquer produto descontinuado deve ser desativado ou removido da vitrine antes de a cozinha parar de produzi-lo.

### 5.2 Gerenciar equipe e suspender acessos

Para uma nova pessoa, o administrador deve criar o membro como **Operação** na maioria dos casos. O papel **Administrador** deve ser reservado a quem precisa alterar cardápio, equipe, configurações e dados financeiros. Para retirar acesso, altere o papel para **Sem acesso**; o usuário deixa de ser elegível para a operação interna.

Não compartilhe senhas, não reutilize uma conta de gestor para a cozinha e não conceda acesso administrativo por conveniência. O modelo adotado é individual, auditável e revogável.[1]

## 6. Aplicativo instalável e uso em celular

A vitrine pública é uma PWA instalável. Quando o navegador oferecer a instalação, o cliente ou a equipe pode confirmar para criar um atalho na tela inicial. A instalação facilita abrir o cardápio e o acompanhamento, mas não substitui a conexão necessária para registrar pedidos ou sincronizar a fila.

Em dispositivos móveis, prefira conexão estável e mantenha o navegador atualizado. Antes de iniciar a operação do dia, faça uma abertura da fila, confirme o áudio de alerta e teste a impressão no dispositivo efetivamente conectado à impressora.

## 7. Rotina recomendada

| Momento | Responsável | Procedimento |
|---|---|---|
| Abertura | Operação | Entrar com conta individual, abrir fila, testar alerta e impressão |
| Durante o atendimento | Operação | Conferir cada pedido, atualizar somente o status verdadeiro e registrar cancelamento apenas quando aplicável |
| Fechamento | Administrador | Revisar pedidos pendentes, despesas em rascunho e alertas operacionais |
| Semanal | Administrador | Conferir cardápio, pessoas com acesso, auditoria financeira e fotos de produtos |
| Mensal | Administrador | Revisar relatório, custos, despesas aprovadas e permissões da equipe |

## 8. Solução rápida de problemas

| Situação | Verificação inicial | Ação segura |
|---|---|---|
| Cliente não encontra pedido | Telefone com DDD e código do pedido | Refazer a consulta em `/acompanhar`; não criar pedido duplicado sem conferir a fila |
| Equipe não consegue entrar | E-mail, senha e papel interno | Usar recuperação somente após o SMTP estar configurado; administrador pode verificar o papel do membro |
| Convite ou recuperação não chega | Estado do SMTP e caixa de spam | Não repetir muitos convites; concluir SMTP com domínio institucional antes de depender do e-mail |
| Comanda não imprime | Navegador, janela de impressão e impressora local | Usar o gesto de reimprimir; em celular, tentar Compartilhar → Imprimir |
| Foto não sobe | Formato e limite de 5 MB | Usar JPG, PNG ou WebP menor que 5 MB; reenviar pelo módulo Cardápio |
| Painel sem dados | Conexão, sessão e permissão | Atualizar a página, entrar novamente e confirmar se o papel é compatível com o módulo |

## 9. Situação atual e pendências

O acesso por senha, o bloqueio de auto cadastro e a URL de definição de senha já estão publicados. O SMTP próprio foi deliberadamente mantido pendente porque a Marmitas TB ainda não definiu seu domínio institucional. Nenhum domínio foi comprado, reservado ou registrado nesta etapa.

Quando houver domínio definido, o responsável técnico deve validar os registros DNS no provedor de e-mail transacional escolhido, configurar as credenciais SMTP no Supabase e executar um teste controlado de convite e recuperação. O procedimento detalhado está em [Acesso interno por senha — operação](./acesso-interno-por-senha-operacao.md).

## Referências

[1]: ./acesso-interno-por-senha-operacao.md "Acesso interno por senha — operação"
[2]: ../client/src/components/delivery/ProductCatalog.tsx "Comportamento do catálogo e sacola"
[3]: ./operacao/asaas-homologacao.md "Homologação Asaas Sandbox"
[4]: ../client/src/pages/TrackOrder.tsx "Acompanhamento público de pedidos"
[5]: ../client/src/components/operations/OrderQueue.tsx "Fila operacional e impressão"
[6]: ../client/src/services/productImageUpload.ts "Validação e conversão WebP de fotos"
