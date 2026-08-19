# Reorganização da fronteira de funções Vercel Hobby — Plano de implementação

> **Para agentes de implementação:** SUB-HABILIDADE OBRIGATÓRIA: use `subagent-driven-development` (recomendado) ou `executing-plans` para executar este plano tarefa a tarefa. Os passos usam caixas de seleção para acompanhamento.

**Objetivo:** Retirar módulos internos e testes de `api/`, preservando exclusivamente os nove handlers HTTP Vercel e todos os contratos públicos da Marmitas TB.

**Arquitetura:** Os arquivos de entrada Vercel permanecem em `api/` nos mesmos caminhos públicos. Bibliotecas de autenticação, HTTP, configuração, Supabase, pedido e webhook passam para `server/vercel/_lib/`; testes de biblioteca e de handler passam para `server/vercel/`, fora do diretório descoberto como funções. Uma especificação Vitest em `scripts/` bloqueará regressões estruturais ao aceitar somente os nove handlers esperados em `api/`.

**Tecnologias:** TypeScript, Vercel Functions, Supabase JS, Vitest, Vite 7 e pnpm.

---

## Mapa de arquivos e responsabilidades

| Local | Arquivos | Responsabilidade após a alteração |
|---|---|---|
| `api/admin/` | `catalog.ts`, `settings.ts`, `staff.ts` | Entradas HTTP administrativas preservadas. |
| `api/operations/` | `alerts.ts`, `orders.ts`, `printJobs.ts` | Entradas HTTP da operação preservadas. |
| `api/public/` | `menu.ts`, `orders.ts` | Entradas HTTP públicas preservadas. |
| `api/webhooks/` | `asaas.ts` | Entrada HTTP do webhook Asaas preservada. |
| `server/vercel/_lib/` | `asaasWebhookProcessor.ts`, `auth.ts`, `config.ts`, `http.ts`, `orders.ts`, `ordersRepository.ts`, `supabaseAdmin.ts` e seus testes | Domínio, infraestrutura, clientes e testes internos não expostos como funções. |
| `server/vercel/{admin,operations,public,webhooks}/` | Os nove testes dos handlers | Cobertura dos contratos dos handlers, importando as entradas em `api/`. |
| `scripts/vercelFunctionBoundary.test.ts` | Novo teste estrutural | Impede qualquer arquivo adicional dentro de `api/`. |
| `vitest.config.ts` | Configuração existente | Remove padrões de teste sob `api/` e continua cobrindo a suíte sob `server/`. |
| `todo.md` | Registro de tarefas | Marca a consolidação de funções e a movimentação concluídas somente após a validação completa. |

## Contratos que não podem mudar

| Endpoint | Caminho preservado | Contrato preservado |
|---|---|---|
| Cardápio público | `/api/public/menu` | Método, payload, respostas e acesso público. |
| Pedido e rastreamento | `/api/public/orders` | Criação e busca pública por telefone/código. |
| Fila operacional | `/api/operations/orders` | Autorização Supabase de equipe e transições. |
| Alertas operacionais | `/api/operations/alerts` | Autorização Supabase e reconhecimento de alertas. |
| Impressão operacional | `/api/operations/printJobs` | Fila, baixa e reimpressão com autoria UUID. |
| Catálogo administrativo | `/api/admin/catalog` | Autorização de administrador e CRUD de cardápio. |
| Equipe administrativa | `/api/admin/staff` | Autorização de administrador e gestão de papéis. |
| Configurações administrativas | `/api/admin/settings` | Leitura e atualização auditada de configurações. |
| Webhook Asaas | `/api/webhooks/asaas` | Token, bloqueio sem credenciais e idempotência transacional. |

### Tarefa 1: Criar a proteção automatizada da fronteira Vercel

**Arquivos:**
- Criar: `scripts/vercelFunctionBoundary.test.ts`
- Testar: `scripts/vercelFunctionBoundary.test.ts`

- [ ] **Passo 1: Escrever o teste estrutural que define os únicos arquivos aceitos em `api/`.**

