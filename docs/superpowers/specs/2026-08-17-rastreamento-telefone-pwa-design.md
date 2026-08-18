# Rastreamento por telefone e PWA — especificação de design

## Objetivo

Permitir que clientes acompanhem o pedido ativo mais recente usando somente o telefone informado no checkout e tornar a Marmitas TB instalável como aplicativo web progressivo. A evolução deve preservar a privacidade do cliente, manter a consulta existente por código e telefone e nunca permitir pedidos ou pagamentos offline.

## Acompanhamento público por telefone

A página pública `/acompanhar` adotará o telefone como consulta principal. O cliente informará o mesmo número utilizado no checkout e a interface normalizará o valor para dígitos antes de chamar o servidor. A busca por código e telefone permanecerá como alternativa para localizar um pedido específico.

O procedimento público de consulta por telefone retornará **somente o pedido ativo mais recente** associado ao número. São considerados ativos os pedidos em pagamento pendente, confirmados, em preparo, em entrega ou prontos para retirada. Pedidos concluídos e cancelados não podem aparecer nessa busca.

| Informações retornadas | Informações protegidas |
| --- | --- |
| Código, status, modalidade, total, estado/método de pagamento e linha do tempo | Endereço, observações, itens, nome completo, histórico de pedidos e pedidos encerrados |

Quando não houver pedido ativo, a interface apresentará uma mensagem neutra, sem confirmar a existência de pedidos anteriores. Falhas de rede receberão uma orientação para tentar novamente, sem revelar detalhes internos.

## Experiência PWA

O projeto utilizará um manifesto e um service worker gerado na construção para oferecer instalação em navegadores compatíveis. Os metadados usarão o nome Marmitas TB, a identidade em creme, vinho e verde, e ícones derivados da marca existente em tamanhos adequados para tela inicial e ícones mascaráveis.

O aplicativo adotará uma estratégia de cache restrita ao conteúdo público e estático: estrutura do aplicativo, fontes, imagens, ícones e o cardápio mais recentemente carregado. O cache não armazenará respostas de rastreamento, criação/confirmação de pedido, pagamento, administração, operação ou impressão.

| Situação | Comportamento esperado |
| --- | --- |
| Cliente conectado | O cardápio e os dados públicos atualizam pela rede; ações transacionais operam normalmente. |
| Cliente sem conexão, com conteúdo armazenado | O aplicativo abre e mostra o último cardápio disponível, com aviso de modo offline. |
| Cliente sem conexão, sem conteúdo armazenado | Uma tela informativa explica que a primeira visita exige conexão. |
| Acompanhamento, checkout ou pagamento sem conexão | A ação não é enviada, e a interface orienta o cliente a restabelecer a conexão. |

A navegação exibirá uma ação discreta de **Instalar aplicativo** quando o navegador disponibilizar o evento de instalação. Em iPhone e iPad, a orientação explicará como adicionar o site à tela inicial. Nenhuma notificação, geolocalização ou permissão adicional será solicitada nesta fase.

## Componentes e responsabilidades

| Unidade | Responsabilidade |
| --- | --- |
| Procedimento `orders.trackByPhone` | Validar telefone, localizar o pedido ativo mais recente e serializar somente dados seguros de acompanhamento. |
| Consulta de dados | Normalizar o telefone e filtrar estados ativos em ordem decrescente de criação. |
| Página `TrackOrder` | Oferecer busca por telefone como fluxo principal, manter consulta específica por código e exibir estados de carregamento, vazio, erro e sucesso. |
| Configuração PWA | Gerar manifesto e service worker, definir estratégias de cache e declarar ícones. |
| Componente de instalação | Apresentar ação de instalação quando suportada e instruções claras para iOS. |
| Aviso offline | Informar indisponibilidade de ações em rede sem interferir no conteúdo previamente salvo. |

## Segurança e limites

O telefone será usado exclusivamente como chave de localização do pedido ativo mais recente e não dará acesso ao histórico do cliente. A resposta pública não incluirá endereço, observações, itens ou dados pessoais adicionais. A confirmação de pagamento, criação de pedidos e toda operação administrativa continuarão dependentes de conexão com o servidor.

## Critérios de aceitação

- Uma consulta por telefone normalizado encontra somente o pedido ativo mais recente e não inclui campos protegidos.
- A consulta por telefone não retorna pedidos concluídos ou cancelados.
- A busca existente por código e telefone permanece funcional.
- O manifest declara identidade e ícones da Marmitas TB, e o service worker é registrado somente na construção apropriada.
- Conteúdo estático e cardápio previamente acessado ficam disponíveis offline; endpoints transacionais e de rastreamento não são armazenados.
- A interface mostra estados acessíveis de carregamento, vazio, erro de rede, modo offline e instalação.
- Testes de servidor, interface e configuração cobrem os novos contratos e a suíte completa permanece aprovada.
