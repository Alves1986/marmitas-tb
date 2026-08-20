# Diagnóstico dos Advisors do Supabase — 20 de agosto de 2026

## Escopo e evidência

Este diagnóstico foi realizado em **modo somente leitura** no projeto Supabase `marmitas-tb` (`hwkgplnzvcaobjozfmqx`), ativo na região `sa-east-1`. Foram consultados os advisors de **segurança** e **desempenho**. Nenhuma migração SQL, política RLS, índice, dado de pedido, usuário, credencial, domínio ou configuração de SMTP foi alterado nesta verificação.

> Os avisos de desempenho devem orientar uma evolução planejada; não são evidência de exposição de dados. Alterações em políticas RLS ou índices precisam ser acompanhadas de testes de autorização e de regressão do catálogo, operação e administração.

## Resultado executivo

| Área | Situação observada | Prioridade | Decisão nesta etapa |
|---|---|---:|---|
| Segurança de senha | A proteção contra senhas vazadas do Supabase Auth está desativada. | Alta | Registrar a recomendação; aguardar autorização específica para alterar a configuração de Auth. |
| Chaves estrangeiras | Há avisos de chaves estrangeiras sem índice de cobertura em tabelas operacionais e de auditoria. | Média | Planejar índices em migração separada, após análise das consultas reais. |
| Políticas RLS | Há políticas que reavaliam funções de autenticação por linha e conjuntos de políticas permissivas sobrepostos. | Média | Revisar em uma mudança dedicada, com matriz de autorização e testes antes de publicar. |
| Índices não usados | Alguns índices ainda não registraram uso. | Baixa | Não remover nesta fase; o histórico de utilização pode ser curto. |

## Segurança

O advisor retornou um aviso externo de nível **WARN**: a proteção contra senhas comprometidas está desativada no Supabase Auth. Quando ativada, essa proteção impede o uso de senhas identificadas como comprometidas pela verificação integrada com o serviço Have I Been Pwned, conforme a documentação oficial do Supabase.[1]

| Recomendação | Impacto esperado | Condição de execução |
|---|---|---|
| Ativar **Leaked Password Protection** nas configurações de senha do Supabase Auth. | Reduz a chance de uma nova senha interna coincidir com uma credencial conhecida como comprometida. | Executar somente com autorização para alterar a configuração externa de Auth e confirmar visualmente o fluxo de definição/recuperação de senha depois da mudança. |

## Desempenho

Os avisos abaixo são recomendações de eficiência. Eles não modificam por si só os papéis `customer`, `staff` e `admin`, nem indicam falha de RLS.

| Grupo de aviso | Objetos sinalizados | Orientação de manutenção |
|---|---|---|
| Chaves estrangeiras sem índice de cobertura | `admin_audit_logs.actor_user_id`, `expense_entries.approved_by_user_id`, `order_events.actor_user_id`, `order_items.product_id`, `print_jobs.order_id` e `store_settings.updated_by_user_id`. | Avaliar a criação dos índices conforme as consultas e relatórios efetivamente usados. O linter descreve a recomendação e seus critérios.[2] |
| Funções de Auth reavaliadas por linha em RLS | Políticas de `profiles`, `orders`, `order_items`, `order_events` e três políticas de `expense_entries`. | Revisar as expressões das políticas para o padrão indicado pelo Supabase, como envolver chamadas de Auth em subconsulta quando semanticamente equivalente, e reexecutar a matriz de testes de permissão.[3] |
| Políticas permissivas sobrepostas | `categories`, `expense_entries`, `product_options`, `products` e `store_settings`. | Consolidar somente após provar que a regra resultante preserva todos os acessos necessários. Políticas permissivas são combinadas por OR; uma simplificação descuidada pode ampliar ou restringir acesso.[4] |
| Índices sem uso observado | `expense_entries_submitted_by_created_at_idx`, `admin_audit_logs_created_at_idx`, `admin_audit_logs_entity_idx`, `orders_customer_user_id_idx` e `payment_events_order_processed_at_idx`. | Preservar nesta fase. Um índice sem uso no período observado pode ser necessário em rotinas pouco frequentes, relatórios futuros ou picos de operação.[5] |

## Plano seguro para uma evolução futura

1. Criar uma tarefa isolada para a proteção de senhas e obter autorização antes de alterar o Supabase Auth.
2. Levantar as consultas reais do painel financeiro, fila operacional, auditoria e acompanhamento antes de criar índices.
3. Escrever testes de regressão para cada papel e para os cenários de RLS antes de refatorar políticas.
4. Aplicar uma única migração revisada, preferencialmente em ambiente de prévia, e reexecutar os advisors após a validação.
5. Não remover índices apenas pelo aviso; basear a decisão em período de observação representativo e métricas de consulta.

## Estado após o diagnóstico

O projeto continua operacional, sem escrita no banco e sem modificação de configuração. Permanecem independentes deste diagnóstico as pendências externas de SMTP com domínio institucional e das credenciais de Sandbox do Asaas.

## Referências

[1] [Supabase — Password security and leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

[2] [Supabase — Database linter: unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)

[3] [Supabase — Row Level Security: call functions with `select`](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select)

[4] [Supabase — Database linter: multiple permissive policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies)

[5] [Supabase — Database linter: unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)
