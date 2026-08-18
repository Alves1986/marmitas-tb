# Diagrama de arquitetura e CI com artefato

**Data:** 18 de agosto de 2026  
**Status:** aprovado para implementação

## Objetivo

Documentar a arquitetura operacional da Marmitas TB diretamente no `README.md` e adicionar um workflow do GitHub Actions que valide cada alteração relevante no projeto exportado em `marmitastb/`.

## Decisões aprovadas

| Aspecto | Decisão |
| --- | --- |
| Formato do diagrama | Mermaid versionado no README, renderizado pelo GitHub e facilmente revisável em pull requests. |
| Escopo arquitetural | Clientes, PWA, aplicação React/Vite, Express/tRPC, autenticação, pedidos/operação/administração, banco MySQL/TiDB, armazenamento e Asaas opcional. |
| Dados em cache | Somente conteúdo público já carregado. Checkout, rastreamento atual, pagamentos e áreas protegidas continuam dependentes de rede e API. |
| Gatilhos de CI | `push` e `pull_request` em alterações dentro de `marmitastb/` ou no próprio workflow. |
| Validações | Instalação reprodutível, testes, checagem TypeScript e build de produção. |
| Entrega automatizada | Publicação de `dist/` como artefato quando todas as validações forem aprovadas. Não há deploy automático nesta etapa. |

## Arquitetura a representar

O diagrama deverá organizar os componentes em camadas compreensíveis para pessoas técnicas e operacionais.

1. **Clientes:** navegador do cliente, PWA instalado, painel de operação e painel administrativo.
2. **Aplicação:** frontend React/Vite, servidor Express, API tRPC, rotas OAuth, serviço de pedidos, fila operacional, serviço de impressão e webhook Asaas.
3. **Persistência e integrações:** Drizzle ORM, MySQL/TiDB, armazenamento compatível com S3, servidor OAuth e Asaas em estado opcional/inativo até ativação controlada.

As conexões devem mostrar que o frontend consome a API tRPC, o servidor persiste dados por Drizzle, o webhook recebe eventos externos de pagamento e o PWA serve somente recursos públicos cacheados. O bloco Asaas deve indicar que cobranças reais dependem de configuração e ativação específicas.

## Fluxo de CI

O workflow ficará em `.github/workflows/ci.yml` na raiz do repositório host, porque o GitHub Actions só reconhece workflows nesse local. Ele deverá executar um único job de validação com Node 22 e pnpm, em sequência:

1. Fazer checkout do código.
2. Configurar Node 22 e pnpm.
3. Instalar dependências em `marmitastb/` usando o lockfile.
4. Rodar `pnpm test`.
5. Rodar `pnpm check`.
6. Rodar `pnpm build`.
7. Enviar `marmitastb/dist/` como artefato apenas quando todas as etapas anteriores concluírem.

O workflow terá permissões de leitura, concorrência por workflow e branch, e não consumirá segredos. O artefato deve ter nome que identifique a aplicação e expirar após período limitado.

## Critérios de aceitação

- [ ] O README contém uma seção de arquitetura com diagrama Mermaid legível no GitHub.
- [ ] O diagrama diferencia clientes, aplicação, persistência, integração externa e limites do cache PWA.
- [ ] O workflow é acionado por `push` e `pull_request` que afetem o projeto ou a definição de CI.
- [ ] O workflow usa instalação pelo lockfile e executa testes, tipos e build em ordem.
- [ ] Falhas em qualquer validação impedem a publicação do artefato.
- [ ] Um build aprovado publica `dist/` como artefato temporário, sem deploy automático e sem segredos.