```ts
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiRoot = path.join(projectRoot, "api");

async function listTypeScriptFiles(directory: string, relativeDirectory = ""): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async entry => {
      const relativePath = path.join(relativeDirectory, entry.name);
      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) return listTypeScriptFiles(absolutePath, relativePath);
      return entry.isFile() && entry.name.endsWith(".ts") ? [relativePath] : [];
    }),
  );

  return files.flat().sort();
}

describe("fronteira de funções Vercel", () => {
  it("mantém somente os nove handlers HTTP em api", async () => {
    await expect(listTypeScriptFiles(apiRoot)).resolves.toEqual([
      "admin/catalog.ts",
      "admin/settings.ts",
      "admin/staff.ts",
      "operations/alerts.ts",
      "operations/orders.ts",
      "operations/printJobs.ts",
      "public/menu.ts",
      "public/orders.ts",
      "webhooks/asaas.ts",
    ]);
  });
});
```

- [ ] **Passo 2: Executar o teste e confirmar a falha esperada.**

```bash
pnpm exec vitest run scripts/vercelFunctionBoundary.test.ts
```

Resultado esperado: falha de igualdade, listando os módulos de `api/_lib/` e os arquivos `*.test.ts` atualmente presentes sob `api/`. A falha demonstra que a proteção detecta exatamente o motivo do limite Vercel.

- [ ] **Passo 3: Não alterar nenhum handler nesta tarefa.**

O teste deve permanecer vermelho até que a movimentação descrita nas tarefas 2 e 3 seja concluída. Não introduzir aliases TypeScript, funções curinga, reescritas Vercel, variáveis de ambiente ou mudanças de payload.

- [ ] **Passo 4: Registrar o estado vermelho no histórico de execução, sem commit isolado.**

Anotar a saída do comando no relatório da execução. O commit ocorrerá somente após o teste estrutural e a suíte inteira ficarem verdes, para evitar um estado intermediário que não compila.

### Tarefa 2: Mover bibliotecas e testes para fora de `api/`

**Arquivos:**
- Mover: `api/_lib/asaasWebhookProcessor.ts` e `api/_lib/asaasWebhookProcessor.test.ts` para `server/vercel/_lib/`
- Mover: `api/_lib/auth.ts` e `api/_lib/auth.test.ts` para `server/vercel/_lib/`
- Mover: `api/_lib/config.ts` e `api/_lib/config.test.ts` para `server/vercel/_lib/`
- Mover: `api/_lib/http.ts` e `api/_lib/http.test.ts` para `server/vercel/_lib/`
- Mover: `api/_lib/orders.ts`, `api/_lib/orders.test.ts` e `api/_lib/ordersRepository.ts` para `server/vercel/_lib/`
- Mover: `api/_lib/supabaseAdmin.ts`, `api/_lib/supabaseAdmin.test.ts`, `api/_lib/supabaseAdmin.live.test.ts` e `api/_lib/supabasePublicConfig.live.test.ts` para `server/vercel/_lib/`
- Mover: `api/admin/{catalog,settings,staff}.test.ts` para `server/vercel/admin/`
- Mover: `api/operations/{alerts,orders,printJobs}.test.ts` para `server/vercel/operations/`
- Mover: `api/public/{menu,orders}.test.ts` para `server/vercel/public/`
- Mover: `api/webhooks/asaas.test.ts` para `server/vercel/webhooks/`
- Modificar: `server/vercel/_lib/orders.ts`
- Modificar: `server/vercel/_lib/ordersRepository.ts`
- Testar: testes sob `server/vercel/_lib/`

- [ ] **Passo 1: Criar os diretórios de destino e mover os arquivos com preservação de histórico.**

```bash
mkdir -p server/vercel/_lib server/vercel/admin server/vercel/operations server/vercel/public server/vercel/webhooks
git mv api/_lib/asaasWebhookProcessor.ts api/_lib/asaasWebhookProcessor.test.ts server/vercel/_lib/
git mv api/_lib/auth.ts api/_lib/auth.test.ts server/vercel/_lib/
git mv api/_lib/config.ts api/_lib/config.test.ts server/vercel/_lib/
git mv api/_lib/http.ts api/_lib/http.test.ts server/vercel/_lib/
git mv api/_lib/orders.ts api/_lib/orders.test.ts api/_lib/ordersRepository.ts server/vercel/_lib/
git mv api/_lib/supabaseAdmin.ts api/_lib/supabaseAdmin.test.ts api/_lib/supabaseAdmin.live.test.ts api/_lib/supabasePublicConfig.live.test.ts server/vercel/_lib/
git mv api/admin/catalog.test.ts api/admin/settings.test.ts api/admin/staff.test.ts server/vercel/admin/
git mv api/operations/alerts.test.ts api/operations/orders.test.ts api/operations/printJobs.test.ts server/vercel/operations/
git mv api/public/menu.test.ts api/public/orders.test.ts server/vercel/public/
git mv api/webhooks/asaas.test.ts server/vercel/webhooks/
```

