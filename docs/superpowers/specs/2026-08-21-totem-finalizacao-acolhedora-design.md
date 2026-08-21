# Totem Marmitas TB — Finalização acolhedora e encerramento seguro

**Data:** 21 de agosto de 2026  
**Status:** Aprovado pelo responsável

## Objetivo

Tornar o encerramento de um pedido demonstrativo mais claro, acolhedor e recuperável. A confirmação deve destacar a senha de retirada, agradecer o cliente e manter uma saída manual para a tela inicial caso o atendimento precise ser encerrado pelo operador.

## Experiência aprovada

Após a aprovação demonstrativa de PIX ou cartão, a tela `Retirada` apresentará um indicador visual de sucesso em verde, com movimento curto e discreto. O movimento será desativado para pessoas que tenham preferência de redução de movimento no dispositivo. A mensagem principal será **“Obrigado!”**, seguida do texto **“Seu almoço está sendo preparado com carinho.”**. A tag de retirada, como `MTB-001`, continuará sendo o elemento visual de maior destaque.

O botão atual **“Novo pedido”** continuará a limpar o estado e abrir uma nova jornada. Será incluído o botão secundário **“Encerrar atendimento”**, que executa a mesma limpeza local e retorna imediatamente à tela inicial. Essa ação permite que a equipe recupere o totem no caso de abandono, de uma apresentação interrompida ou de qualquer comportamento visual inesperado na tela final.

## Regra de inatividade

O totem conservará o prazo de **90 segundos** sem toque ou teclado. Cada interação reinicia o temporizador. Ao expirar, o pedido em memória, nome e método de pagamento são limpos, e a interface retorna à tela `Opções`. A regra é local ao navegador e não cria pedido, cobrança, evento, impressão ou dado no Supabase.

| Situação | Resultado esperado |
|---|---|
| Cliente toca ou usa o teclado | O prazo de 90 segundos recomeça. |
| Não há interação por 90 segundos | Estado local é limpo e o totem abre `Opções`. |
| Operador toca em `Encerrar atendimento` na retirada | Estado local é limpo e o totem abre `Opções` imediatamente. |
| Cliente toca em `Novo pedido` | Estado local é limpo e uma nova jornada é iniciada. |

## Critérios de aceitação

1. A tela de retirada deve conter o texto “Obrigado!” e a mensagem de preparo.
2. O indicador visual de sucesso não deve reproduzir animação quando `prefers-reduced-motion: reduce` estiver ativo.
3. A senha de retirada permanece legível, em alto contraste e prioritária na hierarquia visual.
4. A tela de retirada deve oferecer `Imprimir recibo`, `Novo pedido` e `Encerrar atendimento`.
5. A inatividade após 90 segundos deve retornar à tela inicial e limpar o estado local.
6. Os testes devem cobrir a mensagem de sucesso, o encerramento manual e o retorno por inatividade.
7. O modo permanece demonstrativo e local, sem cobrança real ou escrita externa.

## Limites desta alteração

Esta evolução não integra máquina de cartão, Pix real, Supabase, banco de dados, notificações, impressora automática ou publicação automática. A publicação em produção só será efetuada manualmente pelo responsável a partir de um checkpoint validado.
