# Validação visual: rastreamento por telefone e PWA

## Evidência de interface

Em 18 de agosto de 2026, a rota pública `/acompanhar` foi revisada em viewport de 1280 × 720. O formulário por telefone aparece como ação principal, a consulta por código fica recolhida como alternativa e o texto informa que somente o pedido ativo mais recente será exibido.

A vitrine pública `/` foi revisada no mesmo ciclo. A estrutura do cardápio, os produtos, as imagens e os controles de pedido permanecem visíveis após a inclusão do shell PWA. O aviso de modo offline e a ação de instalação são condicionais, portanto não aparecem enquanto o navegador está online e ainda não oferece o evento de instalação.

## Limites verificados

O cache do PWA cobre o shell estático do aplicativo e imagens já acessadas. Consultas de rastreamento, pedidos, pagamentos, operação e administração continuam dependentes de rede para evitar dados desatualizados ou ações repetidas.
