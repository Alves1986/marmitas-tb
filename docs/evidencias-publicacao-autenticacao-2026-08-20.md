# Evidências de publicação — migração de acesso por senha

## Registro inicial

Em **20 de agosto de 2026**, após a autorização explícita para publicação, a branch `main` foi enviada ao repositório privado `Alves1986/marmitas-tb`, do commit anterior `4d6a8d3` até `1435e88`.

| Verificação | Evidência observada |
| --- | --- |
| Domínio público | `https://marmitastb.vercel.app/` respondeu com a vitrine Marmitas TB. |
| Catálogo | A página pública apresentou as oito categorias e 18 opções do catálogo, com imagens hospedadas no Supabase Storage. |
| Rota operacional | `https://marmitastb.vercel.app/operacao` apresentou o bloqueio de acesso da equipe e o atalho para `/acesso`, sem expor pedidos a visitantes. |
| Rota de acesso | Após o push autorizado, `https://marmitastb.vercel.app/acesso` ainda apresentou o formulário legado de magic link, com o botão “Enviar link de acesso”, em vez do formulário de senha presente no commit `1435e88`. A publicação no repositório foi concluída, mas a propagação da Vercel ainda requer diagnóstico. |
| Comparação de bundles | O HTML de produção referenciou `assets/index-DQEdNTbu.js`; o build local validado do commit `1435e88` gerou `index-5vHRL4sg.js`. Isso confirma que o domínio ainda servia a implantação anterior naquele momento. |
| Painel da Vercel | O projeto `marmitas-tb`, ligado ao repositório `Alves1986/marmitas-tb`, mostrou como última implantação de produção a atualização administrativa anterior. O novo commit ainda não apareceu como implantação de produção no painel. |
| Lista de implantações | A lista de implantações de produção terminou no commit `4d6a8d3`; não havia execução em fila, em andamento ou com falha para o commit `1435e88`. |
| Diagnóstico de integração | A leitura de webhooks via GitHub API foi recusada com `403 Resource not accessible by integration`; nenhum webhook foi alterado. A Vercel deve receber uma nova implantação manual do commit já enviado para concluir a publicação autorizada. |
| Ação autorizada | Após autorização explícita, o painel de implantações disponibilizou a opção “Create Deployment”. A criação manual será usada para publicar o commit que já está na branch `main`; nenhuma alteração de configuração do projeto foi solicitada. |
| Implantação iniciada | A criação manual da branch `main` foi confirmada pelo painel. A Vercel registrou a implantação de produção `marmitas-brbhgioqf-andersonalves.vercel.app`, do commit `1435e88`, inicialmente no estado `Initializing`. |
| Implantação concluída | A implantação de produção do commit `1435e88` concluiu com estado `Ready` em 40 segundos. O próximo passo é validar no domínio oficial a substituição do formulário de magic link pelo acesso por senha. |
| Validação de rotas | O URL específico da nova implantação, `marmitas-brbhgioqf-andersonalves.vercel.app/acesso`, exibe e-mail, senha, recuperação e o CTA “Entrar na operação”. No mesmo instante, `marmitastb.vercel.app/acesso` ainda exibia o formulário legado de magic link, o que indica atraso ou inconsistência na propagação do alias de domínio — não falha do bundle novo. |
| Alias de domínio | A tela de detalhes da Vercel identifica a implantação `1435e88` como `Current`, `Latest` e `Production`, lista `marmitastb.vercel.app` entre seus domínios e marca “Assigning Custom Domains” como concluído. A diferença restante é, portanto, compatível com cache de edge ou de PWA no navegador; não há indicação de que o domínio esteja vinculado ao commit anterior. |
| Configuração do domínio | Em Configurações → Domínios, `marmitastb.vercel.app` aparece como “Valid Configuration” e “Production”. A atualização da verificação do domínio não apontou erro de DNS ou de vínculo. |
| Diagnóstico de cache | Mais de uma verificação do domínio oficial, com consultas diferentes e cabeçalhos `Cache-Control: no-cache, no-store`, ainda devolveu o bundle legado `assets/index-cZUr1alj.js`, com `x-vercel-cache: HIT` e o mesmo `etag`. A nova implantação não apresenta o mesmo arquivo. Isso confirma conteúdo estático legado no edge, apesar do alias de produção estar atribuído corretamente no painel. |
| Ação corretiva disponível | O painel CDN → Caches da Vercel disponibiliza “All content”, que invalida o cache de todo o projeto e força revalidação no próximo acesso. Essa é a ação compatível com o diagnóstico; ela não apaga dados, usuários, pedidos, segredos ou implantação, mas pode tornar a primeira navegação posterior ligeiramente mais lenta. |
| Execução da limpeza | Com autorização explícita, a camada `CDN, ISR e Image Cache` foi invalidada e a Vercel confirmou “CDN cache deleted successfully”. Mesmo assim, o domínio público continuou devolvendo `assets/index-cZUr1alj.js`, `x-vercel-cache: HIT`, `age` crescente e `last-modified` de 02:34:05 UTC. O alias técnico `marmitas-tb-git-main-andersonalves.vercel.app` responde sem armazenamento e exibe o novo formulário. A limpeza de cache não atingiu a resposta legada do alias público. |
| Próxima alternativa | O painel de Domínios mantém `marmitastb.vercel.app` como “Valid Configuration” e “Production”, com controles de edição disponíveis. Dado que a implantação, o vínculo e a limpeza de cache já foram confirmados, a próxima alternativa é reassociar o alias ao projeto. Essa ação pode causar uma indisponibilidade muito breve enquanto o alias é removido e adicionado novamente; por isso requer confirmação específica. |
| Escopo desta evidência | Esta etapa confirma a disponibilidade pública da vitrine após o push autorizado. A validação do fluxo interno por senha exige as configurações externas de Auth, URLs de retorno e SMTP documentadas em `docs/acesso-interno-por-senha-operacao.md`. |

Nenhum pedido, cobrança, impressão, usuário, senha ou configuração de Supabase foi alterado nesta verificação.
