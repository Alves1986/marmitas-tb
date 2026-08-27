# PDV de balcão híbrido — especificação de design

**Status:** Implementado em código e aplicado no Supabase; aguardando somente revisão operacional e autorização de publicação.  
**Data:** 26/08/2026.  
**Decisão arquitetural:** criar um adaptador interno `COUNTER` conectado ao núcleo unificado existente, sem alterar os canais `OWN_APP` e `KIOSK`, sem cobranças externas e sem fila paralela de impressão.

## 1. Objetivo

Disponibilizar à equipe e à administração uma rota interna de ponto de venda para atendimento presencial no balcão. O PDV deverá permitir montar um pedido completo, configurar produtos, registrar uma forma de pagamento presencial, gerar senha de retirada e criar uma comanda prioritária na mesma fila operacional já utilizada pelos demais canais.

O objetivo é reduzir o tempo entre o pedido presencial e a produção, sem sacrificar validação server-side, rastreabilidade ou consistência de preços. A origem `COUNTER` será definida exclusivamente no servidor; nenhum navegador poderá promovê-la por meio do endpoint público de pedidos.

## 2. Escopo e limites

| Incluído | Excluído nesta fase |
|---|---|
| Rota protegida `/operacao/pdv` para `staff` e `admin` | Integração com maquininha, TEF, PIX dinâmico ou gateway |
| Catálogo público com categorias, busca, disponibilidade e imagens | Emissão fiscal, abertura/fechamento de caixa e sangria |
| Configuração completa de itens, adicionais e observações | Novo agente local de impressão ou comunicação ESC/POS |
| Carrinho de balcão e nome do cliente opcional | Entrada iFood, WhatsApp ou telefone |
| Registro interno de dinheiro, PIX, débito, crédito e voucher | Alteração de credenciais Asaas, SMTP ou domínios |
| Pedido `COUNTER` confirmado, auditado e idempotente | Exclusão ou mudança de dados/pedidos existentes |
| Senha de retirada e recibo visual | Publicação, push GitHub ou cobrança real sem nova autorização |

## 3. Experiência e estrutura visual

Em desktop, a rota terá uma composição de três áreas: navegação por categoria e busca à esquerda, grade de produtos no centro e carrinho persistente à direita. A configuração será aberta em um painel lateral, para não remover o contexto de venda. Em telas estreitas, o carrinho e a configuração usarão painéis deslizantes acessíveis.

O carrinho exibirá quantidade, preço unitário congelado, observações e total em BRL. A ação principal abrirá um diálogo de confirmação com nome opcional, forma de pagamento registrada e um aviso inequívoco de que não há processamento financeiro. A confirmação só ficará disponível quando houver pelo menos um item validamente configurado e uma forma de pagamento selecionada.

| Forma registrada | Semântica nesta fase | Estado persistido |
|---|---|---|
| Dinheiro | Recebido presencialmente | `confirmed` |
| PIX | Confirmado pelo operador no balcão | `confirmed` |
| Débito | Aprovado presencialmente no terminal externo | `confirmed` |
| Crédito | Aprovado presencialmente no terminal externo | `confirmed` |
| Voucher | Aceito presencialmente pelo operador | `confirmed` |

## 4. Contrato de domínio e segurança

O PDV chamará uma função Vercel autenticada, separada do endpoint público. O servidor exigirá sessão com papel `staff` ou `admin`, fixará `sourceChannel: 'COUNTER'`, gerará ou validará uma chave UUID de idempotência por tentativa, validará disponibilidade, opções, preços e totais contra o catálogo persistido e chamará `create_unified_order`.

O comando conterá itens com `productId`, `optionIds`, quantidade e observação; nome opcional; modalidade `pickup`; pagamento e status de pagamento confirmados; e metadados mínimos de balcão. O telefone, endereço e dados de cobrança não serão solicitados. A auditoria armazenará o operador autenticado e a forma registrada, sem dados sensíveis de cartão ou terminal.

## 5. Confirmação, senha e impressão

Após a transação, o PDV retornará código do pedido, senha de retirada, estimativa operacional e total. A senha poderá reutilizar o formato diário `MTB-001`, mas será derivada no servidor de forma concorrente e auditável; não dependerá de `sessionStorage` como no totem demonstrativo.

O pedido `COUNTER` será criado em status `confirmado` com pagamento `confirmed`. A função unificada criará o trabalho de impressão com prioridade **100**. A consulta da fila já ordena `priority DESC, created_at ASC`, portanto pedidos de balcão serão elegíveis antes de trabalhos de prioridade 50, sem cancelar ou descartar nenhum deles.

## 6. Falhas, idempotência e recuperação

| Situação | Comportamento obrigatório |
|---|---|
| Toque repetido ou nova tentativa da mesma venda | A mesma chave retorna o pedido já gravado, sem duplicar itens, senha ou impressão. |
| Produto inativo, preço ou opção inválida | O servidor rejeita a venda e o carrinho permanece na tela para correção. |
| Falha de rede antes da confirmação | Não exibir senha; permitir reenviar a mesma tentativa. |
| Falha de impressão física | Preservar o pedido e o trabalho `queued`; o operador pode reimprimir com motivo auditável. |
| Sessão sem papel interno | Bloquear a rota e a função HTTP com resposta de autorização, sem expor dados de pedidos. |
| Forma de pagamento sem integração | Gravar apenas o método e a confirmação operacional; nunca iniciar transação externa. |

## 7. Testes e critérios de aceite

O incremento será aceito quando testes comprovarem que a rota é protegida; um envio do PDV usa somente `COUNTER`; itens e preços são recalculados no servidor; pagamentos presenciais ficam confirmados sem chamada externa; a mesma chave não duplica venda, impressão ou auditoria; e a prioridade da comanda é 100.

Também serão exigidos testes da interface para carrinho, configuração obrigatória, diálogo de pagamento, estados de erro e recibo; validação de tipos; build PWA e runtime Vercel; revisão visual desktop e celular; e revisão do diff. A publicação permanecerá manual e dependerá de nova aprovação explícita.

## 8. Dependências posteriores

O PDV desta fase cria a base de atendimento presencial. Uma futura fase poderá adicionar abertura e fechamento de caixa, troco, sangria, descontos com autorização, integrações TEF/maquininha, fiscal, estoque e uma tela de chamadas de retirada. Nenhuma dessas extensões será ativada agora.

## 9. Registro de implementação — 27/08/2026

A migração `20260827090000_counter_ticket.sql` foi aplicada de forma aditiva ao projeto Supabase `marmitas-tb`. Foram adicionados os valores internos `debit_card` e `counter_record`, os campos opcionais `counter_ticket_date` e `counter_ticket_number`, o índice parcial de unicidade da senha diária e a função transacional `create_counter_order`. Nenhum pedido anterior foi alterado e nenhuma integração de cobrança, TEF, maquininha, iFood, SMTP ou impressora física foi ativada.

A rota interna `/operacao/pdv` agora compõe catálogo, busca, carrinho, configuração lateral, pagamento presencial registrado e recibo de senha. O servidor fixa `COUNTER`, recalcula produtos e opções, vincula o operador e cria o trabalho de produção em prioridade 100. A validação final aprovou 302 testes, com 2 testes externos intencionalmente pulados; TypeScript, build PWA, runtime Vercel e verificação de diff também foram concluídos.
