# Migração do histórico operacional legado para Supabase

**Status:** especificação de preparação; nenhuma gravação foi executada no Supabase nesta etapa.  
**Decisão de escopo:** importar o histórico operacional legado, mediante aprovação explícita imediatamente antes de qualquer escrita.  
**Data do inventário:** 19 de agosto de 2026, em modo somente leitura.

## Inventário confirmado

O banco MySQL/TiDB legado foi consultado exclusivamente com agregações `SELECT COUNT(*)`. Não foram exportados nomes, telefones, endereços, conteúdo de pedidos ou outros dados pessoais. O Supabase também foi inspecionado sem escrita para validar o destino e as dependências relacionais.

| Entidade operacional | Registros no legado | Registros atuais no Supabase | Situação de importação |
|---|---:|---:|---|
| `orders` | 0 | 0 | Não há pedidos históricos a importar. |
| `orderItems` | 0 | 0 | Não há itens históricos a importar. |
| `orderEvents` | 0 | 0 | Não há eventos históricos a importar. |
| `paymentEvents` | 0 | 0 | Não há eventos de pagamento históricos a importar. |
| `printJobs` | 0 | 0 | Não há filas de impressão históricas a importar. |
| `storeSettings` | 0 | 0 | Não há configurações históricas a importar. |

> O inventário confirma que a importação aprovada terá efeito operacional nulo no estado atual. A preparação continua necessária para tornar uma futura migração repetível, caso a origem correta passe a conter registros.

O catálogo já existe no destino, com **8 categorias**, **18 produtos** e **90 opções**. Há um perfil administrativo no Supabase, mas nenhum dado operacional vinculado a ele. O resultado agregado pode ser repetido com `pnpm exec tsx scripts/inventory-legacy-operational-data.mjs`; o comando exige `DATABASE_URL` e não contém instruções de escrita.

### Evidência do snapshot exportado

Além da contagem, o exportador somente leitura foi executado com êxito. O artefato é criado com permissão de proprietário (`0600`) no diretório local ignorado pelo controle de versão; ele não é distribuído nem anexado a este documento. A versão 2 acrescenta `storeSettings` ao formato anterior, totalizando seis coleções operacionais.

| Propriedade | Valor |
|---|---|
| Comando executado | `pnpm migration:export-legacy` |
| Data e hora do artefato | `2026-08-19T04:10:39.098Z` |
| Formato | `legacy-operational` versão 2 |
| SHA-256 do arquivo | `ed7ad4af9f903e8c5d1ca46c828d0b8675cc88c9af51e45afa2df0182fffbcbb` |
| Conteúdo | Seis coleções vazias; nenhum registro operacional ou dado pessoal. |

## Princípios de preservação e segurança

Os IDs inteiros do banco legado não devem substituir UUIDs do Supabase nem ser descartados. A migração deverá preservar a rastreabilidade em uma tabela de mapas própria, sem expor identificadores ou dados pessoais na interface pública. Ela será executada com credencial administrativa somente em uma transação controlada, com relatório agregado e logs redigidos.

| Princípio | Regra obrigatória |
|---|---|
| Sem escrita implícita | Nenhum `INSERT`, `UPDATE`, `DELETE`, DDL ou chamada de escrita será executado sem uma autorização explícita e contemporânea do responsável. |
| Reexecução segura | O mesmo snapshot deve produzir somente registros já reconhecidos, nunca duplicatas silenciosas. |
| Preservação | Valores de moeda, datas, código do pedido, payloads e identificadores de origem devem permanecer auditáveis. |
| Integridade | Pais devem existir antes dos filhos; referências sem resolução ficam nulas apenas quando o esquema permite e entram no relatório de exceções. |
| Privacidade | Relatórios de acompanhamento usam contagens, hashes e IDs técnicos; não exibem telefone, endereço, nome ou payload de pagamento. |

## Mapa de entidades e identificadores

O destino utiliza UUIDs como chaves primárias. A estratégia proposta é criar, antes da primeira importação real, a tabela privada `legacy_import_maps` com chave composta `legacy_entity + legacy_id` e UUID de destino. Essa tabela será o registro de idempotência e reconciliação, evitando a necessidade de poluir as tabelas operacionais com campos de legado.

