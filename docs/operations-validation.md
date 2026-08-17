# Validação Integrada da Operação — Marmitas TB

**Data da validação:** 17 de agosto de 2026  
**Escopo:** vitrine pública, checkout híbrido, acompanhamento, fila operacional, administração, impressão e preparação do Asaas.

## Evidências automatizadas

| Verificação | Resultado | Evidência |
|---|---:|---|
| Suíte de testes | Aprovada | **76 testes** em 29 arquivos de teste |
| Checagem de tipos | Aprovada | `pnpm check` sem erros |
| Compilação de produção | Aprovada | `pnpm build` concluído |
| Validação de impressão | Aprovada | Cobertura de enfileiramento, baixa e reimpressão em `print_jobs` |
| Webhook Asaas | Aprovada | Testes de token, rota, mapeamento e idempotência por evento |

> A compilação registra somente um aviso não bloqueante de tamanho de bundle. A entrega continua compilável; uma futura otimização pode dividir o JavaScript inicial em blocos menores.

## Rotas verificadas visualmente

| Rota | Resultado observado |
|---|---|
| `/` | Vitrine da Marmitas TB, categorias, produtos, carrinho e identidade visual carregados. |
| `/acompanhar` | Formulário de consulta protegido por código do pedido e telefone exibido corretamente. |
| `/operacao` | Fila operacional carregada; sem pedidos ativos, apresenta estado vazio e informa atualização automática a cada 10 segundos. |
| `/admin` | Painel administrativo carregado com gestão de cardápio, equipe e configurações. A barra lateral expõe os atalhos **Administração**, **Fila operacional** e **Cardápio público**. |

## Roteiro de validação operacional local

1. No checkout, crie um pedido com pagamento diferente de dinheiro. O ambiente de teste confirma a cobrança sem transação financeira real.
2. Em `/operacao`, confirme o aviso visual do pedido e reconheça-o. O reconhecimento é persistido para não reaparecer após atualizar a tela.
3. Avance o pedido pela fila, abra a prévia de 80 mm e faça uma reimpressão. Cada emissão deve gerar um trabalho em `print_jobs` antes de o navegador chamar a impressão.
4. Use `/acompanhar` com o código e telefone do pedido para confirmar a linha do tempo pública.
5. Em `/admin`, altere disponibilidade, categoria, produto, opções, foto por URL armazenada, equipe e configurações. Confirme que cada alteração reaparece após recarregar a página.

## Limitações assumidas nesta fase

O modo **Teste — sem cobrança real** permanece o padrão. O adaptador oficial do Asaas e o webhook seguro estão preparados, porém o pagamento oficial só deve ser ativado após cadastrar as credenciais e o token de webhook pelo fluxo seguro de configurações.

O alerta sonoro depende de uma interação inicial da equipe devido à política de reprodução automática do navegador. O documento [`operation-kiosk-printing.md`](./operation-kiosk-printing.md) detalha o posto de cozinha e o modo quiosque recomendado para impressão térmica.
