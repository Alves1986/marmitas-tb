# Especificação: navegação administrativa e fotos de produto

**Data:** 19 de agosto de 2026  
**Status:** aguardando revisão do responsável  
**Escopo:** painel administrativo, fila operacional, despesas da equipe e cadastro de produtos.

## Objetivo

Reduzir a sobrecarga visual da gestão, eliminando a navegação horizontal por âncoras e substituindo a inserção manual de URL de imagem por um envio guiado. A solução deve manter os módulos existentes, preservar acessos por papel e oferecer retornos claros entre fila, despesas e administração.

## Decisão aprovada

Será adotada a **opção A**: a barra lateral já usada pela área autenticada será reutilizada como navegação contextual da administração. Ela iniciará recolhida, abrirá quando solicitada pelo operador e, dentro de `/admin`, exibirá os módulos administrativos. Cada seleção revelará uma única área de conteúdo no painel principal. Não serão criadas novas rotas administrativas nem uma segunda barra lateral.

| Área | Navegação final | Resultado esperado |
|---|---|---|
| Administração | Barra lateral contextual com Visão geral, Financeiro, Revisões, Auditoria, Relatórios, Cardápio, Equipe e Configurações. | Um módulo visível por vez, com estado ativo claro e sem a grade horizontal atual. |
| Fila operacional | Gestão administrativa, Registrar despesa e Cardápio. | A equipe pode voltar à gestão sem depender da tela de acesso. |
| Registro de despesas | Gestão administrativa e Voltar para a fila. | A pessoa que registra a despesa mantém os dois caminhos de trabalho. |
| Celular | Gaveta lateral fechada por padrão, aberta pelo botão de menu existente. | Navegação preservada sem consumir a área útil de conteúdo. |

## Fluxo de foto do produto

O campo **“Caminho ou URL da foto”** será substituído por um controle de envio guiado. O administrador selecionará uma imagem JPG, PNG ou WebP com tamanho máximo de **5 MB**. O cliente validará tipo e tamanho antes de iniciar a conversão, criará uma versão WebP otimizada, limitada a uma dimensão máxima adequada ao cardápio, e mostrará uma prévia com o nome e o estado de processamento.

Depois da conversão, o arquivo WebP será enviado somente por uma ação administrativa autenticada ao bucket de imagens já usado pelo catálogo. O registro `products.image_path` continuará sendo a fonte de verdade no banco: será atualizado com o caminho WebP gerado. A URL pública continuará a ser derivada desse caminho no momento da exibição, preservando os produtos existentes e evitando armazenar bytes da imagem no banco.

> A troca de imagem é opcional ao editar um produto. Se nenhum arquivo novo for enviado, a foto atual permanece inalterada. Uma imagem só é substituída após o arquivo convertido ter sido aceito pelo armazenamento.

## Componentes e limites

| Unidade | Responsabilidade | Limites |
|---|---|---|
| Navegação contextual | Exibir os módulos administrativos e o item ativo. | Não altera permissões nem cria rotas novas. |
| Painel administrativo | Renderizar apenas o módulo selecionado. | Mantém carregamentos, erros e ações atuais de cada módulo. |
| Controle de foto | Selecionar, validar, converter e pré-visualizar o arquivo. | Não aceita arquivos acima de 5 MB nem formatos fora de JPG, PNG e WebP. |
| Endpoint de upload | Autorizar administrador e enviar o WebP ao Storage. | Não grava bytes no banco nem aceita chamadas sem sessão administrativa. |
| Catálogo | Persistir o caminho WebP no produto após envio válido. | Mantém produtos sem imagem e caminhos legados compatíveis. |

## Tratamento de erros

O usuário receberá mensagens específicas para arquivo grande, formato não permitido, falha de conversão, perda de conexão e falha no armazenamento. Em qualquer falha, a imagem já associada ao produto não será removida. Se o navegador não conseguir converter o arquivo, o produto não será salvo com uma referência parcial.

## Estratégia de testes

Os testes devem ser escritos antes de cada alteração de comportamento. Eles cobrirão validação de limite e formato, conversão e metadados WebP, autorização de upload, persistência somente após upload bem-sucedido, manutenção da foto existente, seleção de módulo administrativo, navegação móvel e os novos retornos para `/admin` na fila e nas despesas.

## Critérios de aceite

1. A administração apresenta uma barra lateral contextual, inicia recolhida e não exibe todos os módulos simultaneamente.
2. A fila e as despesas oferecem retorno explícito para a gestão administrativa.
3. O formulário de produto aceita JPG, PNG e WebP de até 5 MB, apresenta prévia e informa que a versão WebP será salva.
4. A imagem persistida do novo produto é WebP no Storage, enquanto `products.image_path` guarda apenas sua referência.
5. Um erro de arquivo ou upload não apaga a foto atual nem impede correção pelo operador.
6. Os testes, a verificação TypeScript, os builds PWA e Vercel e as verificações visuais em desktop e celular são concluídos antes de qualquer publicação.
