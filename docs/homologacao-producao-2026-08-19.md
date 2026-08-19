# Evidências de homologação em produção — 19 de agosto de 2026

## Escopo e método

Esta evidência registra verificações **não destrutivas** realizadas em `https://marmitastb.vercel.app`. Nenhuma solicitação de pedido foi confirmada e nenhuma alteração de cardápio, equipe, configuração ou dado financeiro foi enviada nesta etapa.

## Resultados públicos

| URL | Resultado observado | Evidência funcional |
|---|---:|---|
| `https://marmitastb.vercel.app/` | HTTP 200 | Vitrine carregou com busca, sacola, oito categorias e 18 opções de cardápio visíveis. |
| `https://marmitastb.vercel.app/acompanhar` | HTTP 200 | Rota pública de acompanhamento respondeu com o shell da aplicação. |
| `https://marmitastb.vercel.app/acesso` | HTTP 200 | Tela de solicitação de link de acesso por e-mail carregou. |
| `https://marmitastb.vercel.app/manifest.webmanifest` | HTTP 200 | Manifesto PWA respondeu como `application/manifest+json`. |
| `https://marmitastb.vercel.app/api/public/menu` | HTTP 200 | API pública retornou categorias e produtos em JSON. |

Na inspeção visual da vitrine, os filtros de categoria, a busca e os controles de adição à sacola estavam visíveis. A confirmação de opções personalizáveis e o envio final de pedido ficaram fora desta verificação técnica para não gerar um pedido de teste não coordenado.

As rotas públicas `/acompanhar` e `/acesso` também foram abertas visualmente em produção. A primeira apresentou os campos de telefone e código do pedido; a segunda apresentou o formulário exclusivo de e-mail previamente autorizado. Não foi solicitado nenhum link de acesso nem inserido telefone de cliente durante esta homologação, de modo a não criar efeitos operacionais não coordenados.

## Proteção de rotas internas

As chamadas sem sessão válida às rotas abaixo responderam com **HTTP 401** e corpo JSON. Isso confirma que as funções Vercel estão atendendo a rota de API e bloqueando acesso anônimo, em vez de devolver a tela 404 da aplicação de página única.

| Rota protegida | Resultado sem sessão |
|---|---:|
| `/api/admin/catalog` | HTTP 401 JSON |
| `/api/admin/settings` | HTTP 401 JSON |
| `/api/admin/staff` | HTTP 401 JSON |
| `/api/admin/finance` | HTTP 401 JSON |
| `/api/operations/orders` | HTTP 401 JSON |
| `/api/operations/printJobs` | HTTP 401 JSON |
| `/api/operations/alerts` | HTTP 401 JSON |

## Observação de disponibilidade

Após a publicação, o domínio apresentou temporariamente uma tela 404 da plataforma durante a propagação. Na verificação posterior, a raiz do domínio respondeu HTTP 200 e `/admin` redirecionou uma sessão ausente para `/acesso`, como esperado.

## Limitações desta evidência

Esta rodada não autentica uma conta real de equipe ou administração e não confirma pedidos, pagamentos ou alterações administrativas. Esses cenários exigem o roteiro de aceite com um e-mail autorizado e pedidos explicitamente classificados como teste.

## Roteiro de aceite orientado ao cliente

O aceite deve ser realizado em uma janela de teste combinada com a responsável pela loja. Antes de iniciar, a equipe deve definir um telefone exclusivo de teste, um e-mail previamente autorizado para equipe e uma marmita que possa ser descartada ou preparada como amostra. Assim, cada pedido criado pode ser reconhecido e removido da rotina real pela operação.

