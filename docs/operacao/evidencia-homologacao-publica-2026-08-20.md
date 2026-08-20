# Evidência parcial de homologação pública — 20 de agosto de 2026

## Escopo

Esta evidência cobre exclusivamente o carregamento de rotas públicas em produção. Não foi criado pedido, informada informação de cliente, aberta cobrança, alterado status operacional ou enviada impressão.

| Rota | Resultado observado | Escopo confirmado |
|---|---|---|
| [`/`](https://marmitastb.vercel.app/) | Carregou a vitrine, os controles de navegação, as oito categorias e os 18 itens do catálogo com imagens públicas do Supabase Storage. | Vitrine e catálogo público disponíveis. [1] |
| [`/acompanhar`](https://marmitastb.vercel.app/acompanhar) | Carregou o formulário de acompanhamento por telefone e a alternativa de consulta por código mais telefone. Nenhum dado foi preenchido. | Tela pública de acompanhamento disponível. [2] |

> Esta não é a homologação completa do pedido. A confirmação de criação, rastreamento de um pedido de teste e transição de status continua dependendo de uma sessão interna válida para a equipe, sem qualquer cobrança ou impressão.

## Proteção das rotas internas sem sessão

| Rota solicitada | Resultado observado | Conclusão |
|---|---|---|
| [`/admin`](https://marmitastb.vercel.app/admin) | Redirecionou para [`/acesso`](https://marmitastb.vercel.app/acesso), que solicita e-mail autorizado e senha individual. | A administração não foi exposta sem credenciais. [3] |
| [`/operacao`](https://marmitastb.vercel.app/operacao) | Exibiu a tela “Acesso da equipe” com o atalho para o login. | A fila operacional não mostrou pedidos ou controles sem uma sessão de equipe. [4] |

Nenhuma credencial foi enviada durante a verificação. Portanto, a homologação autenticada das transições operacionais, despesas e auditoria permanece pendente de uma sessão válida de `staff` ou `admin`.

## Referências

[1] [Vitrine pública da Marmitas TB](https://marmitastb.vercel.app/)

[2] [Acompanhamento público da Marmitas TB](https://marmitastb.vercel.app/acompanhar)

[3] [Acesso interno da Marmitas TB](https://marmitastb.vercel.app/acesso)

[4] [Fila operacional da Marmitas TB](https://marmitastb.vercel.app/operacao)