- [ ] **Passo 2: Executar os testes movidos e confirmar a falha transitória de resolução de imports.**

```bash
pnpm exec vitest run server/vercel/_lib server/vercel/admin server/vercel/operations server/vercel/public server/vercel/webhooks
```

Resultado esperado: falha de resolução para imports que ainda apontam a caminhos anteriores, como `./catalog` em testes movidos ou `../_lib/auth` em handlers ainda não atualizados. Não alterar expectativas de resposta dos testes.

- [ ] **Passo 3: Ajustar os dois imports relativos que pertencem à biblioteca movida.**

Em `server/vercel/_lib/orders.ts`, substituir:

```ts
import { canTransitionOrderStatus, type OrderStatus } from "../../shared/operations";
```

por:

```ts
import { canTransitionOrderStatus, type OrderStatus } from "../../../shared/operations";
```

Em `server/vercel/_lib/ordersRepository.ts`, substituir:

```ts
import type { CreatePublicOrderInput, PublicOrderConfirmation, PublicTrackingOrder } from "../public/orders";
```

por:

```ts
import type { CreatePublicOrderInput, PublicOrderConfirmation, PublicTrackingOrder } from "../../../api/public/orders";
```

- [ ] **Passo 4: Preservar os imports co-localizados das bibliotecas e de seus testes.**

Manter `./asaasWebhookProcessor`, `./auth`, `./config`, `./http`, `./orders` e `./supabaseAdmin` nos testes internos, pois módulo e teste são movidos juntos para o mesmo diretório. Não alterar lógica de autenticação, clientes Supabase, esquemas Zod ou processamento Asaas.

### Tarefa 3: Atualizar handlers e testes para a nova fronteira

**Arquivos:**
- Modificar: `api/admin/catalog.ts`, `api/admin/settings.ts`, `api/admin/staff.ts`
- Modificar: `api/operations/alerts.ts`, `api/operations/orders.ts`, `api/operations/printJobs.ts`
- Modificar: `api/public/menu.ts`, `api/public/orders.ts`
- Modificar: `api/webhooks/asaas.ts`
- Modificar: `server/vercel/admin/{catalog,settings,staff}.test.ts`
- Modificar: `server/vercel/operations/{alerts,orders,printJobs}.test.ts`
- Modificar: `server/vercel/public/{menu,orders}.test.ts`
- Modificar: `server/vercel/webhooks/asaas.test.ts`
- Testar: testes de handler em `server/vercel/`

- [ ] **Passo 1: Atualizar cada handler para importar a biblioteca interna pelo novo caminho.**

Nos nove handlers, substituir todo import iniciado em `"../_lib/` pelo equivalente iniciado em `"../../server/vercel/_lib/`. As substituições concretas são:

