# Base técnica da administração completa

## Diagnóstico de produção

Em 19 de agosto de 2026, os endpoints publicados `https://marmitastb.vercel.app/api/admin/catalog` e `https://marmitastb.vercel.app/api/public/menu` foram verificados sem sessão e ambos renderizaram a página SPA de erro 404, em vez de uma resposta HTTP das funções. Isso explica as falhas simultâneas de catálogo, equipe e configurações no painel: as chamadas do cliente chegam à aplicação de página única, não aos handlers em `api/`.

A configuração anterior usava `"/((?!api/).*)"` como origem do fallback. A documentação da Vercel demonstra o padrão com captura nomeada, como `/:path((?!uk/).*)`; por isso o fallback foi corrigido para `/:path((?!api/).*)`, preservando `/api` para o roteamento automático de funções. A correção é protegida pelo teste `scripts/vercelFunctionBoundary.test.ts`.

Fonte técnica: [Rewrites on Vercel](https://vercel.com/docs/routing/rewrites).

## Dados reais disponíveis

O schema existente já permite indicadores confiáveis de pedidos e receitas. A tabela `orders` contém total em centavos, estado do pedido, método/provedor de pagamento, estado do pagamento, confirmação e timestamps. Os indicadores financeiros devem considerar receitas confirmadas, por período, sem tratar pedidos pendentes, falhos, cancelados ou reembolsados como faturamento realizado.

## Extensão autorizada

Foi autorizada uma migração estrutural, sem importação nem alteração de histórico legado, para criar:

- `expense_entries`, com valor em centavos, categoria, competência, comprovante opcional, estado de rascunho/aprovado/rejeitado e autoria;
- `admin_audit_logs`, com ator, ação, entidade, identificador, contexto permitido e timestamp;
- políticas RLS que permitam à equipe criar rascunhos próprios e reservem aprovação, rejeição, leitura financeira e auditoria aos administradores.

Os novos indicadores e relatórios devem exibir ausência de dados quando não houver pedidos confirmados ou despesas aprovadas, nunca valores simulados.
