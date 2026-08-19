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