```ts
// api/admin/catalog.ts, api/admin/settings.ts e api/admin/staff.ts
from "../_lib/auth"          // para "../../server/vercel/_lib/auth"
from "../_lib/http"          // para "../../server/vercel/_lib/http"
from "../_lib/supabaseAdmin" // para "../../server/vercel/_lib/supabaseAdmin"

// api/operations/alerts.ts e api/operations/printJobs.ts
from "../_lib/auth"          // para "../../server/vercel/_lib/auth"
from "../_lib/http"          // para "../../server/vercel/_lib/http"
from "../_lib/supabaseAdmin" // para "../../server/vercel/_lib/supabaseAdmin"

// api/operations/orders.ts
from "../_lib/auth"          // para "../../server/vercel/_lib/auth"
from "../_lib/http"          // para "../../server/vercel/_lib/http"
from "../_lib/orders"        // para "../../server/vercel/_lib/orders"
from "../_lib/supabaseAdmin" // para "../../server/vercel/_lib/supabaseAdmin"

// api/public/menu.ts
from "../_lib/http"          // para "../../server/vercel/_lib/http"
from "../_lib/supabaseAdmin" // para "../../server/vercel/_lib/supabaseAdmin"

// api/public/orders.ts
from "../_lib/http"             // para "../../server/vercel/_lib/http"
from "../_lib/orders"           // para "../../server/vercel/_lib/orders"
from "../_lib/ordersRepository" // para "../../server/vercel/_lib/ordersRepository"

// api/webhooks/asaas.ts
from "../_lib/asaasWebhookProcessor" // para "../../server/vercel/_lib/asaasWebhookProcessor"
from "../_lib/http"                  // para "../../server/vercel/_lib/http"
from "../_lib/supabaseAdmin"         // para "../../server/vercel/_lib/supabaseAdmin"
```

Manter inalterado o import de `../../shared/operations` em `api/operations/orders.ts`, pois esse arquivo não mudou de diretório.

- [ ] **Passo 2: Atualizar os imports de handlers nos testes movidos.**

Aplicar os caminhos abaixo, preservando os imports `../_lib/auth` nos testes que usam `ApiAuthError`, pois `server/vercel/{admin,operations}` continua irmão de `server/vercel/_lib`.

```ts
// server/vercel/admin/{catalog,settings,staff}.test.ts
import { createAdminCatalogHandler } from "../../../api/admin/catalog";
import { createAdminSettingsHandler } from "../../../api/admin/settings";
import { createAdminStaffHandler } from "../../../api/admin/staff";

// server/vercel/operations/{alerts,orders,printJobs}.test.ts
import { createOperationsAlertsHandler } from "../../../api/operations/alerts";
import { createOperationsOrdersHandler } from "../../../api/operations/orders";
import { createPrintJobsHandler } from "../../../api/operations/printJobs";

// server/vercel/public/{menu,orders}.test.ts
import { createMenuHandler } from "../../../api/public/menu";
import { createPublicOrdersHandler } from "../../../api/public/orders";

// server/vercel/webhooks/asaas.test.ts
import { createAsaasWebhookHandler, createConfiguredAsaasWebhookHandler } from "../../../api/webhooks/asaas";
```

- [ ] **Passo 3: Executar os testes de bibliotecas e handlers e confirmar que voltaram a verde.**

```bash
pnpm exec vitest run server/vercel/_lib server/vercel/admin server/vercel/operations server/vercel/public server/vercel/webhooks
pnpm exec vitest run scripts/vercelFunctionBoundary.test.ts
```

Resultado esperado: todos os testes direcionados aprovados, inclusive a igualdade exata dos nove arquivos de `api/`. Nenhum teste deve ser reescrito para acomodar mudança de payload, status ou autorização.

- [ ] **Passo 4: Revisar a árvore final de `api/`.**

```bash
find api -type f -name "*.ts" | sort
```

Resultado esperado:

```text
api/admin/catalog.ts
api/admin/settings.ts
api/admin/staff.ts
api/operations/alerts.ts
api/operations/orders.ts
api/operations/printJobs.ts
api/public/menu.ts
api/public/orders.ts
api/webhooks/asaas.ts
```

### Tarefa 4: Atualizar a descoberta Vitest e realizar a validação completa

**Arquivos:**
- Modificar: `vitest.config.ts`
- Modificar: `todo.md`
- Testar: toda a suíte, tipos, build e fronteira Vercel

- [ ] **Passo 1: Retirar de `vitest.config.ts` os padrões de testes sob `api/`.**

Remover exatamente as duas entradas abaixo do array `test.include`:

```ts
"api/**/*.test.ts",
"api/**/*.spec.ts",
```

Manter os padrões `server/**/*.test.ts` e `server/**/*.spec.ts`: eles já incluem os testes recém-movidos para `server/vercel/` sem duplicar globs. Preservar todos os padrões de `client/`, `shared/` e `scripts/`.

- [ ] **Passo 2: Confirmar que a descoberta inclui a nova localização.**

```bash
pnpm exec vitest list server/vercel
```