| Origem MySQL | Chave de origem | Destino Supabase | Chave de destino | Regra de mapeamento |
|---|---|---|---|---|
| `orders` | `orders.id` inteiro | `orders` | `orders.id` UUID | Inserir o pedido e registrar `orders/<id> → <uuid>` em `legacy_import_maps`; `orders.code` é a segunda chave de reconciliação e permanece único. |
| `orderItems` | `orderItems.id` inteiro | `order_items` | `order_items.id` UUID | Resolver primeiro o UUID do pedido pelo mapa; resolver produto pelo catálogo controlado; registrar o mapa do item. |
| `orderEvents` | `orderEvents.id` inteiro | `order_events` | `order_events.id` UUID | Resolver `order_id` pelo mapa; resolver o ator somente por uma tabela de identidades comprovada; registrar o mapa do evento. |
| `paymentEvents` | `paymentEvents.id` inteiro | `payment_events` | `payment_events.id` UUID | Resolver `order_id` quando houver; conciliar também por `provider + external_event_id`; registrar o mapa do evento. |
| `printJobs` | `printJobs.id` inteiro | `print_jobs` | `print_jobs.id` UUID | Resolver `order_id` pelo mapa e registrar o mapa da comanda. |
| `storeSettings` | `storeSettings.id` inteiro | `store_settings` | chave natural `setting_key` | A chave de configuração é a identidade do destino; registrar um mapa com UUID técnico de execução ou aplicar uma tabela de mapa com `target_key` textual. Nunca sobrescrever configuração mais nova sem regra temporal aprovada. |
| `users` | `users.id` inteiro | `profiles` | `profiles.id` UUID | Não criar usuários Auth durante importação histórica. Só mapear por e-mail normalizado e unívoco, após confirmação administrativa; atores não mapeados permanecem `NULL`. |

### Estrutura proposta para a tabela de mapas

| Coluna | Tipo proposto | Finalidade |
|---|---|---|
| `legacy_entity` | `text` | Nome estável da entidade de origem, por exemplo `orders`. |
| `legacy_id` | `bigint` | Identificador numérico preservado do MySQL/TiDB. |
| `target_id` | `uuid`, nulo quando o alvo usar chave textual | UUID produzido ou localizado no Supabase. |
| `target_key` | `text`, nulo quando houver UUID | Chave natural, necessária para `store_settings`. |
| `source_hash` | `text` | Hash canônico do registro de origem, usado para detectar divergência em reexecuções. |
| `migration_run_id` | `uuid` | Identificação da execução que criou ou validou o mapa. |
| `created_at` | `timestamptz` | Registro temporal de auditoria. |

As restrições mínimas serão `PRIMARY KEY (legacy_entity, legacy_id)`, exatamente um dos campos `target_id` ou `target_key` preenchido, e unicidade do destino por entidade quando aplicável. A tabela e suas políticas serão propostas em migração SQL versionada, mas **não aplicadas** antes da autorização de escrita.

## Mapa de campos e normalizações

As transformações preservam conteúdo sem fazer inferências sobre estados, pagamentos ou autoria. Qualquer valor fora do contrato será classificado como exceção, não convertido para uma aproximação.

| Entidade | Campos MySQL | Campos Postgres | Transformação e validação |
|---|---|---|---|
| Pedido | `code`, `customerName`, `customerPhone`, `customerPhoneLookup` | `code`, `customer_name`, `customer_phone`, `customer_phone_lookup` | Preservar o código; derivar a chave de consulta removendo caracteres não numéricos do telefone; conferir a chave legada quando presente e registrar divergências. |
| Pedido | `fulfillmentMethod`, valores monetários, status e pagamento | `fulfillment_method`, campos `_in_cents`, enums de pedido e pagamento | Converter somente nomes de coluna de camelCase para snake_case; aceitar exclusivamente os valores já pertencentes aos enums do Supabase. Valores monetários continuam inteiros não negativos em centavos. |
| Pedido | `createdAt`, `updatedAt`, `paymentConfirmedAt` | `created_at`, `updated_at`, `payment_confirmed_at` | Converter para `timestamptz` preservando o instante. Se a origem não declarar fuso horário, interromper a importação com exceção de data em vez de assumir um horário. |
| Item | `configurationJson` | `configuration` (`jsonb`) | Fazer parse de JSON. Texto inválido não é descartado: será incluído em um relatório de exceção e exige decisão explícita sobre um envelope de preservação. |
| Evento de pedido | `actorUserId`, `fromStatus`, `toStatus` | `actor_user_id`, `from_status`, `to_status` | Aplicar o mapa de usuários apenas quando houver correspondência comprovada; estado não pertencente ao enum bloqueia o registro e é reportado. |
| Evento de pagamento | `payloadJson`, `processedAt` | `payload`, `processed_at` | Fazer parse de JSON sem alterar o payload. Evento duplicado é identificado por `provider + external_event_id` e pelo mapa legado. |
| Fila de impressão | `status`, `attempts`, `printerName`, `printedAt` | `status`, `attempts`, `printer_name`, `printed_at` | Conservar o estado original somente se estiver em `queued`, `printed` ou `failed`; `attempts` deve ser inteiro não negativo. |
| Configuração | `settingKey`, `settingValue`, `updatedByUserId` | `setting_key`, `setting_value`, `updated_by_user_id` | Fazer parse de `settingValue` para `jsonb`; não substituir uma configuração no destino sem comparação de tempo e aprovação explícita. |

## Ordem de importação e comportamento idempotente

Uma futura execução trabalhará com um snapshot versionado, contendo o timestamp de exportação, hash do arquivo e as seis coleções operacionais. O plano mantém as leituras isoladas das gravações e permite uma simulação integral antes do uso da credencial de escrita.

