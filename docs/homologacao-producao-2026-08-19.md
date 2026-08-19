# Evidências de homologação em produção — 19 de agosto de 2026

## Escopo e método

Esta evidência registra as verificações iniciais **não destrutivas** realizadas em `https://marmitastb.vercel.app` e, em seção posterior, o único pedido controlado de homologação autorizado. Nenhuma alteração de cardápio, equipe, configuração ou dado financeiro foi enviada; o pedido de teste não acionou cobrança real, impressão ou entrega.

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

## Protocolo autorizado de teste operacional

Em 19 de agosto de 2026, a responsável autorizou um único fluxo em produção com **dados de homologação**, sob as seguintes condições: não acionar impressão e não realizar cobrança real. O pedido será identificado como teste nas observações, usará uma forma de pagamento de demonstração já suportada pelo sistema e servirá exclusivamente para conferir criação, consulta pública e atualização controlada de status. Nenhuma despesa financeira, alteração de cardápio ou ajuste de configuração faz parte deste protocolo.

Durante o início controlado do fluxo, o primeiro acionamento automatizado do controle de adição da opção “Panqueca de carne + Coca 200 ml” não alterou o indicador da sacola, que permaneceu em zero. Nenhum pedido, dado financeiro ou impressão foi criado por essa tentativa. O teste será retomado pela rota de montagem do pedido, mantendo a regra de um único pedido confirmado.

A retomada pelo controle visual do card abriu corretamente o configurador da “Panqueca de carne + Coca 200 ml”, com preço exibido de R$ 23,00, alternativas de embalagem, acompanhamento, observação de cozinha e quantidade. A embalagem padrão “Isopor” foi selecionada; o item ainda não havia sido inserido na sacola nesta etapa.

Na configuração do teste, foi escolhido o acompanhamento “Batata frita” e incluída a observação: “HOMOLOGAÇÃO — pedido de teste autorizado; não preparar e não imprimir.” A quantidade permaneceu em uma unidade. O próximo passo é somente adicionar essa configuração à sacola; não houve confirmação de pedido até este ponto.

O item foi incluído com sucesso na sacola, que passou a indicar uma unidade. A conferência mostrou produto, opções e observação corretos. Inicialmente a modalidade de entrega aplicava taxa estimada de R$ 5,00; ela foi substituída por **retirada no local**, reduzindo o total de homologação para R$ 23,00 e evitando a coleta de endereço. O pedido ainda não foi confirmado.

O checkout aceitou os dados sintéticos “HOMOLOGAÇÃO — NÃO PREPARAR” e telefone `00000000000`, sem associar dados de uma pessoa real. A etapa de recebimento confirmou a modalidade de retirada na Marmitas TB, Telêmaco Borba/PR. Não houve cobrança, impressão ou confirmação de pedido nessas transições.

Na etapa de pagamento, o sistema exibiu explicitamente: “**Ambiente de teste. Este pedido é uma simulação: nenhuma cobrança real será realizada.**” A modalidade PIX foi selecionada somente para validar o fluxo de simulação. A revisão final confirmou uma unidade de Panqueca de carne + Coca 200 ml, embalagem Isopor, batata frita, retirada no local, subtotal e total de R$ 23,00, e a identificação de homologação. O pedido está pronto para a única confirmação previamente autorizada, sem impressão.

Ao acionar a única confirmação autorizada, a interface não criou pedido e exibiu o erro de interpretação `Unexpected token 'T', "The page c"... is not valid JSON`. Não houve redirecionamento, número de pedido, cobrança ou impressão; o botão não foi acionado novamente. A inspeção passiva do navegador identificou a requisição `POST /api/trpc/orders.create?batch=1`, cuja resposta não é JSON em produção. Isso caracteriza uma falha de integração do cliente publicado: o fluxo de criação ainda tenta usar a rota tRPC, enquanto a produção Vercel expõe funções HTTP próprias. O teste foi interrompido para não duplicar qualquer registro.

A inspeção do bundle JavaScript servido por `marmitastb.vercel.app` confirmou que ele contém a referência `orders.create`, mas **não contém** a string `/api/public/orders`. Logo, a ramificação do adaptador Vercel foi eliminada durante a compilação de produção e o cliente publicado sempre segue para tRPC. A correção deverá tornar a escolha de transporte resiliente à ausência da variável de build e garantir um teste de regressão do artefato compilado antes de uma nova publicação autorizada.

