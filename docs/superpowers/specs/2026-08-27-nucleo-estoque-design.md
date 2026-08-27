# Núcleo inicial de estoque por movimentações — especificação de design

**Status:** Experiência e contratos locais implementados; persistência Supabase arquivada e pendente de nova autorização.  
**Data:** 27/08/2026.  
**Decisão arquitetural:** criar uma área operacional única em `/operacao/estoque`, onde o saldo de cada insumo é calculado a partir de movimentações imutáveis e auditáveis. Este incremento não altera pedidos, não baixa estoque automaticamente e não habilita compras, QR Code, lotes, validade ou integrações externas.

## 1. Objetivo

O objetivo é estabelecer a primeira fonte confiável para o estoque da Marmitas TB. A operação poderá cadastrar os insumos básicos, consultar o saldo atual e o estoque mínimo, além de registrar entradas e consumos internos. Perdas e ajustes serão tratados como movimentos excepcionais, exigindo administrador, motivo e auditoria.

> O saldo não será editável. Toda alteração será representada por uma movimentação com quantidade, tipo, data, responsável e, quando aplicável, motivo. Essa regra preserva a rastreabilidade necessária para fases futuras de ficha técnica, perdas, inventário, compras e custos.

## 2. Escopo deste incremento

| Incluído | Excluído nesta etapa |
|---|---|
| Rota interna protegida `/operacao/estoque` | Baixa automática a partir de pedidos confirmados ou concluídos |
| Cadastro de insumos com nome, unidade e estoque mínimo | Ficha técnica, receita, rendimento ou custo por marmita |
| Unidades `kg`, `g`, `L`, `mL` e `unidade` | Conversão automática entre unidades |
| Movimentos de entrada, consumo interno, perda e ajuste | Compras automáticas, fornecedores ou pedido de compra |
| Saldo calculado a partir do histórico de movimentos | QR Code, leitores, lotes, validade, localização e quarentena |
| Histórico paginado e auditável por insumo | Integração iFood, Asaas, SMTP, hardware ou agente local |
| Atualização manual após uma gravação bem-sucedida | Criação de uma nova função Vercel além do limite atual |

## 3. Modelo de dados e regras de saldo

O incremento introduzirá duas entidades aditivas. `inventory_items` representa o cadastro do insumo. `inventory_movements` registra fatos imutáveis que compõem o saldo. Nenhuma coluna de saldo poderá ser atualizada diretamente pela interface.

| Entidade | Campos principais | Regra |
|---|---|---|
| `inventory_items` | `id`, `name`, `unit`, `minimum_stock`, `is_active`, `created_at`, `updated_at` | Nome único entre itens ativos; estoque mínimo maior ou igual a zero; unidade não pode ser alterada após existir movimento. |
| `inventory_movements` | `id`, `inventory_item_id`, `type`, `quantity_delta`, `reason`, `note`, `actor_user_id`, `created_at` | Quantidade nunca é zero; não há edição ou exclusão física; o sinal representa entrada ou saída. |

O saldo atual será a soma de `quantity_delta` por insumo. Movimentos de entrada usam quantidade positiva; consumo interno e perda usam quantidade negativa. O ajuste poderá aumentar ou reduzir o saldo, mas sempre exigirá motivo explícito. Não será permitido confirmar um consumo, perda ou ajuste redutor que deixe o saldo abaixo de zero.

| Tipo | Efeito no saldo | Quem pode registrar | Requisitos adicionais |
|---|---:|---|---|
| `ENTRY` | Positivo | `staff` e `admin` | Quantidade obrigatória; observação opcional. |
| `INTERNAL_CONSUMPTION` | Negativo | `staff` e `admin` | Quantidade obrigatória; não pode levar o saldo abaixo de zero. |
| `LOSS` | Negativo | Apenas `admin` | Motivo obrigatório; não pode levar o saldo abaixo de zero. |
| `ADJUSTMENT` | Positivo ou negativo | Apenas `admin` | Motivo obrigatório; UI explicita aumento ou redução e não permite saldo negativo. |

Cada criação de insumo, inativação e movimento produzirá registro no `audit_logs` existente, com ator, alvo, tipo de ação e metadados mínimos. Assim, o módulo preserva o padrão já adotado no núcleo unificado de pedidos.

## 4. Permissões e segurança

O servidor será a fonte de autorização. A interface apenas reduzirá os controles visíveis; todas as validações decisivas ocorrerão no endpoint operacional protegido. O administrador poderá cadastrar, editar dados cadastrais, inativar insumos e registrar qualquer tipo de movimento. A equipe poderá consultar itens e histórico, além de registrar somente entradas e consumos internos.

| Ação | `staff` | `admin` |
|---|---:|---:|
| Consultar saldo e histórico | Permitido | Permitido |
| Cadastrar, editar ou inativar insumo | Não permitido | Permitido |
| Registrar entrada | Permitido | Permitido |
| Registrar consumo interno | Permitido | Permitido |
| Registrar perda | Não permitido | Permitido |
| Registrar ajuste | Não permitido | Permitido |
| Alterar ou excluir movimento já registrado | Não permitido | Não permitido |

O contrato retornará somente informações necessárias à equipe e não exporá dados pessoais de pedidos, clientes, pagamentos ou integrações.

## 5. Experiência em `/operacao/estoque`

A nova rota será acessível a partir do hub operacional e terá retorno claro à operação. A área principal começa com uma tabela de insumos ativos, com busca por nome e estados visíveis para saldo normal, atenção e crítico. Um item fica crítico quando seu saldo calculado for menor ou igual ao estoque mínimo; itens sem mínimo configurado não recebem alerta.