| Etapa | Operação planejada | Resultado esperado |
|---|---|---|
| 1 | Validar versão, hash, tipos, enums, datas e relações do snapshot. | Relatório sem PII de contagens válidas, inválidas e pendentes. |
| 2 | Criar ou validar `migration_run` e `legacy_import_maps`. | Execução identificável e reprocessável. |
| 3 | Resolver mapeamentos do catálogo e de identidade sem criar usuários Auth. | Lista de referências resolvidas e exceções. |
| 4 | Inserir pedidos e seus mapas, usando `code` como guarda de colisão. | Todos os pedidos filhos terão pai UUID existente. |
| 5 | Inserir itens, eventos, pagamentos e comandas por ordem de dependência. | Cada registro será criado uma única vez ou reconhecido pelo seu mapa/hash. |
| 6 | Importar configurações somente quando a política temporal aprovada permitir. | Nenhuma configuração atual será sobrescrita silenciosamente. |
| 7 | Executar reconciliação, marcar a execução como concluída e guardar o relatório. | Contagens e integridade verificáveis antes de encerrar a transação. |

Uma reexecução com o mesmo par `legacy_entity + legacy_id` deve comparar `source_hash`. Se o hash for igual, o item é tratado como já importado; se for diferente, a execução falha com conflito de origem. Um `orders.code` já existente sem mapa legado também é conflito bloqueante, pois pode ser um pedido criado diretamente no novo sistema.

### Simulação idempotente executada

O planejador puro `planLegacyOperationalImport` não recebe conexão de banco, cliente Supabase ou função de escrita. Ele foi validado em testes para três casos: reconhecimento de mapa legado já existente, bloqueio de colisão de `orders.code` sem mapa e interrupção de item cujo produto ainda não tenha UUID de destino. A simulação local do snapshot exportado foi executada sem chamar serviços externos.

| Propriedade | Resultado |
|---|---|
| Comando executado | `LEGACY_SNAPSHOT_PATH=<artefato> pnpm migration:plan-legacy-import` |
| Modo retornado | `dry-run` |
| SHA-256 validado | `ed7ad4af9f903e8c5d1ca46c828d0b8675cc88c9af51e45afa2df0182fffbcbb` |
| Registros planejados para criação | 0 nas seis entidades |
| Registros já mapeados | 0 nas seis entidades |
| Conflitos | 0 |
| Referências não resolvidas | 0 |

> Esta simulação comprova somente o comportamento do planejador sobre o snapshot vazio. Ela não cria a tabela de mapas, não aplica migração SQL e não escreve no Supabase.

## Reconciliação e rollback lógico

A primeira importação real não apagará registros como método de reversão. O rollback lógico será definido por `migration_run_id`: os registros criados pela execução podem ser marcados no mapa como revertidos e removidos somente em uma operação administrativa separada, dentro de transação, após confirmação. Registros anteriores ou mapeamentos de outra execução ficam intocados.

| Verificação | Critério de aprovação |
|---|---|
| Contagens | Quantidade importada ou reconhecida para cada entidade igual à quantidade do snapshot, descontadas apenas exceções explicitamente aprovadas. |
| Relações | `order_items`, `order_events` e `print_jobs` sem `order_id` inexistente; pagamentos sem pedido só quando o registro legado também não tiver referência. |
| Chaves | Nenhuma duplicata de `orders.code` e nenhuma duplicata de `provider + external_event_id`. |
| Catálogo | Todo `product_id` legado mapeado a produto UUID existente ou explicitamente preservado como nulo, sem inventar correspondência. |
| Autoria | Nenhum `actor_user_id` ou `updated_by_user_id` aponta para perfil não existente. |
| Conteúdo | Dados JSON válidos convertidos para `jsonb`; textos inválidos contados como exceção, nunca descartados silenciosamente. |
| Relatório | Saída agregada com execução, hash do snapshot, contagens, conflitos e nenhuma informação pessoal identificável. |

## Pré-condições para autorizar uma escrita futura

Para o inventário atual, não existe dado para inserir. Se uma nova origem com registros for apresentada, a autorização precisará cobrir a migração de esquema proposta, a importação de dados e a política de tratamento das exceções. Antes disso, será preparado um teste automatizado de importação idempotente e uma simulação que não chama o Supabase.

| Pré-condição | Estado atual |
|---|---|
| Snapshot somente leitura com contagens e hash | Atendido para o banco atualmente conectado, com seis contagens iguais a zero. |
| Esquema de mapas versionado e testado | Pendente; será apenas preparado, não aplicado, na próxima fase. |
| Simulação de importação e reconciliação | Pendente; será executada sem credenciais de escrita. |
| Aprovação explícita para DDL e DML | Pendente e obrigatória, mesmo que uma futura origem contenha poucos registros. |
| Confirmação de dados de origem não vazios | Pendente; o banco legado atualmente conectado não contém histórico operacional. |