### Correção local pendente de publicação

O checkout agora centraliza a seleção do transporte em `isVercelRuntime()`. Além da variável `VITE_API_RUNTIME=vercel`, o seletor reconhece o domínio publicado `*.vercel.app` exclusivamente em build de produção. Assim, caso a variável pública não seja incorporada pela Vercel, o cliente ainda escolhe `POST /api/public/orders`; em desenvolvimento local, mantém o fluxo legado sem atingir a API publicada.

O teste de regressão foi escrito antes da alteração e falhou ao simular `marmitastb.vercel.app` sem variável de build. Após a correção, ele passou. A suíte integral registrou **219 testes aprovados e 2 pulados**, em 74 arquivos, e a checagem TypeScript foi concluída sem erros. Por fim, um build com `VITE_API_RUNTIME` vazio gerou o bundle contendo `/api/public/orders`, evidenciando que a ramificação HTTP deixa de ser removida pela otimização de compilação. Essa alteração ainda precisa de publicação autorizada e de novo teste do pedido em produção.

### Correção local de identificadores pendente de publicação

O pedido controlado alcançou a função HTTP atualizada, mas foi rejeitado por “Dados do pedido inválidos”. A inspeção passiva da sacola confirmou a causa: a vitrine ainda mantém identificadores legados, como `panqueca-coca`, `foam` e `fries`, enquanto a função pública exige UUIDs Supabase para produto e opções. Nenhum pedido, cobrança ou impressão foi criado; o envio não foi repetido.

O adaptador HTTP agora consulta o cardápio público somente quando identifica IDs legados no carrinho. Antes de enviar, resolve cada produto e opção para o UUID devolvido pelo Supabase, usando o nome do produto e os rótulos exibidos como referência. Carrinhos que já contêm UUIDs não fazem consulta adicional. Se o cardápio tiver mudado entre a seleção e a confirmação, a interface interrompe o envio e instrui a atualização, sem reduzir a validação UUID do endpoint.

A regressão foi escrita antes da implementação e falhou com os slugs do pedido de teste; após a correção, confirmou a transformação dos IDs de produto e opções. A suíte integral registrou **220 testes aprovados e 2 pulados**, em 74 arquivos, a checagem TypeScript foi concluída sem erros e os builds PWA/Vercel foram gerados com êxito. A alteração ainda precisa de publicação autorizada e, somente então, o pedido único de homologação poderá ser retomado.

A publicação foi autorizada e o commit `4bb2014` foi enviado à branch `main` do repositório dedicado. Na primeira verificação do bundle de produção, a rota `/api/public/orders` já estava presente, mas a referência `/api/public/menu` ainda não aparecia no arquivo JavaScript servido. A vitrine continuou funcionando e a sacola de homologação permaneceu preservada, porém a confirmação foi deliberadamente mantida suspensa: é necessário aguardar a propagação completa do novo artefato ou confirmar o deployment antes de reenviar o único pedido de teste.

Após a propagação, o bundle `index-CcN2lBa0.js` passou a conter `/api/public/orders`, `/api/public/menu` e a mensagem exclusiva da resolução segura de itens removidos, confirmando a publicação da correção de IDs. A revisão final do pedido de teste mostrou uma unidade de “Panqueca de carne + Coca 200 ml”, total de R$ 23,00, retirada no local, PIX de demonstração e a observação “HOMOLOGAÇÃO — pedido de teste autorizado; não preparar e não imprimir.” O checkout exibiu explicitamente que nenhuma cobrança real será realizada. A confirmação única foi então mantida disponível sob a autorização já registrada.

### Resultado do pedido controlado

O único pedido foi registrado com sucesso em produção sob o código **TB-20260819-C82294251937**. A tela de confirmação exibiu retirada estimada de 35 a 45 minutos, total de R$ 23,00, modalidade PIX de demonstração e o aviso explícito de que nenhuma cobrança real será realizada. A sacola foi esvaziada após a confirmação, não houve envio adicional, impressão nem acionamento de WhatsApp. O próximo passo é apenas validar o acompanhamento público usando o código gerado e, se possível sem alterar status indevidamente, observar a visibilidade na fila operacional autenticada.

### Correção local de acompanhamento pendente de publicação

