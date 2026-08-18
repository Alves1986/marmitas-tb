# Foto em destaque no detalhe do produto

**Data:** 17 de agosto de 2026  
**Status:** Aguardando revisão do usuário

## Objetivo

Exibir a foto real do item quando o cliente abrir a janela de personalização de um produto no cardápio da Marmitas TB. A imagem deve reforçar a decisão de compra sem dificultar a escolha de opções nem o acesso à ação de adicionar à sacola.

## Decisão de interface

O detalhe adotará a composição de **foto em destaque**. A imagem ocupará toda a largura útil no topo do conteúdo da janela, imediatamente antes do bloco com título, preço e descrição. Esse posicionamento foi escolhido em comparação com a alternativa de miniatura lateral porque preserva melhor a leitura da foto e cria uma transição clara entre a vitrine e a personalização do item.

Após a foto, a ordem da interface continuará sendo título e preço, descrição, grupos de opções, observações, quantidade e botão para adicionar. O rodapé com quantidade e preço final permanecerá fixo dentro da janela, como já ocorre no fluxo atual.

## Dados e comportamento

O componente reutilizará `product.imageUrl`, já presente no contrato do cardápio. A imagem receberá texto alternativo formado pelo nome do produto e será exibida com `object-fit: cover`, mantendo uma proporção consistente entre itens.

Quando um produto não possuir `imageUrl`, nenhuma moldura ou espaço reservado será renderizado. Os demais controles devem manter a mesma ordem e o mesmo comportamento atual. A inclusão do item na sacola não será modificada.

## Responsividade e acessibilidade

Em telas pequenas, a foto permanece no topo e usa uma altura limitada para evitar que os grupos de escolhas sejam empurrados excessivamente para baixo. Em telas maiores, a janela respeita a largura máxima atual e a imagem mantém o mesmo alinhamento do conteúdo. O texto alternativo será descritivo, e o foco do teclado continuará entrando no diálogo conforme o comportamento já estabelecido.

## Critérios de validação

1. Ao abrir um produto com foto, a janela mostra uma imagem com o `src` e o texto alternativo corretos.
2. Ao abrir um produto sem foto, a janela continua utilizável e não renderiza região visual vazia.
3. Os fluxos existentes de seleção, quantidade e inclusão na sacola continuam aprovados.
4. A interface é revisada visualmente em desktop e em celular, confirmando que o botão de adicionar permanece alcançável.
