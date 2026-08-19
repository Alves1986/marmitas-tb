# Notas de homologação Vercel

Em 18 de agosto de 2026, a branch `feat/supabase-vercel-migration` foi confirmada no repositório `Alves1986/ministral` no commit `e1d2d49c1b3ceed86ee8eb42ec8a204121f72b2a`.

A sessão autenticada na Vercel reconhece o repositório `Alves1986/ministral`. A tela de importação apresenta explicitamente o botão **Deploy** e informa que a implantação começa após essa ação. A documentação oficial também registra que integrações Git fazem implantações automáticas em pushes de branches suportadas. Portanto, nenhuma importação foi concluída, preservando a exigência do projeto de não realizar deploy automático.

Foi criado exclusivamente um projeto vazio de homologação na conta `andersonalves`, posteriormente renomeado para `marmitas-tb` (ID `prj_3wsUE1nZLPHb5v4qrd3m4cemIogM`). No momento da criação e da renomeação, o painel confirmou **No Production Deployment** e **No Preview Deployments**. O repositório Git não foi conectado e nenhum código foi enviado à Vercel.

Em seguida, o responsável confirmou que as variáveis de ambiente requeridas para a homologação foram salvas na Vercel. Essa informação foi aceita sem revelar valores sensíveis. A validação funcional dessas variáveis permanece dependente de uma futura implantação de prévia autorizada.

Uma captura fornecida pelo responsável confirma que o domínio de produção do projeto vazio é `marmitastb.vercel.app`, está marcado como **properly configured** e permanece em estado **No Deployment**. A interface informa explicitamente que não há deployment de produção e que um deploy exigiria uma ação posterior. O responsável também informou que esse domínio já está definido no Supabase Auth e pediu que a configuração não seja alterada nesta etapa.

Observação técnica: quando uma implantação for autorizada, a URL pública deve ser utilizada com HTTPS (`https://marmitastb.vercel.app`). Antes do primeiro teste de OTP em homologação, convém validar no painel Supabase se os Redirect URLs também abrangem o domínio de prévia correspondente.

Após a autorização explícita para uma única prévia, o repositório `Alves1986/ministral` foi conectado ao projeto Vercel. A tela de **Build and Deployment** confirmou que o diretório raiz está vazio, conforme a estrutura da branch de migração. Nenhuma implantação de produção foi criada nesta etapa.

O preset de framework foi então definido como **Vite**, com saída padrão `dist`. Os comandos permanecem sem sobrescritas manuais, permitindo que a Vercel use o `pnpm build` definido no repositório. Essa configuração foi salva antes do commit que criará a prévia autorizada.

## Incidente de classificação de ambiente — 18 de agosto de 2026

O commit `4f76d4b` da branch `feat/supabase-vercel-migration`, enviado exclusivamente para uma prévia autorizada, foi inesperadamente exibido pela Vercel como ambiente **Production** durante a construção. Após confirmação explícita do responsável, foi solicitada a interrupção imediata. O painel passou a exibir o estado **Error** e informou que o cancelamento já não podia ser aplicado a uma implantação em erro. Não há evidência de conclusão bem-sucedida ou de URL de produção disponível nesta sessão. A integração Git deve ser reconfigurada antes de qualquer nova tentativa.

A inspeção do deployment `HLoocpCVG` identificou a causa objetiva da falha: o plano Vercel **Hobby** limita cada implantação a 12 funções serverless, enquanto a estrutura atual contém mais endpoints em `api/`. A compilação terminou em erro antes de servir a aplicação. Os domínios temporários exibidos pelo painel pertencem à implantação falha e não confirmam disponibilidade funcional; o domínio personalizado não foi associado a uma implantação concluída.

## Contenção da integração Git — 18 de agosto de 2026

Após identificação de que `Alves1986/ministral` hospeda outro sistema, o remoto local nomeado `github`, que apontava para esse repositório, foi removido. O remoto interno do projeto foi preservado. O painel Vercel confirmou que `Alves1986/ministral` permanecia conectado e que qualquer novo commit nesse repositório criaria deployments; a conexão foi removida com sucesso. O painel passou a informar que o projeto não está conectado a repositório Git, portanto não há novo deployment automático por commits. Nenhuma tentativa de apagar, reescrever ou alterar o histórico remoto foi realizada.