A consulta do pedido confirmado `TB-20260819-C82294251937` foi preparada com o código e telefone sintéticos usados no checkout. O formulário aceitou os valores e habilitou a consulta, mas a produção não mostrou o resultado. A análise identificou que `TrackOrder.tsx` ainda verificava `VITE_API_RUNTIME` diretamente; no bundle publicado essa variável não é incorporada, fazendo a tela permanecer no caminho tRPC legado em vez de usar a função HTTP Vercel.

A página de acompanhamento agora reutiliza `isVercelRuntime()`, o mesmo seletor resiliente adotado no checkout. No domínio de produção da Vercel, ela chama `GET /api/public/orders`; em desenvolvimento, preserva o caminho legado. A regressão foi escrita antes da alteração e falhou enquanto a página dependia diretamente da variável de build. Após a correção, essa cobertura, o seletor e o adaptador de acompanhamento passaram. A suíte completa registrou **221 testes aprovados e 2 pulados**, em 75 arquivos, e o build PWA com runtime Vercel foi concluído sem erros.

A consulta do pedido já existente foi concluída após a publicação autorizada. Ela não criou novo pedido, não acionou cobrança, impressão ou mudança de status.

### Consulta pública concluída em produção

Após a propagação adicional do bundle da Vercel, a consulta específica de `TB-20260819-C82294251937` retornou corretamente na interface. A função `GET /api/public/orders` respondeu HTTP 200 com JSON válido para o código e telefone sintéticos, e a tela exibiu o estado **Aguardando pagamento**, pagamento pendente, retirada na Marmitas TB, total de **R$ 23,00**, modalidade PIX em ambiente de teste e o evento inicial “Pedido recebido.”.

O aviso temporário de rede visto na primeira tentativa não representava falha da função pública: a leitura direta já retornava HTTP 200 e, após a propagação completa, a própria interface passou a renderizar o resultado. Portanto, não foi necessária alteração adicional de código, nem uma nova publicação. A única continuação operacional possível é a transição de status pela equipe autenticada, que permanece fora do escopo autorizado deste teste; a impressão segue deliberadamente não verificada.

## Situação consolidada de prontidão

> **Conclusão técnica:** a aplicação publicada está apta para uma apresentação guiada e para o roteiro de aceite. A confirmação de prontidão operacional completa permanece condicionada aos testes autenticados de equipe e administração, ao pedido de teste combinado e à verificação local da impressora.

Como verificação de regressão posterior à consolidação deste relatório, a suíte automatizada foi executada novamente no código correspondente: **218 testes aprovados**, **2 testes pulados** e **74 arquivos de teste** processados. Esse resultado reforça a integridade técnica das regras cobertas, mas não substitui os testes de navegador autenticado e de dispositivo físico previstos no roteiro.

## Evidência visual pública complementar

Na inspeção visual direta da página inicial em produção, a marca, o bloco principal, a sacola, os atalhos de navegação e os primeiros cards do catálogo foram renderizados de forma legível. A árvore acessível do navegador identificou as oito categorias, os 18 controles de adição e os textos alternativos das imagens de produto. Na primeira viewport do catálogo, seis imagens de produto já visíveis retornaram `complete: true`, URL pública do Supabase Storage e largura natural diferente de zero. Os outros cards permaneceram em carregamento sob demanda por ainda estarem fora da área visível; eles devem ser confirmados após rolagem, sem interpretar esse estado inicial como imagem quebrada.

Após percorrer a grade até o fim, a inspeção do DOM confirmou **18 de 18** imagens de cards carregadas, sem itens pendentes. Todas apresentaram `complete: true`, `naturalWidth` maior que zero e URL pública do bucket `marmitas-tb-assets` do Supabase. A captura final também mostrou os cards de sobremesa e bebidas renderizados com suas imagens e controles de adição. Essa evidência encerra a pendência de carregamento visual do catálogo em produção, sem criar pedidos nem modificar dados.