Resultado esperado: a lista contém testes de `_lib`, `admin`, `operations`, `public` e `webhooks` em `server/vercel/`.

- [ ] **Passo 3: Executar a validação completa em ordem.**

```bash
pnpm test
pnpm check
pnpm build
git diff --check
```

Resultado esperado: a suíte mantém a quantidade anterior de testes aprovados, com os dois testes de integração ao vivo intencionalmente pulados; a checagem TypeScript, o build de produção e a revisão de espaços do Git terminam sem erro.

- [ ] **Passo 4: Confirmar a contagem da Vercel por um teste independente do build.**

```bash
test "$(find api -type f -name "*.ts" | wc -l | tr -d ' ')" = "9"
! find api -type f \( -name "*.test.ts" -o -name "*.spec.ts" \) | grep -q .
! test -d api/_lib
```

Resultado esperado: todos os comandos retornam código `0`. Isso confirma a presença de nove entradas e a ausência de testes e biblioteca no diretório de funções.

- [ ] **Passo 5: Atualizar `todo.md` somente após todas as verificações verdes.**

Marcar como concluídas, sem apagar histórico, as duas linhas abaixo:

```md
- [x] Consolidar os endpoints Vercel em até 12 funções serverless compatíveis com o plano Hobby, preservando os contratos HTTP existentes.
- [x] Mover bibliotecas e testes internos para fora de `api/`, mantendo apenas os nove handlers HTTP Vercel nesse diretório.
```

### Tarefa 5: Registrar a mudança sem implantar

**Arquivos:**
- Modificar: somente os arquivos já alterados pelas tarefas 1 a 4.
- Verificar: `todo.md`, status Git, remoto dedicado e checkpoint WebDev.

- [ ] **Passo 1: Revisar o registro de tarefas e o diff final.**

```bash
cat todo.md
git status --short
git diff --check
git remote -v
```

Resultado esperado: os dois itens de reorganização estão marcados como concluídos, não há arquivos `api/_lib/**`, e o remoto usado para Marmitas TB é exclusivamente `github` apontando a `https://github.com/Alves1986/marmitas-tb.git`.

- [ ] **Passo 2: Salvar checkpoint WebDev da reorganização validada.**

Criar checkpoint com uma descrição que registre: nove funções de entrada preservadas, bibliotecas e testes fora de `api/`, testes/tipos/build aprovados e nenhuma implantação realizada.

- [ ] **Passo 3: Registrar e enviar o commit ao repositório dedicado.**

```bash
git add api server/vercel scripts/vercelFunctionBoundary.test.ts vitest.config.ts todo.md docs/superpowers
git commit -m "refactor: move internal modules out of api for Vercel Hobby"
git push github feat/supabase-vercel-migration
```

Resultado esperado: somente a branch `feat/supabase-vercel-migration` do repositório privado `Alves1986/marmitas-tb` recebe o commit. Não usar `Alves1986/ministral` e não conectar nem disparar uma implantação Vercel nesta tarefa.

- [ ] **Passo 4: Comunicar o estado e solicitar autorização separada para uma prévia.**

Informar a versão de checkpoint, o hash do commit e as evidências de validação. A conexão do repositório à Vercel, qualquer Preview e qualquer publicação em produção permanecem bloqueadas até uma autorização explícita posterior.

## Critérios de aceite

- [ ] `api/` possui exatamente nove arquivos TypeScript, todos handlers HTTP listados neste documento.
- [ ] Nenhum arquivo está sob `api/_lib/` e nenhum `*.test.ts` ou `*.spec.ts` permanece em `api/`.
- [ ] Os nove caminhos HTTP, métodos, autenticação Supabase, mensagens de erro e payloads permanecem inalterados.
- [ ] `pnpm test`, `pnpm check`, `pnpm build` e `git diff --check` aprovam.
- [ ] O commit é enviado exclusivamente ao repositório dedicado `Alves1986/marmitas-tb` na branch de migração.
- [ ] Nenhuma nova conexão Vercel, Preview ou publicação é realizada nesta etapa.

## Documentos relacionados

- Especificação aprovada: `docs/superpowers/specs/2026-08-18-vercel-hobby-function-boundary-design.md`
- Notas de homologação: `docs/vercel-homologation-notes.md`
