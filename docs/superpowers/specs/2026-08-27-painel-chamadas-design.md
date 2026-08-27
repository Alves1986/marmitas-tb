# Painel público de chamadas de retirada — Marmitas TB

**Data:** 27 de agosto de 2026  
**Status:** Implementado localmente e aguardando checkpoint de validação  
**Escopo:** tela pública, somente leitura, destinada a monitor do salão.

## 1. Objetivo

Criar uma tela pública para avisar que pedidos de balcão estão prontos para retirada. O painel deve ser compreensível a distância, manter a identidade visual Marmitas TB e preservar a privacidade de clientes e da operação.

> O painel não é uma fila de pedidos. Ele é apenas um aviso visual de senhas prontas para retirada.

## 2. Dados permitidos e recorte inicial

A primeira versão mostrará exclusivamente pedidos `COUNTER` com status `pronto_para_retirada` e senha persistida. A senha de retirada, no formato `MTB-001`, será o único dado de pedido retornado e exibido.

| Permitido | Proibido |
|---|---|
| Senha persistida `MTB-xxx` | Nome, telefone, endereço e qualquer observação |
| Ordem cronológica de pronto | Itens, quantidades, preço, pagamento e canal adicional |
| Estado de tela: aguardando ou sem senhas | Código interno/UUID de pedido e dados de operador |

Pedidos do aplicativo próprio e do totem não participarão desta primeira versão, pois ainda não possuem uma senha pública persistida equivalente. O painel não deverá criar, inventar ou derivar um identificador público a partir de código interno, nome ou data.

## 3. Contrato público minimizado

Será criada uma única função Vercel de leitura pública, sem autenticação e sem parâmetros de entrada. Ela consultará a base de dados somente no servidor e devolverá, no máximo, seis objetos na forma abaixo:

```ts
type PublicReadyTicket = {
  ticket: string;
  readyAt: string;
};
```

A consulta selecionará somente pedidos com `source_channel = 'COUNTER'`, `status = 'pronto_para_retirada'` e número de senha presente. A ordenação será do mais recentemente marcado como pronto ao mais antigo, limitada a seis resultados. A coluna usada para essa ordenação será `updated_at`, que já é atualizada na transição operacional; ela não introduz um campo, migração ou escrita novos.

O endpoint não aceitará código, telefone, UUID, paginação, filtro, método diferente de GET ou qualquer entrada do visitante. Respostas de erro terão mensagem genérica e não incluirão detalhes da consulta, da base ou de pedido.

## 4. Capacidade Vercel e limites técnicos

O projeto possui dez funções HTTP após a consolidação dos recursos operacionais no dispatcher dinâmico. A função pública de chamadas será a décima primeira e manterá a implantação abaixo do limite Hobby de doze funções. Nenhum endpoint operacional existente será exposto ao público nem haverá rota adicional além da função de leitura e da rota de interface.

Não haverá mudança de schema, função SQL, RLS, dados de demonstração, criação de pedido, atualização de status, evento operacional, impressão, agente local, hardware, pagamento, Asaas, SMTP, domínio, iFood ou integração externa.

## 5. Experiência do monitor

A rota pública proposta é `/chamadas`. O layout principal é horizontal 16:9: cabeçalho discreto com logo e a mensagem **Acompanhe sua senha**; uma chamada principal em alto contraste para a senha mais recente; e até cinco cartões secundários para as chamadas anteriores. O estado sem resultados informará **Nenhuma senha chamada agora** sem revelar que não há pedidos na operação.

| Área | Conteúdo | Tratamento visual |
|---|---|---|
| Cabeçalho | Logo Marmitas TB e orientação curta | Contraste alto, sem navegação operacional |
| Chamada principal | Senha mais recente | Fundo verde, tipografia muito grande e destaque tranquilo |
| Chamadas recentes | Até cinco senhas anteriores | Cartões creme claros, mesma legibilidade sem competir com a principal |
| Rodapé | Indicador de atualização automática | Texto discreto; sem timestamp ou informações internas |

O painel fará nova leitura a cada dez segundos. Se a senha principal mudar, a atualização terá apenas transição visual curta de opacidade, condicionada a `prefers-reduced-motion`; não haverá som, alerta de navegador, popup ou animação contínua. Em celular, a mesma hierarquia se reorganizará em uma coluna para manutenção, sem comprometer o uso principal no monitor.

## 6. Segurança e comportamento de falha

A página pública nunca chamará `/api/operations/*` e não poderá fazer alterações. A função server-side será a única parte que pode usar a credencial administrativa para a projeção mínima; o navegador receberá somente as senhas aprovadas. Se a leitura falhar, a tela deverá manter uma mensagem neutra de indisponibilidade e tentar novamente no próximo intervalo, sem apresentar dados armazenados em cache por tempo indefinido.

## 7. Testes e validação

O desenvolvimento seguirá TDD. Os testes server-side deverão provar filtro por COUNTER/pronto, projeção sem PII, ordem decrescente, limite de seis, GET exclusivo e resposta genérica de erro. Os testes da interface devem comprovar chamada principal, no máximo cinco secundárias, ausência de PII e UUID, estado vazio, falha recuperável, atualização em intervalo e preferência de movimento reduzido quando aplicável.

A validação final deverá executar testes completos, checagem TypeScript, build PWA, build do runtime Vercel e `git diff --check`. Capturas de `/chamadas` em 16:9 e em tela móvel confirmarão contraste, hierarquia, ausência de vazamento e responsividade. Não serão criados pedidos ou chamados de teste no Supabase.

## 8. Exclusões deliberadas

Esta fase não inclui tela pública de acompanhamento individual, confirmação de retirada, expiração automática da chamada, lista histórica, áudio, notificações, QR Code, identificadores de aplicativo/totem, autenticação de cliente, operações de cozinha, estoque, impressão, pagamentos, credenciais ou publicação.

## 9. Registro de implementação local — 27/08/2026

A rota pública `/chamadas` foi preparada para monitor de salão com logo Marmitas TB, a orientação **Acompanhe sua senha**, uma chamada principal e até cinco chamadas recentes. A página consulta a fonte pública no carregamento e a cada dez segundos, usa contraste alto para o monitor horizontal e se reorganiza em coluna para manutenção em celular. O estado vazio não revela dados operacionais; em falha, exibe uma mensagem pública genérica e não conserva dados antigos indefinidamente.

A única função nova é `api/public/ready-tickets.ts`, que eleva o projeto a onze handlers Vercel. Ela aceita apenas GET e utiliza uma projeção server-side limitada a seis pedidos `COUNTER` com status `pronto_para_retirada`, selecionando somente `counter_ticket_number` e `updated_at`. O navegador recebe exclusivamente os pares `ticket` e `readyAt`; o horário é usado internamente para ordenação e não é exibido no painel.

Não foram criados pedidos de teste, migrações, tabelas, políticas, operações de cozinha, confirmação de retirada, eventos, áudio, impressão, hardware, Asaas, SMTP, domínio, iFood, push ou publicação. Pedidos do aplicativo próprio e do totem permanecem fora da tela enquanto não existir uma senha pública persistida e aprovada para eles.