Fonte consultada: <https://vercel.com/docs/git>.

Com autorização explícita, foi criado o repositório privado dedicado [`Alves1986/marmitas-tb`](https://github.com/Alves1986/marmitas-tb). A branch `feat/supabase-vercel-migration` foi publicada exclusivamente nele e tornou-se a branch padrão do novo repositório. A cópia local mantém apenas o remoto interno do projeto e o remoto `github` destinado a esse repositório dedicado; `Alves1986/ministral` não permanece configurado como remoto nem conectado à Vercel.

## Retomada controlada da prévia — 19 de agosto de 2026

Após a confirmação explícita do responsável, a reorganização de funções foi concluída e a branch `feat/supabase-vercel-migration` passou a conter somente nove handlers TypeScript em `api/`; as bibliotecas internas e os testes foram transferidos para `server/vercel/`. A validação local registrou 180 testes aprovados, dois pulados intencionalmente, checagem TypeScript e build de produção concluídos. O commit correspondente foi enviado exclusivamente ao repositório privado dedicado `Alves1986/marmitas-tb`.

Para impedir nova classificação da branch de migração como produção, foi criada a branch `main` mínima e ela foi definida como a branch padrão do repositório dedicado. A branch `feat/supabase-vercel-migration` permanece destinada somente à prévia autorizada. No painel autenticado, o projeto Vercel `marmitas-tb` foi confirmado sem repositório conectado e o seletor GitHub apresentou tanto `marmitas-tb` quanto `ministral`; a conexão pendente é deliberadamente restrita a `Alves1986/marmitas-tb`.

O painel confirmou o vínculo concluído exclusivamente com `Alves1986/marmitas-tb`. Após o envio do commit `878fe83` para `feat/supabase-vercel-migration`, a Vercel iniciou uma implantação desse commit identificada como ambiente **Preview**. A implantação histórica `4f76d4b`, que aparece como **Production** e em erro, foi mantida apenas como registro do incidente anterior; o domínio de produção continua sem deployment ativo.

No acompanhamento inicial, a nova prévia permaneceu em compilação por cerca de um minuto. Nenhuma URL de produção foi ativada, e a tela de deployments continuou a classificá-la como **Preview**.

A implantação de Preview `878fe83` concluiu com o estado **Ready** e recebeu a URL `https://marmitas-le2ffl28q-andersonalves.vercel.app/`. Na primeira abertura pública da raiz, porém, a extração exibiu o conteúdo-fonte de `server/_core/vite.ts`, em vez da vitrine React esperada. Esse comportamento exige diagnóstico da configuração de rotas/publicação antes de considerar a homologação funcionalmente validada; nenhuma ação de produção foi realizada.

### Diagnóstico e correção local da resposta da raiz

A investigação reproduziu a estrutura produzida pelo build: o Vite gravava a vitrine em `dist/public/index.html`, enquanto o projeto Vercel estava configurado para publicar `dist`. No mesmo diretório de publicação havia apenas o bundle legado `dist/index.js`, de modo que a reescrita para `/index.html` não encontrava a página estática no nível configurado. A causa, portanto, era o desencontro entre os diretórios de saída, e não os nove handlers de `api/` nem a conexão com o repositório.

Foi aplicada a correção mínima em `vite.config.ts`, definindo `outDir` como `dist`. Um teste estrutural novo impede regressão dessa configuração. A validação local confirmou `dist/index.html` no nível de publicação, 181 testes aprovados e 2 pulados, TypeScript aprovado, build concluído e integridade do diff. A nova prévia continua pendente de autorização explícita antes de qualquer push adicional.

Após autorização explícita, o checkpoint `106aaf6` foi enviado exclusivamente a `feat/supabase-vercel-migration`. A Vercel iniciou a implantação correspondente como **Preview** na URL a ser confirmada `marmitas-7y8lrfioj-andersonalves.vercel.app`. A branch `main`, o domínio configurado e a implantação histórica em produção não foram modificados.

A implantação `106aaf6` foi concluída com estado **Ready** como **Preview**. O próximo passo é verificar a resposta pública da nova URL; a implantação histórica `4f76d4b` continua separada, marcada como produção e em erro, sem ter sido promovida, atualizada ou removida durante esta homologação.

A verificação pública confirmou que a rota raiz da nova prévia entrega a aplicação React, com título da Marmitas TB, navegação, catálogo de 18 itens e sacola disponíveis. Isso confirma a correção do diretório de publicação. Na mesma inspeção visual, algumas imagens do destaque apareceram sem carregamento, embora o conteúdo textual do catálogo estivesse disponível. Esse defeito visual será investigado separadamente antes de considerar a prévia pronta para homologação funcional.

### Diagnóstico e correção local dos ativos visuais

A falha visual foi atribuída a referências remanescentes a `/manus-storage/`, uma rota atendida somente pelo servidor de desenvolvimento legado e inexistente no ambiente Vercel. A inspeção somente leitura do projeto Supabase `marmitas-tb` confirmou que os 18 produtos ativos já apontam para URLs públicas do bucket `marmitas-tb-assets`, enquanto a logo está disponível em `brand/logo-marmitastb.jpg`.

Foi criado um resolvedor único de ativos públicos no cliente e foram atualizados os 18 cards, o destaque, o cabeçalho, o ícone Apple Touch e o manifesto PWA para utilizar exclusivamente o bucket Supabase. A proteção de catálogo agora exige URLs públicas desse bucket; a validação local registrou 181 testes aprovados, 2 pulados, checagem TypeScript, build, integridade do diff, ausência de `/manus-storage/` nos arquivos públicos e presença do ícone oficial no manifesto gerado. A confirmação visual permanece pendente de uma nova implantação Preview explicitamente autorizada.

Após autorização explícita, o checkpoint `672f59f` foi enviado somente à branch `feat/supabase-vercel-migration`. A Vercel iniciou a implantação `https://marmitas-go1zwmc5n-andersonalves.vercel.app/`, exibida como **Preview** e em compilação; `main`, o domínio configurado e o incidente histórico em produção permanecem inalterados.

A URL da terceira prévia ficou disponível e entregou a vitrine React. A inspeção visual confirmou o carregamento correto da logo no cabeçalho e na área de destaque, bem como da imagem da carne de panela no cartão principal. O conteúdo também informou as 18 opções do catálogo, mantendo a navegação e a sacola disponíveis. A verificação visual dos cards segue como passo final desta correção.

O teste final confirmou que os 18 caminhos exclusivos definidos no catálogo retornam **HTTP 200** no bucket público `marmitas-tb-assets` do Supabase. A prévia `https://marmitas-go1zwmc5n-andersonalves.vercel.app/` permanece classificada como **Preview**, sem promoção para `main`, alteração do domínio configurado ou nova implantação de produção. Com isso, a publicação da raiz e os ativos públicos da vitrine ficam validados para a etapa de homologação funcional.

O manifesto `manifest.webmanifest` foi acessado pela prévia autenticada e confirmou as duas entradas PWA (`192x192` e `512x512`, inclusive maskable) apontando para `brand/logo-marmitastb.jpg` no bucket público Supabase. A tentativa de inspeção pelo terminal foi bloqueada apenas pela proteção de acesso da Vercel, não por indisponibilidade do manifesto; a validação continuou pelo navegador autenticado.

Na revisão complementar foi identificada a ausência de uma tag `rel="icon"` no HTML publicado. A correção local acrescentou o favicon com a mesma logo pública do Supabase usada pelo Apple Touch e pelo manifesto. O teste novo falhou primeiro pela ausência da referência e passou após a inclusão; a confirmação na Vercel depende de uma nova prévia autorizada.

Após autorização explícita, o checkpoint `9ff17d2` foi enviado exclusivamente à branch `feat/supabase-vercel-migration`. A Vercel iniciou outra implantação corretamente classificada como **Preview**; durante o acompanhamento inicial, ela permaneceu em `Building`, sem qualquer alteração em `main`, no domínio configurado ou no registro histórico de produção.

No acompanhamento subsequente, o build continuava em execução após aproximadamente 43 segundos, sem erro exibido no painel. A validação dos recursos publicados continuará somente quando o estado mudar para `Ready`.

Embora o painel ainda exibisse `Building` durante a consulta seguinte, a URL exclusiva da prévia `https://marmitas-p2erwrjow-andersonalves.vercel.app/` já respondeu com a vitrine React. A inspeção confirmou a logo, a imagem de destaque e o catálogo de 18 opções renderizados, sem imagem quebrada visível nas áreas carregadas. As validações específicas do favicon e do manifesto continuam necessárias antes de encerrar a homologação desta prévia.

A mesma prévia serviu `manifest.webmanifest` com ícones de 192×192 e 512×512 (incluindo versão maskable) apontando à logo pública do bucket `marmitas-tb-assets`. A imagem `brand/logo-marmitastb.jpg` abriu normalmente como um recurso de 2048×2048, confirmando o ativo compartilhado por favicon, Apple Touch e manifesto. As propriedades PWA verificadas são: `start_url` e `scope` em `/`, `display: standalone`, fundo `#fffaf1` e tema `#481e1f`.

No retorno à URL de Preview, o cabeçalho, a sacola e a vitrine de destaque renderizaram novamente com seus ativos corretos. O atalho `Cardápio` foi acionado para a inspeção final da área de produtos, que será registrada a seguir.

Na URL de Preview do checkpoint `9ff17d2`, a área `Cardápio da Casa` exibiu as 18 opções, o campo de busca e todos os filtros de categoria. A vitrine e a área de catálogo responderam com conteúdo válido; a inspeção da grade de cards foi iniciada a partir desse ponto para verificar as imagens renderizadas, complementando a verificação HTTP já concluída para os 18 objetos do bucket.

A inspeção visual da grade foi concluída na mesma prévia. Os três cards de destaque — **Carne de panela com purê de batata**, **Panqueca de carne + Coca 200 ml** e **Frango à milanesa + Coca 200 ml** — renderizaram com suas fotos, preços, rótulos e ações de adicionar, sem imagens quebradas. O manifesto, a logo pública compartilhada pelo favicon e Apple Touch, e os cards do catálogo ficam validados no ambiente de Preview. Nenhuma promoção para `main`, alteração de domínio ou deployment de produção foi executado.

### Evidência técnica da prévia `marmitas-p2erwrjow`

A inspeção do HTML servido pela Preview confirmou as duas tags publicadas no `<head>`:

```html
<link rel="icon" href="https://hwkgplnzvcaobjozfmqx.supabase.co/storage/v1/object/public/marmitas-tb-assets/brand/logo-marmitastb.jpg">
<link rel="apple-touch-icon" href="https://hwkgplnzvcaobjozfmqx.supabase.co/storage/v1/object/public/marmitas-tb-assets/brand/logo-marmitastb.jpg">
```

As respostas HTTP foram `200` para a logo pública compartilhada pelos dois links e para `https://marmitas-p2erwrjow-andersonalves.vercel.app/manifest.webmanifest`. O DOM publicado contém 18 URLs únicas sob `marmitas-tb-assets/catalog/`. A checagem explícita devolveu `200` para cada uma delas: `batata-frita.jpeg`, `bife-acebolado.jpg`, `calabresa-macarrao.png`, `carne-panela.jpg`, `coca-200.png`, `duo-frango.jpg`, `duo-strogonoff.png`, `frango-coca.png`, `frango-milanesa.png`, `marmita-fit.jpg`, `panqueca-carne.png`, `panqueca-coca.png`, `parmegiana-frango.png`, `pouca-fome.jpg`, `refrigerante-lata.png`, `strogonoff-frango.png`, `suflair.jpg` e `vegana.jpg`.

Por fim, a captura navegada da própria Preview exibiu os cards do catálogo com imagens já renderizadas — incluindo os cards de `Menu Econômico` e `Mais Vendidos` — o que complementa a verificação de DOM e de HTTP. Esta evidência encerra a validação da publicação estática, dos ativos PWA e das imagens do catálogo neste ambiente de homologação.

#### Inspeção específica de imagens e captura visual

O HTML capturado diretamente da Preview (`marmitas-p2erwrjow-andersonalves.vercel.app`) foi inspecionado por elementos `<img>`. Ele contém **19** imagens de catálogo/hero com `alt` e `src` explícitos: uma do destaque e 18 associadas aos produtos. Os 18 cards têm os seguintes textos alternativos publicados: Carne de panela com purê de batata; Panqueca de carne + Coca 200 ml; Frango à milanesa + Coca 200 ml; Pouca Fome — monte como deseja; Calabresa com macarrão; Marmita vegana; Monte sua marmita fit; Frango à milanesa; Bife acebolado; Panqueca de carne; Strogonoff de frango; Parmegiana de frango; 2 marmitex médias de frango à milanesa; 2 marmitex médias de strogonoff; Porção de batata frita; Suflair com chocolate; Coca-Cola 200 ml; e Refrigerante 350 ml. Cada `src` aponta ao caminho público correspondente sob `https://hwkgplnzvcaobjozfmqx.supabase.co/storage/v1/object/public/marmitas-tb-assets/catalog/`.

A captura visual navegada da mesma Preview exibiu, sem placeholders ou ícones quebrados, os cards de `Pouca Fome — monte como deseja`, `Calabresa com macarrão` e `Marmita vegana`, seguidos de cartões na seção `Mais Vendidos`. A grade também mostrou imagem, título, descrição, valor em BRL e ação de adicionar em cada card amostrado. Essa confirmação visual, combinada com os atributos de imagem presentes no DOM e os 18 retornos HTTP 200 já registrados, constitui a evidência de carregamento do catálogo nesta prévia.

Uma tentativa complementar de arquivar uma captura automatizada em navegador isolado foi bloqueada pela tela de autenticação da Vercel. Isso confirma que a proteção da prévia continua ativa; nenhuma configuração de acesso foi alterada. A visualização funcional e a inspeção de HTML foram realizadas no navegador autenticado conectado à conta do projeto. A coleta automatizada de `naturalWidth` ou de uma captura sem a sessão autenticada permanece indisponível enquanto essa proteção estiver ativa.

#### Decisão de homologação

Em 18 de agosto de 2026, foi escolhida a preservação da proteção de acesso da Preview. Assim, esta etapa é encerrada com a inspeção autenticada da vitrine, os atributos publicados no DOM, os retornos HTTP dos ativos e a revisão visual no navegador conectado. A coleta de uma captura independente ou de métricas de carregamento sem sessão permanece deliberadamente fora do escopo enquanto a proteção estiver ativa; ela poderá ser executada em futuro ambiente público controlado, sem alterar a atual prévia protegida.

### Preparação de redirecionamentos Supabase Auth

Antes da configuração, o **Site URL** era `http://localhost:3000` e não havia URLs adicionais permitidas. A alteração autorizada define o Site URL como `https://marmitastb.vercel.app` e restringe a allow list a `http://localhost:3000/**`, `https://marmitastb.vercel.app/**` e `https://marmitas-*-andersonalves.vercel.app/**`. O último padrão cobre apenas as URLs de Preview do projeto Marmitas TB na conta Vercel `andersonalves`, sem permitir redirecionamentos genéricos de outros projetos.

Na interface do Supabase, o Site URL foi preenchido com `https://marmitastb.vercel.app`. Foram incluídas, ainda não salvas, as entradas `http://localhost:3000/**` e `https://marmitastb.vercel.app/**`. A próxima inclusão é o padrão restrito de prévias, após o qual o painel aplicará a lista completa em uma única gravação.

A lista foi completada com `https://marmitas-*-andersonalves.vercel.app/**`. Antes da gravação, os três padrões foram revisados no modal: local, domínio de homologação e previews exclusivos da Marmitas TB. Nenhuma URL genérica de outra aplicação Vercel foi incluída.

O Supabase confirmou a gravação da lista com **3 URLs**: `http://localhost:3000/**`, `https://marmitastb.vercel.app/**` e `https://marmitas-*-andersonalves.vercel.app/**`. O Site URL ainda constava como `http://localhost:3000` nesta confirmação intermediária e será salvo em seguida com o domínio de homologação já autorizado.

O Site URL foi preenchido com `https://marmitastb.vercel.app` e a ação **Save changes** foi acionada. A lista de três redirecionamentos autorizados permaneceu inalterada durante essa gravação. A próxima verificação recarregará a tela para confirmar a persistência antes de qualquer tentativa de autenticação.

A recarga do painel confirmou a persistência completa: o Site URL passou a ser `https://marmitastb.vercel.app`; a lista contém exatamente as três URLs planejadas e totaliza `3`. A configuração não alterou provedores, usuários, papéis, políticas de RLS nem a criação de contas. O próximo teste funcional requer um e-mail já cadastrado com papel `staff` ou `admin`, pois o fluxo OTP permanece com `shouldCreateUser: false`.
