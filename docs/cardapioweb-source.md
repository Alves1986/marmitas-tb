# Fonte visual do catálogo

- **Origem pública:** https://app.cardapioweb.com/marmitas_tb
- **Consulta realizada em:** 17 de agosto de 2026
- **Uso previsto:** selecionar fotos reais dos produtos da Marmitas TB para atualizar o catálogo do aplicativo.

## Informações confirmadas

O cardápio público identifica a operação como **Marmitas TB**, em **Telêmaco Borba/PR**, e apresenta atendimento no almoço todos os dias, das 10h15 às 15h, e jantar de segunda a quinta, das 18h às 22h. Ele também informa as formas de pagamento de voucher alimentação aceitas.

## Categorias e produtos visíveis

| Categoria | Produtos visíveis na consulta |
|---|---|
| Destaques | Parmegiana de carne, Suflair com chocolate, Carne de panela com purê de batata, Carne de porco com batata sauté, Panqueca de carne + Coca, Frango à milanesa + Coca e Strogonoff de frango + Coca |
| Menu Econômico | Pouca fome, Calabresa com macarrão, Omelete recheado, Vegana, Ovo frito com batata/legumes e Ovo frito com calabresa |
| Mais vendidos | Monte sua marmita fit, Frango à milanesa, Frango crocante com calabresa, Carne moída, Bife com fritas, Bife acebolado, Bife com ovo e Bife à milanesa |
| Especialidades | Escolha o seu macarrão, Panqueca de carne, Lasanha de carne, Strogonoff de frango, Parmegiana de frango e Parmegiana de carne |
| Promoções para duas pessoas | Frango à milanesa, Strogonoff de frango e Bife acebolado |

As fotos disponibilizadas no próprio cardápio serão coletadas para uso na interface, sem alterar dados de produto durante esta atualização.

## Ativos selecionados

As fotos de **Carne de panela com purê**, **Panqueca de carne + Coca**, **Frango à milanesa + Coca**, **Pouca Fome**, **Calabresa com macarrão**, **Vegana**, **Marmita Fit**, **Frango à milanesa**, **Bife acebolado**, **Panqueca de carne**, **Strogonoff de frango**, **Parmegiana de frango**, **promoções para duas pessoas**, **batata frita**, **Suflair** e **refrigerantes** foram baixadas da fonte pública e armazenadas nos ativos estáticos da aplicação. A relação completa entre cada produto e a URL de origem encontra-se no manifesto operacional de ativos, preservado em `/home/ubuntu/webdev-static-assets/marmitas-tb/manifest.json`.

## Verificação visual

A atualização foi verificada na prévia responsiva do aplicativo em tela desktop de 1280 × 720 px e em tela móvel de 375 × 812 px. A logo permanece legível no cabeçalho e na área principal; a foto do prato de hoje é exibida sem distorção; e os cards do catálogo carregam as fotos em corte responsivo com sobreposição suficiente para manter legíveis as etiquetas de categoria.

## Verificação de desempenho

Em 17 de agosto de 2026, o build de produção concluiu com sucesso. As 18 fotos de produto selecionadas totalizam aproximadamente **1,8 MB** fora do bundle de JavaScript e são carregadas nos cards com `loading="lazy"` e `decoding="async"`. A imagem principal e a logo são carregadas diretamente por serem elementos acima da dobra. A análise de build também registrou um aviso preexistente de chunk JavaScript acima de 500 kB; os novos ativos visuais não foram incorporados a esse chunk.

Na prévia, três imagens representativas — uma acima da dobra, uma no início do catálogo e uma no fim do catálogo — retornaram **HTTP 200** pelo armazenamento estático, com 125.922 bytes em 0,32 s, 74.137 bytes em 0,27 s e 33.861 bytes em 0,26 s, respectivamente. A inspeção visual de página completa confirmou também o carregamento das imagens abaixo da dobra.
