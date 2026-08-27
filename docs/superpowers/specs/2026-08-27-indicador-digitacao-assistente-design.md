# Indicador de digitação do assistente — Design

**Status:** Direção visual e comportamento aprovados em 27/08/2026.

## Objetivo

Tornar perceptível que o assistente de ajuda está preparando uma resposta depois que a pessoa envia uma dúvida, sem sugerir prazo, progresso mensurável ou execução de uma ação operacional.

## Experiência aprovada

Enquanto `isLoading` estiver ativo no componente de conversa, a última posição da lista de mensagens exibirá uma bolha atribuída ao assistente. A bolha terá três pontos em sequência e o texto **“Preparando orientação…”**. Ela será removida quando a resposta for adicionada à conversa ou quando a solicitação falhar; no segundo caso, o alerta recuperável já existente continuará sendo a orientação visível.

O componente terá `role="status"` e texto disponível para tecnologias assistivas. Os pontos serão decorativos e não serão anunciados separadamente. A animação atuará exclusivamente sobre opacidade e transform, terá cadência curta e ficará estática quando a preferência `prefers-reduced-motion: reduce` estiver ativa.

## Limites

O indicador reutiliza somente o estado `isLoading` já repassado pelo launcher. Não altera a rota `POST /api/operations/help`, o modelo, as mensagens, a persistência, os papéis, o bloqueio de dados sensíveis, os tutoriais nem as superfícies em que a ajuda é exibida.

## Verificação

Uma regressão DOM deve verificar que o indicador aparece durante o carregamento com o rótulo acessível aprovado e desaparece quando o carregamento termina. A validação final inclui testes, tipagem, build PWA, compilação Vercel, revisão visual e checagem de diferenças.
