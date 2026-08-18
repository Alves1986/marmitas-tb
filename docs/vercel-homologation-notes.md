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