| Região | Conteúdo | Comportamento |
|---|---|---|
| Resumo operacional | Total de insumos ativos, itens críticos e itens em atenção | Dados derivados da consulta atual; sem métricas financeiras. |
| Lista de saldo | Nome, unidade, saldo calculado, mínimo e estado | Busca por nome; leitura rápida em desktop e cartões em telas estreitas. |
| Painel de movimento | Insumo, tipo permitido, quantidade, motivo quando exigido e observação opcional | O tipo e os controles respeitam o papel do usuário; confirmação só ocorre com dados válidos. |
| Histórico do insumo | Tipo, variação, saldo resultante, motivo, ator e horário | Ordenação decrescente; paginação e estado vazio. |
| Administração de insumos | Cadastro, edição cadastral e inativação | Disponível apenas a `admin`; nenhuma exclusão física. |

Em telas pequenas, a lista e o histórico serão exibidos em cartões, e o painel de lançamento abrirá em uma região de foco controlada. A paleta atual de creme, vermelho e verde será preservada. Vermelho indicará saldo crítico, amarelo chamará atenção e verde confirmará disponibilidade adequada, sempre acompanhado de texto para não depender apenas de cor.

## 6. Arquitetura, contrato e limite de funções

O projeto já atingiu o limite de 12 handlers HTTP no plano Vercel Hobby. Portanto, este incremento não poderá acrescentar um décimo terceiro arquivo de função. A implementação consolidará o domínio operacional em uma rota dinâmica existente ou equivalente, sem criar novo handler líquido, preservando os contratos de pedidos já testados.

O contrato interno terá operações de leitura para listar insumos, consultar o histórico e obter saldo calculado, além de comandos separados para criar ou manter insumos e registrar movimentos. Todas as escritas serão transacionais: validam sessão, papel, unidade, quantidade, saldo resultante e requisitos de motivo antes de inserir movimento e auditoria na mesma unidade de trabalho.

Uma migração SQL aditiva será preparada para as tabelas, restrições, índices e funções de saldo necessárias. **Ela não será aplicada ao Supabase sem autorização explícita e específica para essa escrita de banco.** Durante esta fase de desenho e plano, nenhum pedido de teste, dado operacional ou alteração no Supabase será criado.

## 7. Falhas, integridade e acessibilidade

Se a consulta falhar, a tela exibirá erro recuperável e não apresentará saldo antigo como se fosse atual. Se a criação de movimento for recusada por saldo insuficiente, permissão, conflito de unidade ou validação de motivo, o formulário preservará os campos e mostrará uma mensagem objetiva. Duplicações por reenvio serão prevenidas por chave de idempotência de escrita associada ao lançamento; uma segunda tentativa com a mesma chave retornará o mesmo resultado, sem duplicar saldo ou auditoria.

Campos obrigatórios terão rótulos explícitos, descrições de unidade e foco visível. Mensagens de erro serão anunciadas de modo acessível. Os controles administrativos não serão renderizados para `staff`, mas o servidor continuará bloqueando essas operações se uma requisição for forjada.

## 8. Critérios de aceite e validação

O incremento será aceito quando os testes comprovarem que o saldo nasce exclusivamente de movimentos, que o estoque não pode ficar negativo, que os tipos têm o sinal correto e que perdas/ajustes exigem administrador e motivo. A cobertura também verificará auditoria, idempotência, bloqueio server-side, estados de carregamento/vazio/falha, busca, responsividade e ausência de integração automática com pedidos.

Além dos testes focados, serão executados `pnpm test`, `pnpm check`, `pnpm build`, `pnpm build:vercel-runtime` e `git diff --check`. As rotas modificadas serão revisadas em desktop e celular. Antes de um checkpoint, o backlog será atualizado; não haverá push ao GitHub, publicação Vercel, ativação de Asaas, SMTP, iFood, agente local ou hardware sem nova autorização.

## 9. Dependências futuras

As próximas fases poderão acrescentar ficha técnica, reserva ou consumo por produção, lotes, validade, QR Code, inventário contado, fornecedores, sugestão de compra e aprovação de pedidos de compra. Cada uma exigirá desenho e autorização próprios. Nenhuma delas é pressuposto para concluir este núcleo inicial.

## 10. Registro de implementação local — 27/08/2026

O projeto passou a reservar a rota interna `/operacao/estoque`, protegida pela mesma barreira visual da operação. Enquanto a persistência não for autorizada, a tela deixa claro que o saldo e os lançamentos aguardam ativação da base de dados; ela não consulta, cria ou altera registros de estoque. Seus estados de permissão, lista, busca, alertas, vazio e falha são cobertos por regressões com dados injetáveis.

Os contratos puros definem as unidades permitidas, os tipos de movimento, os sinais de entrada e saída, o motivo obrigatório para perdas e ajustes e a classificação de saldo. O endpoint interno de estoque também está preparado em modo protegido de indisponibilidade: valida sessão de equipe, retorna uma resposta explícita de ativação pendente e não acessa tabelas de inventário.

Para preservar a cota Vercel Hobby, as rotas internas de pedidos, alertas, impressão e estoque foram agrupadas em `api/operations/[resource].ts`, preservando as URLs existentes e reduzindo o conjunto de handlers HTTP para dez. A migração `20260827120000_inventory_core.sql` e seu roteiro de verificação foram criados apenas como arquivos locais; **não foram aplicados ao Supabase e nenhum insumo, saldo ou movimento foi inserido**.