| Área | Evidência atual | Estado para apresentação | Condição para aceite operacional |
|---|---|---|---|
| Vitrine, cardápio, PWA e acompanhamento | Rotas públicas, 18 imagens, pedido controlado e acompanhamento por código verificados em produção. | Apta para demonstração guiada. | Validar a atualização do rastreio depois de uma transição executada pela equipe autenticada. |
| Proteção de API e rotas internas | Sete endpoints protegidos responderam HTTP 401 JSON quando acessados sem sessão. | Apta para demonstrar controle de acesso. | Validar com o e-mail autorizado e cada papel aplicável. |
| Administração, financeiro e auditoria | Código, migração, testes locais, build e endpoints protegidos validados; acesso real já foi confirmado pela responsável. | Apta para apresentação da interface. | Validar um rascunho de despesa, aprovação/rejeição, auditoria e relatório com dados de teste. |
| Fila operacional e impressão | Pedido de teste criado e rastreio público confirmado; impressão foi excluída do protocolo autorizado. | Apta para demonstração visual. | Localizar o pedido com sessão de equipe, confirmar mudanças de estado e verificar alerta e impressão no computador dedicado. |
| Pagamento real | Asaas permanece em Sandbox sem chaves de produção. | Não demonstrar cobrança real. | Configurar credenciais e realizar homologação específica de pagamento antes de cobrar clientes. |

## Retorno à gestão publicado

Após a publicação autorizada da melhoria de navegação, a primeira leitura da rota `/acesso` ainda serviu o bundle anterior. Depois da propagação completa, a mesma rota exibiu os dois atalhos independentes: **“Ir para gestão”**, direcionando para `/admin`, e **“Voltar ao cardápio”**, direcionando para `/`. A confirmação foi realizada em produção sem solicitar novo link de acesso, sem alterar usuários ou pedidos e sem afetar a sessão operacional.

## Correção local da reimpressão móvel pendente de publicação

A sessão de equipe foi confirmada visualmente no Safari móvel: a Fila operacional exibiu o pedido `TB-20260819-C82294251937`, a pré-visualização da comanda foi expandida e os dados sintéticos foram renderizados corretamente. O botão **Reimprimir**, porém, não apresentava resposta visível. O diagnóstico mostrou que ele criava primeiro um job de impressão de modo assíncrono; no Safari móvel, a abertura de janela iniciada após essa espera pode ser bloqueada como pop-up e não gera retorno ao operador.

A correção dispara a abertura da comanda diretamente no gesto do clique, preserva a criação e a baixa auditável do job de reimpressão e apresenta uma mensagem visível por pedido. Caso o navegador bloqueie pop-ups ou não suporte `window.print`, o operador recebe orientação explícita para permitir pop-ups ou usar **Compartilhar > Imprimir**. A regressão TDD passou, a suíte integral registrou **223 testes aprovados e 2 pulados**, a verificação TypeScript não apontou erros e os builds PWA/Vercel foram concluídos. A validação real desse retorno no Safari móvel permanece pendente de publicação autorizada.

A publicação foi autorizada e enviada ao repositório dedicado `Alves1986/marmitas-tb` na branch `main`, sem alteração em outros repositórios, dados, pedidos, pagamentos ou configurações do Supabase. Após a propagação da Vercel, o bundle público `index-BePOlao8.js` passou a conter a mensagem “A janela de impressão foi aberta”, confirmando que o artefato de produção inclui a correção. A confirmação manual final continua restrita a uma sessão de equipe no navegador móvel, pois depende do gesto de reimpressão e das regras de pop-up daquele dispositivo.

## Diagnóstico do acesso por e-mail da equipe

Uma inspeção somente leitura dos logs de autenticação do projeto Supabase identificou que o problema relatado como expiração imediata não decorre de indisponibilidade do serviço nem de bloqueio de cadastro: houve respostas bem-sucedidas de `POST /otp` e redirecionamentos `303` de `/verify` para a rota operacional. Nos mesmos instantes de várias tentativas, um segundo acesso ao mesmo link retornou `403` com “Email link is invalid or has expired” e “One-time token not found”.

Esse padrão confirma o comportamento esperado de token de uso único: o primeiro acesso válido consome o link e estabelece a sessão; qualquer nova abertura, pré-carregamento ou cópia posterior da mesma URL é recusada como expirada. A sessão de equipe já foi confirmada visualmente no Safari móvel, portanto a homologação autenticada pode prosseguir solicitando um novo e-mail, abrindo exclusivamente o link mais recente uma única vez no dispositivo de operação e evitando encaminhar, copiar ou abrir a URL em pré-visualizadores. A configuração de SMTP transacional e de template com código OTP permanece uma melhoria externa separada, não alterada nesta rodada.