| Perfil e objetivo | Passo verificável | Resultado esperado | Registro de aceite |
|---|---|---|---|
| Cliente — vitrine | Abrir a raiz em uma nova aba, usar a busca, aplicar uma categoria e abrir a ficha de um produto. | Catálogo, preço em BRL, foto, disponibilidade e opções configuráveis permanecem legíveis e navegáveis. | Marcar como aprovado ou anexar captura. |
| Cliente — sacola | Adicionar uma marmita de teste, alterar quantidade quando permitido e conferir o subtotal. | A sacola conserva o item, calcula o valor exibido e permite seguir para checkout sem travamento. | Registrar valor e horário. |
| Cliente — pedido | Completar o checkout com o telefone de teste, modalidade de recebimento e forma de pagamento em teste. | A revisão apresenta dados coerentes e a confirmação cria somente o pedido combinado para homologação. | Anotar o código do pedido. |
| Cliente — acompanhamento | Abrir `/acompanhar`, informar o telefone de teste e, opcionalmente, o código criado. | O pedido ativo é localizado e mostra seu estado sem expor pedidos de outros clientes. | Anexar captura do estado inicial. |
| Equipe — acesso | Em `/acesso`, solicitar o link pelo e-mail previamente autorizado e abrir o e-mail no mesmo dispositivo. | O acesso termina em uma tela operacional válida; e-mails não autorizados não recebem privilégios. | Registrar e-mail usado e horário, sem copiar o link no relatório. |
| Equipe — operação | Localizar o pedido de teste, avançar somente pelos estados combinados e verificar a atualização do acompanhamento. | A fila e o rastreio refletem a transição escolhida; alertas e impressão são conferidos apenas no computador de operação. | Anotar cada estado e horário. |
| Equipe — despesa | Abrir o atalho de despesa, lançar um valor de teste e enviar como rascunho. | O lançamento não altera o caixa antes de revisão administrativa. | Registrar a descrição usada e confirmar que ficou pendente. |
| Administração — sessão | Abrir `/admin` com a conta autorizada, conferir identificação e papel, navegar pelos módulos e usar **Sair**. | Módulos de visão geral, pedidos, cardápio, equipe, financeiro, revisões, relatórios e configurações ficam acessíveis conforme o papel; sair encerra a sessão. | Anexar uma captura do cabeçalho e do botão de saída. |
| Administração — financeiro | Conferir o resumo do período, aprovar ou rejeitar a despesa de teste e abrir a auditoria. | Somente uma despesa aprovada afeta o caixa; a decisão, responsável e horário aparecem na auditoria. | Anotar a decisão e o valor antes/depois. |
| Administração — relatório | Aplicar um período, exportar CSV e usar a opção de impressão para salvar como PDF. | Os dois arquivos refletem os indicadores reais do resumo daquele período, sem números de demonstração. | Arquivar os arquivos no material de aceite. |

## Critério de decisão

O sistema pode ser considerado **apto para apresentação operacional** quando todos os passos aplicáveis da tabela forem aprovados, o pedido de teste tiver sido encerrado ou identificado pela operação, e não houver erro de interface, travamento, cálculo inconsistente ou acesso indevido. Uma falha bloqueia o aceite apenas no módulo afetado; ela deve ser registrada com horário, perfil, URL, ação executada, mensagem e captura para correção rastreável.

| Situação | Decisão recomendada |
|---|---|
| Todas as verificações aprovadas e arquivos de relatório coerentes | Aprovar a apresentação e liberar a rotina controlada. |
| Falha somente em recurso não usado na apresentação | Apresentar os módulos aprovados, registrando formalmente a limitação. |
| Falha no checkout, fila, autenticação, autorização ou cálculo financeiro | Não aprovar a rotina operacional até correção e nova validação. |

## Limites conhecidos para a apresentação

O Asaas continua em ambiente Sandbox e sem chaves de produção; portanto, não há cobrança real habilitada nesta fase. O envio de links de equipe depende da configuração de e-mail transacional do Supabase. A impressão automática deve ser comprovada no computador dedicado à cozinha, porque a disponibilidade da impressora é específica daquele dispositivo. Esses pontos não invalidam a vitrine ou a gestão, mas precisam ser comunicados ao cliente como condições de homologação antes de qualquer operação comercial efetiva.

## Situação consolidada de prontidão

> **Conclusão técnica:** a aplicação publicada está apta para uma apresentação guiada e para o roteiro de aceite. A confirmação de prontidão operacional completa permanece condicionada aos testes autenticados de equipe e administração, ao pedido de teste combinado e à verificação local da impressora.

Como verificação de regressão posterior à consolidação deste relatório, a suíte automatizada foi executada novamente no código correspondente: **218 testes aprovados**, **2 testes pulados** e **74 arquivos de teste** processados. Esse resultado reforça a integridade técnica das regras cobertas, mas não substitui os testes de navegador autenticado e de dispositivo físico previstos no roteiro.

| Área | Evidência atual | Estado para apresentação | Condição para aceite operacional |
|---|---|---|---|
| Vitrine, cardápio, PWA e acompanhamento | Rotas públicas e interface verificadas sem criar pedido. | Apta para demonstração. | Executar um pedido de teste e acompanhar seu código. |
| Proteção de API e rotas internas | Sete endpoints protegidos responderam HTTP 401 JSON quando acessados sem sessão. | Apta para demonstrar controle de acesso. | Validar com o e-mail autorizado e cada papel aplicável. |
| Administração, financeiro e auditoria | Código, migração, testes locais, build e endpoints protegidos validados; acesso real já foi confirmado pela responsável. | Apta para apresentação da interface. | Validar um rascunho de despesa, aprovação/rejeição, auditoria e relatório com dados de teste. |
| Fila operacional e impressão | Interface e endpoints publicados; não foi criado pedido real nesta rodada. | Apta para demonstração visual. | Criar pedido de teste e confirmar mudanças de estado, alerta e impressão no computador dedicado. |
| Pagamento real | Asaas permanece em Sandbox sem chaves de produção. | Não demonstrar cobrança real. | Configurar credenciais e realizar homologação específica de pagamento antes de cobrar clientes. |
