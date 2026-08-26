# Núcleo unificado de pedidos — especificação de design

**Status:** Implementado em código e aplicado no Supabase; aguardando somente a validação integrada e a aprovação de publicação.  
**Data:** 26/08/2026.  
**Decisão arquitetural:** evolução compatível das estruturas atuais; nenhuma substituição total de tabelas ou interrupção dos fluxos em produção.

## 1. Objetivo

Transformar o pedido interno existente na fonte única de operação da Marmitas TB. O aplicativo próprio, o totem e, em fases futuras, o PDV, o iFood e lançamentos autorizados deverão criar ou atualizar pedidos por um único serviço de domínio. A mesma estrutura deverá produzir histórico, auditoria e trabalhos de impressão, sem que cada canal implemente regras próprias.

Nesta fase, o aplicativo próprio e o totem serão os únicos adaptadores funcionais. PDV, iFood, pagamento real e agente local de impressão permanecem fora de ativação, mas os contratos preparados nesta fase não poderão impedir sua incorporação posterior.

## 2. Escopo e limites da primeira fase

| Incluído | Excluído nesta fase |
|---|---|
| Canal de origem em todos os pedidos existentes e novos | Integração autenticada com iFood |
| Serviço interno de criação com chave de idempotência | Cobrança real e alteração de credenciais Asaas |
| Adaptador do aplicativo próprio e adaptação progressiva do totem | PDV completo, fechamento de caixa e estoque |
| Auditoria de criação, mudança de status e reimpressão | Agente local USB/rede e comunicação ESC/POS |
| Estações e fila de impressão auditável, independente do canal | Emissão fiscal e compra automatizada |
| Migração retrocompatível, testes e documentação | Alteração dos preços, do catálogo ou da identidade visual |

## 2.1 Registro de implementação — 26/08/2026

O projeto Supabase `marmitas-tb` recebeu duas migrações aditivas e compatíveis: `20260826100000_unified_order_core.sql` e `20260826200000_unified_print_queue.sql`. Os pedidos existentes foram classificados como `OWN_APP`; não houve exclusão de dados, ativação de cobrança real, alteração de credenciais externas ou criação de integração iFood.

O checkout atual passou a persistir via `create_unified_order`, com preço e configuração congelados, chave UUID idempotente, evento, auditoria e outbox. O totem passa a carregar o cardápio público, preservar os identificadores do Supabase e registrar confirmações demonstrativas como `KIOSK`; a cobrança continua estritamente simulada. A fila Vercel consulta `print_jobs` por `priority DESC, created_at ASC`. A rotina `requeue_print_job` cria reimpressões de modo atômico, exige uma razão fornecida pela equipe e grava o ator, o canal, a razão e o evento de saída.

| Regra implantada | Comportamento |
|---|---|
| Pedido repetido | A chave idempotente por canal retorna o registro original e não cria itens ou eventos duplicados. |
| Aplicativo próprio | O servidor fixa `OWN_APP`; o navegador não escolhe canal interno. |
| Totem | O endpoint dedicado fixa `KIOSK`, sem chamada de gateway de pagamento. |
| Fila comum | Os trabalhos pendentes são compartilhados na tabela `print_jobs`. |
| Preferência do balcão | `COUNTER` recebe prioridade 100; os demais canais recebem 50 e mantêm ordem cronológica entre si. |
| Reimpressão | Requer perfil interno, motivo de ao menos três caracteres e grava auditoria transacional. |

## 3. Contrato operacional unificado

Cada entrada é convertida para um comando interno de criação de pedido. O contrato normalizado deverá conter `sourceChannel`, `idempotencyKey`, cliente, modalidade, pagamento, itens e metadados de origem. Para canais externos futuros, também aceitará `externalProvider` e `externalOrderId`.

Os valores de origem são: `OWN_APP`, `KIOSK`, `COUNTER`, `IFOOD`, `PHONE`, `WHATSAPP` e `INTERNAL`. Os pedidos atuais serão retroativamente identificados como `OWN_APP`, sem mudar código, itens, valor, status ou histórico.

Os status atuais em português serão preservados nesta fase para não quebrar operação, acompanhamento público, relatórios ou dados existentes. O serviço interno tratará essas transições como o vocabulário operacional vigente e somente uma futura migração explícita poderá introduzir nomenclatura adicional.

## 4. Idempotência e canais

O aplicativo próprio deverá gerar uma chave UUID por tentativa de checkout e preservá-la enquanto aguarda a resposta do servidor. O totem deverá gerar uma chave por atendimento iniciado e utilizá-la uma única vez na confirmação. Reenvios causados por toque repetido, instabilidade de rede ou repetição da requisição deverão retornar a confirmação originalmente persistida, sem duplicar pedido, itens, eventos ou impressão.

No banco, a chave será única por canal de origem. Canais externos futuros deverão ainda preservar o provedor e o identificador externo; a combinação provedor + identificador externo será única quando preenchida. Eventos recebidos de integrações futuras usarão uma inbox própria antes de alcançarem o serviço de pedidos.

## 5. Dados e migração compatível

A migração será aditiva e reversível no código. Ela deverá:

