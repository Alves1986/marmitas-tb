# Checklist de acessibilidade básica — Marmitas TB

## Escopo revisado

Esta revisão cobre o fluxo público principal de descoberta, configuração de produto, sacola, checkout e confirmação de pedido. Ela complementa as verificações visuais em desktop e mobile e não substitui uma auditoria formal com usuários de tecnologias assistivas.

| Critério | Verificação aplicada | Resultado |
|---|---|---|
| Ordem de foco | Controles interativos usam elementos nativos (`button`, `input`, `textarea` e links), preservando a sequência de tabulação do DOM. | Aprovado |
| Foco visível | Elementos interativos têm contorno vermelho de alto contraste ao receberem `:focus-visible`. | Aprovado |
| Ações por teclado | Os testes de interação confirmam abertura da sacola, seleção de opções, fechamento de diálogos, avanço e retorno em todas as etapas do checkout, confirmação e ações pós-pedido. | Aprovado |
| Diálogos | Configurador e sacola usam título e descrição acessíveis; controles de fechar têm nome explícito e a confirmação transfere o foco ao título de sucesso. | Aprovado |
| Campos de formulário | Dados de checkout e observações possuem `label` associado, mensagens de validação e teclados adequados para telefone/valor. | Aprovado |
| Estados selecionados | Opções de produto e formas de pagamento comunicam seleção com `aria-pressed`. | Aprovado |
| Ícones | Ícones decorativos ficam acompanhados de texto ou recebem nome acessível no botão correspondente. | Aprovado |

## Evidência automatizada

O teste `client/src/components/delivery/keyboard-flow.test.tsx` valida os comportamentos de teclado de sacola, configurador, checkout em quatro etapas e confirmação, inclusive cópia do número, link de WhatsApp e retorno ao cardápio. Os cálculos, a persistência e o adaptador de confirmação têm cobertura adicional nos testes unitários de domínio e serviço.

## Próxima validação recomendada

Antes da publicação, recomenda-se uma auditoria com leitor de tela (NVDA ou VoiceOver), contraste em dispositivos reais e validação do conteúdo final, especialmente quando forem incluídas fotografias, integração de pagamento ou um canal de atendimento real.
