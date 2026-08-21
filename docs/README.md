# Centro de Documentação — Marmitas TB

Este diretório concentra os materiais necessários para operar, manter e evoluir a Marmitas TB sem depender de conhecimento informal. O ponto de partida depende do tipo de atividade que será realizada.

| Documento | Público principal | Finalidade |
|---|---|---|
| [Manual operacional ilustrado](./manual-operacional-ilustrado.md) | Clientes, equipe e gestores | Uso cotidiano da vitrine, pedidos, operação, administração e PWA |
| [Guia técnico de arquitetura e manutenção](./guia-tecnico-manutencao.md) | Desenvolvimento e suporte técnico | Arquitetura, segurança, publicação, diagnóstico e retomada de integrações |
| [Acesso interno por senha](./acesso-interno-por-senha-operacao.md) | Gestores e suporte técnico | Política de credenciais, convite, recuperação e SMTP pendente |
| [Evidências de publicação da autenticação](./evidencias-publicacao-autenticacao-2026-08-20.md) | Suporte técnico | Histórico da publicação e recuperação do alias de produção |
| [Diagnóstico dos advisors do Supabase](./diagnostico-advisors-supabase-2026-08-20.md) | Desenvolvimento e suporte técnico | Avisos de segurança e desempenho consultados sem escrita no ambiente |
| [Diagnóstico de acesso interno](./diagnostico-acesso-interno-2026-08-20.md) | Desenvolvimento e gestão | Causa, correção autorizada de papel e validação da falha de acesso por senha |
| [Evidência parcial de homologação pública](./operacao/evidencia-homologacao-publica-2026-08-20.md) | Suporte técnico e gestores | Rotas públicas verificadas e proteção das áreas internas sem sessão |
| [Homologação controlada em produção](./operacao/homologacao-controlada-2026-08-20.md) | Gestão e suporte técnico | Pedido de teste, transição operacional auditada, sem cobrança ou nova impressão |
| [Homologação Asaas](./operacao/asaas-homologacao.md) | Financeiro e desenvolvimento | PIX Sandbox, variáveis e webhook |
| [Homologação Supabase e Vercel](./operacao/supabase-vercel-homologacao.md) | Desenvolvimento | Estado da migração e critérios de ambiente |
| [Guia de contexto CLAUDE](../CLAUDE.md) | Desenvolvimento e suporte técnico | Arquitetura atual, rotas, regras de segurança, validações e limites de integração |
| [Tutorial completo de uso em PDF](/manus-storage/tutorial-completo-marmitas-tb_4b6a5ae5.pdf) | Clientes, equipe e gestores | Manual ilustrado consolidado de atendimento, operação, administração e totem; entregue como artefato de treinamento antes do próximo envio ao GitHub |

> A configuração de SMTP próprio permanece pendente porque o domínio institucional da Marmitas TB ainda não foi definido. Nenhuma compra ou registro de domínio foi realizado. Consulte o guia de acesso por senha antes de retomar essa etapa.

Para mudanças funcionais, siga sempre o guia técnico: registre a tarefa em `todo.md`, escreva o teste de regressão antes da implementação, execute as validações e salve um checkpoint antes de solicitar publicação.