1. criar um tipo ou domínio controlado de canais de origem;
2. acrescentar às tabelas `orders` os campos de origem, provedor externo, identificador externo e chave de idempotência;
3. preencher registros históricos com `OWN_APP` antes de tornar a origem obrigatória;
4. criar índices e restrições parciais para impedir duplicidade sem afetar linhas históricas sem identificadores externos;
5. criar `audit_logs`, com ator quando houver, ação, entidade, identificador, canal, metadados reduzidos e data;
6. criar `print_stations`, com código, nome, finalidade e ativação;
7. ampliar `print_jobs` com estação, tipo de documento, prioridade, chave de deduplicação, tentativas, último erro e vínculo de auditoria;
8. criar uma outbox de eventos internos para registrar `OrderCreated`, `OrderConfirmed`, `PrintJobCreated` e demais efeitos pendentes.

Nenhuma tabela operacional será apagada. Nenhum dado financeiro ou pessoal será removido. Segredos externos não serão gravados nessas estruturas.

## 6. Serviço de pedidos e efeitos

O serviço interno realizará as etapas a seguir em uma unidade transacional sempre que o banco permitir:

```text
adaptador do canal
→ validação de disponibilidade e opções
→ consulta da chave idempotente
→ criação do pedido e dos itens com preço congelado
→ evento de pedido e registro de auditoria
→ evento na outbox
→ criação idempotente de trabalho de impressão quando aplicável
→ confirmação para o canal de origem
```

A indisponibilidade de uma impressora não poderá impedir o pedido. O serviço somente criará o trabalho pendente; o agente local e a impressão física serão implementados posteriormente. A prioridade será determinística: trabalhos do canal `COUNTER` receberão prioridade máxima e serão consumidos antes dos demais trabalhos pendentes. Dentro da mesma prioridade, a ordem será cronológica. Essa regra não cancela, sobrescreve nem descarta comandas de aplicativo, totem, iFood ou lançamentos internos; apenas define a próxima tarefa elegível para impressão. Uma reimpressão exigirá autorização interna e gravará ator, razão e referência no histórico.

## 7. Segurança, privacidade e permissões

O cliente público nunca receberá auditoria, dados de outros pedidos, informações da impressora, mensagens internas ou eventos de integração. O acompanhamento por telefone continuará retornando uma projeção reduzida. A criação pública só aceitará canais liberados pelo servidor; `COUNTER`, `INTERNAL` e `IFOOD` não poderão ser informados pelo navegador.

Somente perfis internos autorizados poderão criar reimpressões, alterar estação e consultar logs administrativos. Toda operação sensível deverá ser validada no servidor, não apenas escondida na interface.

## 8. Experiência por canal

O aplicativo próprio conserva o checkout e o acompanhamento atuais, adicionando apenas a chave de idempotência invisível ao cliente. O totem continuará com interface vertical, pagamento demonstrativo e retorno por inatividade; sua confirmação passará a registrar um pedido `KIOSK` no mesmo núcleo, mantendo explícito que não há cobrança real. PDV e iFood serão conectados por adaptadores futuros sem alteração visual do aplicativo público.

## 9. Falhas e recuperabilidade

| Situação | Comportamento obrigatório |
|---|---|
| Reenvio com a mesma chave | Retornar o pedido original; não criar nova impressão. |
| Produto indisponível antes da gravação | Recusar de forma clara; não persistir pedido parcial. |
| Falha ao registrar efeito secundário | Preservar pedido e outbox para reprocessamento auditável. |
| Estação ou impressora indisponível | Manter trabalho pendente e gerar alerta interno futuro. |
| Trabalho de balcão chega com fila existente | Posicioná-lo à frente dos trabalhos pendentes de menor prioridade, sem apagar ou duplicar nenhum deles. |
| Evento externo duplicado em fase posterior | Inbox identifica a duplicidade e não chama o serviço novamente. |
| Cliente sem conexão | Não usar cache para criar ou confirmar pedido; orientar a tentar novamente. |

## 10. Validação e critérios de aceite

O incremento será aceito somente quando testes de contrato comprovarem que uma mesma chave não duplica pedido, itens, evento ou trabalho de impressão; que um pedido do aplicativo recebe `OWN_APP`; que um pedido do totem recebe `KIOSK`; que uma reimpressão exige papel interno; e que o acompanhamento público não exponha metadados internos.

Além dos testes, serão executados migração em ambiente autorizado, suíte completa, verificação TypeScript, build PWA, build do runtime Vercel, revisão de rota em desktop e celular e auditoria do diff. A publicação continuará dependente de aprovação explícita do responsável.

## 11. Dependências das fases seguintes

O PDV consumirá o mesmo comando com `COUNTER` e a criação de seus trabalhos de impressão aplicará a prioridade máxima definida para o balcão. O adaptador iFood utilizará inbox, `IFOOD`, provedor e identificador externo. O agente local buscará `print_jobs` por estação, ordenando primeiro pela prioridade e depois pela criação, confirmará a impressão e gravará resultado sem acesso direto ao banco do navegador. Estoque, financeiro, fiscal e dashboard consumirão eventos da outbox; nenhum desses módulos será construído de forma paralela dentro da primeira fase.
