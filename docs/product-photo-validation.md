# Validação visual da foto no detalhe do produto

## Inspeção da vitrine

A vitrine pública carregou normalmente após a inclusão da foto condicional no configurador. O cardápio contém produtos personalizáveis com imagem de origem já cadastrada e segue acessível a partir da navegação principal.

## Próxima verificação

Abrir um item personalizável em desktop e celular para confirmar que a foto aparece acima do título e que os controles de personalização e inclusão permanecem acessíveis.

## Recuperação da interação

A tentativa inicial de abrir o card usou um índice de elemento que deixou de ser válido após a rolagem. A próxima interação será feita a partir de uma nova leitura da página, evitando reutilizar índices de uma captura anterior.

A nova leitura confirmou que os cards estavam visíveis, mas a chamada de clique continuou priorizando o índice informado em vez das coordenadas. A próxima tentativa omitirá o índice para que o navegador use somente a posição do card na captura atual.

## Revisão responsiva da vitrine

As capturas em 1280×720 e 375×812 confirmaram que a vitrine continua carregando normalmente após a mudança. O cabeçalho, os chamados para o cardápio e as fotos do catálogo preservaram o contraste e a composição em ambos os formatos. A renderização condicional da foto dentro do configurador foi comprovada pelos cenários automatizados do componente.
