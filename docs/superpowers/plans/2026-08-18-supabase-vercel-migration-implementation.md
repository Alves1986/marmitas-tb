# Migração da Marmitas TB para Supabase e Vercel — Plano de Implementação

> **Para agentes de implementação:** HABILIDADE OBRIGATÓRIA: use `executing-plans` para executar tarefa por tarefa. Os passos usam caixas de seleção para acompanhamento.

**Objetivo:** Tornar a Marmitas TB independente da infraestrutura atual, usando Supabase para OTP, Postgres, RLS e Storage, além de Vite e funções TypeScript na Vercel para frontend, domínio, pedidos, operação e webhooks.

**Arquitetura:** O frontend Vite continuará sendo um SPA/PWA. Funções em `api/` serão sem estado, verificam JWT Supabase e concentram operações privilegiadas, incluindo pedidos, transições, Asaas e impressão. O Supabase Postgres preservará as entidades e regras de negócio, com RLS para defesa em profundidade; o navegador usará exclusivamente a URL e a chave publicável.

**Tecnologias:** React 19, TypeScript, Vite 7, Vitest, Zod, `@supabase/supabase-js`, Supabase Auth/Postgres/Storage, Vercel Functions e GitHub Actions.

---

## Estrutura de arquivos alvo

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/20260818120000_initial_marmitas_tb.sql` | Esquema Postgres, perfis, papéis, índices, RLS e funções RPC atômicas. |
| `supabase/migrations/20260818121000_storage_catalogo.sql` | Bucket e políticas de Storage para o catálogo. |
| `api/_lib/config.ts` | Leitura e validação de variáveis server-side, sem serializar segredos. |
| `api/_lib/supabaseAdmin.ts` | Cliente Supabase com `service_role`, exclusivo das funções. |
| `api/_lib/auth.ts` | Verificação de JWT, perfil e guardas `requireStaff`/`requireAdmin`. |
| `api/_lib/http.ts` | CORS, JSON, erros seguros e resposta HTTP padronizada. |
| `api/_lib/orders.ts` | Serviços puros: validações, total, telefone, código e transições. |
| `api/public/*.ts` | Catálogo, configurações públicas, criação e acompanhamento de pedidos. |
| `api/operations/*.ts` | Fila, status, alertas e jobs de impressão, protegidos por papel. |
| `api/admin/*.ts` | Cardápio, equipe, configurações e Storage administrativo. |
| `api/webhooks/asaas.ts` | Webhook autenticado e idempotente em Sandbox. |
| `client/src/lib/supabase.ts` | Cliente publicável do navegador. |
| `client/src/contexts/SupabaseAuthContext.tsx` | Sessão OTP, perfil, logout e estado de autenticação. |
| `client/src/lib/api.ts` | Cliente tipado HTTP para as funções Vercel. |
| `client/src/pages/TeamLogin.tsx` | Solicitação e confirmação de código OTP da equipe. |
| `vercel.json` | Reescritas SPA e exclusão de `/api` da reescrita estática. |
| `.env.example`, `README.md`, `docs/operacao/*` | Contrato de ambiente, conexão das plataformas e procedimentos operacionais. |

### Task 1: Preparar configuração Vercel e dependências de Supabase

**Files:**
- Create: `vercel.json`
- Create: `api/_lib/config.ts`
- Create: `api/_lib/config.test.ts`
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Escrever os testes de configuração que devem falhar**

```ts
import { describe, expect, it } from "vitest";
import { readServerConfig } from "./config";

describe("readServerConfig", () => {
  it("aceita apenas configuração server-side completa", () => {
    expect(readServerConfig({
      SUPABASE_URL: "https://abc.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      APP_URL: "https://marmitas-tb.vercel.app",
    })).toMatchObject({ appUrl: "https://marmitas-tb.vercel.app" });
  });

  it("recusa chaves e URLs ausentes", () => {
    expect(() => readServerConfig({ SUPABASE_URL: "https://abc.supabase.co" }))
      .toThrow("SUPABASE_SERVICE_ROLE_KEY");
  });
});
```

- [ ] **Step 2: Executar o teste para confirmar a falha**

Run: `pnpm vitest run api/_lib/config.test.ts`  
Expected: FAIL porque `api/_lib/config.ts` ainda não existe.

- [ ] **Step 3: Adicionar as dependências e arquivos mínimos**

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.49.8"
  }
}
```

```json
{
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```

```ts
// api/_lib/config.ts
export type ServerConfig = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  appUrl: string;
};

export function readServerConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "APP_URL"] as const;
  for (const key of required) {
    if (!env[key]?.trim()) throw new Error(`Variável obrigatória ausente: ${key}`);
  }
  if (!env.SUPABASE_URL!.startsWith("https://") || !env.SUPABASE_URL!.endsWith(".supabase.co")) {
    throw new Error("SUPABASE_URL inválida.");
  }
  return {
    supabaseUrl: env.SUPABASE_URL!,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY!,
    appUrl: env.APP_URL!,
  };
}
```

Inclua `.env.local`, `.env.*.local` e `.vercel` no `.gitignore`. Liste somente nomes vazios em `.env.example`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`, `ASAAS_ENVIRONMENT`, `ASAAS_API_URL`, `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN`.

- [ ] **Step 4: Executar os testes e as verificações de projeto**

Run: `pnpm vitest run api/_lib/config.test.ts && pnpm check`  
Expected: PASS sem nenhuma variável sensível no resultado.

- [ ] **Step 5: Registrar o marco**

```bash
git add package.json pnpm-lock.yaml vercel.json api/_lib/config.ts api/_lib/config.test.ts .env.example .gitignore
git commit -m "chore: prepare Supabase and Vercel configuration"
```

### Task 2: Criar esquema Postgres, perfis e políticas RLS no Supabase

**Files:**
- Create: `supabase/migrations/20260818120000_initial_marmitas_tb.sql`
- Create: `supabase/migrations/20260818121000_storage_catalogo.sql`
- Create: `supabase/tests/initial_marmitas_tb.sql`
- Create: `supabase/README.md`

- [ ] **Step 1: Escrever os testes SQL de segurança antes da migração**

```sql
begin;
select plan(12);
select ok((select relrowsecurity from pg_class where oid = 'public.orders'::regclass), 'orders usa RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles usa RLS');
select is_empty('select * from public.orders', 'anon não lê pedidos');
select is_empty('select * from public.print_jobs', 'anon não lê a fila de impressão');
select * from finish();
rollback;
```

- [ ] **Step 2: Aplicar os testes em um projeto Supabase de desenvolvimento para confirmar a falha**

Run: `supabase test db --local`  
Expected: FAIL até que as tabelas, RLS e políticas existam.

- [ ] **Step 3: Implementar o SQL de esquema e autorização**

Crie tipos `app_role`, `order_status`, `payment_method`, `payment_provider`, `payment_status` e `print_job_status`. Crie `profiles` com `id uuid primary key references auth.users(id) on delete cascade`, `role app_role not null default 'user'`, e crie `categories`, `products`, `product_options`, `orders`, `order_items`, `order_events`, `payment_events`, `print_jobs` e `store_settings` com os campos do esquema atual.

Use `bigint generated by default as identity` nos identificadores internos, `timestamptz not null default now()` nas datas e `jsonb` em `order_items.configuration_json` e `payment_events.payload_json`. Preserve os índices de pedido abaixo:

```sql
create unique index orders_code_unique on public.orders (code);
create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_phone_lookup_created_idx on public.orders (customer_phone_lookup, created_at desc);
create unique index payment_events_provider_event_unique
  on public.payment_events (provider, external_event_id);
create index print_jobs_status_created_idx on public.print_jobs (status, created_at);
```

Após criar cada tabela, execute:

```sql
revoke all on table public.orders from anon, authenticated;
alter table public.orders enable row level security;
```

Crie `is_staff_or_admin()` e `is_admin()` como funções `stable security definer set search_path = ''` que comparam o papel do perfil ao `auth.uid()`. Aplique `select` anônimo somente a categorias e produtos ativos; não crie política direta para `orders`, `order_events`, `payment_events`, `print_jobs` ou `store_settings`. A camada server-side usa `service_role` e continua impondo as guardas de papel.

Crie bucket `catalogo` e permita `select` público em objetos; permita `insert`, `update` e `delete` somente quando `public.is_admin()` for verdadeiro.

- [ ] **Step 4: Executar os testes de banco e inspecionar privilégios**

Run: `supabase db reset && supabase test db --local`  
Expected: PASS; leitura anônima de `orders` e `print_jobs` continua vazia ou recusada.

- [ ] **Step 5: Registrar o marco**

```bash
git add supabase/migrations supabase/tests supabase/README.md
git commit -m "feat: add Supabase schema and RLS policies"
```

### Task 3: Implementar Supabase Auth por OTP e perfis da equipe

**Files:**
- Create: `client/src/lib/supabase.ts`
- Create: `client/src/contexts/SupabaseAuthContext.tsx`
- Create: `client/src/contexts/SupabaseAuthContext.test.tsx`
- Create: `client/src/pages/TeamLogin.tsx`
- Create: `api/admin/staff.ts`
- Create: `api/admin/staff.test.ts`
- Modify: `client/src/main.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/_core/hooks/useAuth.ts`

- [ ] **Step 1: Escrever os testes de OTP, sessão e provisionamento**

```tsx
it("pede OTP com cadastro automático desabilitado", async () => {
  render(<SupabaseAuthProvider><TeamLogin /></SupabaseAuthProvider>);
  await userEvent.type(screen.getByLabelText("E-mail"), "equipe@marmitastb.com.br");
  await userEvent.click(screen.getByRole("button", { name: "Enviar código" }));
  expect(mockSignInWithOtp).toHaveBeenCalledWith(expect.objectContaining({
    email: "equipe@marmitastb.com.br",
    options: expect.objectContaining({ shouldCreateUser: false }),
  }));
});

it("recusa a criação de colaborador quando o solicitante não é admin", async () => {
  await expect(provisionStaff(nonAdminRequest, { email: "novo@tb.com", role: "staff" }))
    .rejects.toMatchObject({ statusCode: 403 });
});
```

- [ ] **Step 2: Confirmar a falha inicial**

Run: `pnpm vitest run client/src/contexts/SupabaseAuthContext.test.tsx api/admin/staff.test.ts`  
Expected: FAIL porque o provider e a função administrativa ainda não existem.

- [ ] **Step 3: Implementar cliente, provider, tela e função administrativa**

```ts
// client/src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true } },
);
```

O `SupabaseAuthProvider` deve ouvir `onAuthStateChange`, carregar `profiles` via função protegida e expor `{ user, profile, loading, requestOtp, verifyOtp, logout }`. `requestOtp` deve chamar `signInWithOtp` com `shouldCreateUser: false`; `verifyOtp` deve aceitar o código de seis dígitos e chamar `verifyOtp({ email, token, type: 'email' })`.

A função `api/admin/staff.ts` deve usar `supabaseAdmin.auth.admin.createUser({ email, email_confirm: true })` somente depois de `requireAdmin`, inserir/atualizar `profiles` e nunca retornar tokens, chave de serviço ou objeto bruto de Auth. A alteração de papel deve atualizar `profiles.role` e exigir novo token na sessão do colaborador.

Substitua o conteúdo de `useAuth.ts` por um adaptador ao contexto Supabase, mantendo a forma usada pelos componentes: `user`, `loading`, `isAuthenticated`, `logout` e `refresh`. Registre o provider em `main.tsx` e direcione `/entrar-equipe` para `TeamLogin`.

- [ ] **Step 4: Rodar testes e checagem de tipos**

Run: `pnpm vitest run client/src/contexts/SupabaseAuthContext.test.tsx api/admin/staff.test.ts && pnpm check`  
Expected: PASS; mensagens de erro não revelam se um e-mail ainda não foi provisionado.

- [ ] **Step 5: Registrar o marco**

```bash
git add client/src/lib/supabase.ts client/src/contexts client/src/pages/TeamLogin.tsx client/src/main.tsx client/src/App.tsx client/src/_core/hooks/useAuth.ts api/admin/staff.ts api/admin/staff.test.ts
git commit -m "feat: replace Manus OAuth with Supabase OTP"
```

### Task 4: Criar infraestrutura de funções Vercel e contratos HTTP

**Files:**
- Create: `api/_lib/supabaseAdmin.ts`
- Create: `api/_lib/auth.ts`
- Create: `api/_lib/auth.test.ts`
- Create: `api/_lib/http.ts`
- Create: `api/_lib/http.test.ts`
- Create: `api/_lib/orders.ts`
- Create: `api/_lib/orders.test.ts`
- Create: `client/src/lib/api.ts`
- Create: `client/src/lib/api.test.ts`

- [ ] **Step 1: Escrever testes de guardas e respostas HTTP**

```ts
it("requireStaff aceita staff e admin, mas bloqueia user", async () => {
  await expect(requireStaff(requestFor("user"))).rejects.toMatchObject({ statusCode: 403 });
  await expect(requireStaff(requestFor("staff"))).resolves.toMatchObject({ role: "staff" });
  await expect(requireStaff(requestFor("admin"))).resolves.toMatchObject({ role: "admin" });
});

it("responde erro público sem incluir segredo ou stack", () => {
  const response = jsonError(500, new Error("SUPABASE_SERVICE_ROLE_KEY=secret"));
  expect(response.body).toEqual({ error: "Erro interno." });
});
```

- [ ] **Step 2: Confirmar a falha inicial**

Run: `pnpm vitest run api/_lib/auth.test.ts api/_lib/http.test.ts api/_lib/orders.test.ts`  
Expected: FAIL até criar os módulos.

- [ ] **Step 3: Implementar guardas, SDK administrativo e domínio puro**

`supabaseAdmin.ts` deve criar um único cliente por módulo com `createClient(readServerConfig().supabaseUrl, readServerConfig().supabaseServiceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })`. `auth.ts` deve extrair o Bearer token, chamar `auth.getUser(token)`, buscar `profiles` e exportar `requireUser`, `requireStaff` e `requireAdmin`.

`http.ts` deve exportar `readJson`, `json`, `jsonError`, `methodNotAllowed` e `handle`. Todas as funções devem permitir apenas os métodos declarados, validar corpo com Zod e devolver `{ error: string }` sem stack.

`orders.ts` deve receber os schemas `createOrderInput`, `trackingInput`, `phoneTrackingInput` e conter `normalizePhoneForLookup`, `createTemporaryOrderCode`, `buildOrderCode` e `assertTransition`. Não importe Express, cookies Manus ou tRPC.

`client/src/lib/api.ts` deve usar `fetch`, JSON e `supabase.auth.getSession()` para incluir `Authorization: Bearer <access_token>` somente quando houver sessão. Em respostas não-2xx, deve lançar `ApiError` com o texto público devolvido pela função.

- [ ] **Step 4: Executar a infraestrutura isolada**

Run: `pnpm vitest run api/_lib client/src/lib/api.test.ts && pnpm check`  
Expected: PASS; nenhum teste precisa de chave real.

- [ ] **Step 5: Registrar o marco**

```bash
git add api/_lib client/src/lib/api.ts client/src/lib/api.test.ts
git commit -m "feat: add Vercel function infrastructure"
```

### Task 5: Migrar catálogo e pedidos públicos para funções e Postgres

**Files:**
- Create: `api/public/catalog.ts`
- Create: `api/public/settings.ts`
- Create: `api/public/orders.ts`
- Create: `api/public/tracking.ts`
- Create: `api/public/catalog.test.ts`
- Create: `api/public/orders.test.ts`
- Create: `api/public/tracking.test.ts`
- Modify: `client/src/pages/Home.tsx`
- Modify: `client/src/components/delivery/CheckoutFlow.tsx`
- Modify: `client/src/components/delivery/CheckoutSuccess.tsx`
- Modify: `client/src/components/delivery/ProductCatalog.tsx`
- Modify: `client/src/pages/TrackOrder.tsx`

- [ ] **Step 1: Escrever testes de pedido e rastreamento público**

```ts
it("cria pedido em transação e retorna apenas dados de confirmação", async () => {
  const result = await createPublicOrder(validDeliveryInput, fakeSupabase);
  expect(result).toMatchObject({ code: expect.stringMatching(/^TB-/), orderStatus: "aguardando_pagamento" });
  expect(result).not.toHaveProperty("customerPhone");
});

it("exige código e telefone normalizado para rastreamento detalhado", async () => {
  await expect(trackOrder({ code: "TB-000001", phone: "999" }, fakeSupabase)).rejects.toMatchObject({ statusCode: 400 });
});
```

- [ ] **Step 2: Confirmar a falha inicial**

Run: `pnpm vitest run api/public/catalog.test.ts api/public/orders.test.ts api/public/tracking.test.ts`  
Expected: FAIL porque os handlers não existem.

- [ ] **Step 3: Implementar os handlers públicos**

`catalog.ts` consulta apenas categorias e produtos ativos, ordenados por `sort_order`. `settings.ts` expõe somente `payment_mode`. `orders.ts` valida preços e total no servidor, cria pedido, itens e eventos via RPC SQL transacional `create_order`, delega pagamento ao adaptador já bloqueado em Sandbox e retorna `{ id, code, paymentReference, paymentStatus, orderStatus, totalInCents }`.

`tracking.ts` precisa oferecer duas consultas: código+telefone retorna somente dados necessários do pedido e eventos; telefone sozinho retorna somente o pedido ativo mais recente, sem endereço, nome, valor de pagamento ou payload de evento. Use `customer_phone_lookup` sempre normalizado e nunca faça busca por telefone sem ao menos oito dígitos.

Substitua as chamadas públicas de `trpc.*` nos componentes pelos métodos de `client/src/lib/api.ts`. Remova `client/src/lib/trpc.ts` somente quando nenhuma página depender dele.

- [ ] **Step 4: Executar testes de unidade e regressão de checkout**

Run: `pnpm vitest run api/public client/src/pages --reporter=dot && pnpm check`  
Expected: PASS; o carrinho continua em `localStorage` e nenhum dado de pedido aparece no navegador além da confirmação.

- [ ] **Step 5: Registrar o marco**

```bash
git add api/public client/src/lib/api.ts client/src/pages/Home.tsx client/src/components/delivery/CheckoutFlow.tsx client/src/components/delivery/CheckoutSuccess.tsx client/src/components/delivery/ProductCatalog.tsx client/src/pages/TrackOrder.tsx
git commit -m "feat: move public ordering flows to Vercel functions"
```

### Task 6: Migrar operação, administração, impressão e Storage

**Files:**
- Create: `api/operations/orders.ts`
- Create: `api/operations/print-jobs.ts`
- Create: `api/operations/orders.test.ts`
- Create: `api/operations/print-jobs.test.ts`
- Create: `api/admin/catalog.ts`
- Create: `api/admin/settings.ts`
- Create: `api/admin/storage.ts`
- Create: `api/admin/catalog.test.ts`
- Create: `api/admin/settings.test.ts`
- Create: `api/admin/storage.test.ts`
- Modify: `client/src/pages/Operations.tsx`
- Modify: `client/src/pages/Admin.tsx`
- Modify: `client/src/components/delivery/OrderActions.tsx`
- Modify: `client/src/components/delivery/PaymentModeNotice.tsx`

- [ ] **Step 1: Escrever testes de autorização e efeitos operacionais**

```ts
it("staff pode mover pedido por transição válida, mas não gerencia catálogo", async () => {
  await expect(transitionOrder(staffRequest, { orderId: 1, nextStatus: "em_preparo" })).resolves.toMatchObject({ status: "em_preparo" });
  await expect(upsertCatalog(staffRequest, validProduct)).rejects.toMatchObject({ statusCode: 403 });
});

it("a marcação de impressão atualiza apenas job queued", async () => {
  await expect(markPrintJob(staffRequest, { printJobId: 2, status: "printed" })).resolves.toMatchObject({ status: "printed" });
  await expect(markPrintJob(staffRequest, { printJobId: 3, status: "printed" })).rejects.toMatchObject({ statusCode: 409 });
});
```

- [ ] **Step 2: Confirmar a falha inicial**

Run: `pnpm vitest run api/operations api/admin`  
Expected: FAIL porque as funções protegidas ainda não existem.

- [ ] **Step 3: Implementar handlers protegidos e RPCs de domínio**

Em `api/operations`, use `requireStaff` para listar pedidos operacionais, fazer transições permitidas, reconhecer alerta, consultar/registrar jobs de impressão e aplicar reimpressão. Cada alteração deve inserir `order_events` com o `profile.id` do ator.

Em `api/admin`, use `requireAdmin` para CRUD do catálogo, opções, disponibilidade, equipe e configurações. `storage.ts` deve validar MIME (`image/jpeg`, `image/png`, `image/webp`), tamanho máximo de 5 MB e nome opaco antes de usar `supabaseAdmin.storage.from('catalogo')`. Nenhuma rota deve aceitar URL remota arbitrária como upload.

Atualize `/operacao` e `/admin` para usar `api.ts`, tratar `401`/`403` com retorno ao login e manter polling leve de pedidos/jobs. A impressão continua local no navegador do quiosque; a função apenas persiste o estado do job.

- [ ] **Step 4: Executar testes, tipos e revisão visual**

Run: `pnpm vitest run api/operations api/admin client/src/pages && pnpm check`  
Expected: PASS; staff não acessa a tela administrativa e admin não recebe segredos no payload.

- [ ] **Step 5: Registrar o marco**

```bash
git add api/operations api/admin client/src/pages/Operations.tsx client/src/pages/Admin.tsx client/src/components/delivery/OrderActions.tsx client/src/components/delivery/PaymentModeNotice.tsx
git commit -m "feat: migrate operations and admin to Supabase backend"
```

### Task 7: Migrar o webhook Asaas e preservar bloqueio de Sandbox

**Files:**
- Create: `api/webhooks/asaas.ts`
- Create: `api/webhooks/asaas.test.ts`
- Modify: `server/services/asaasSandboxConfig.ts`
- Modify: `server/services/asaasSandboxProbe.ts`
- Modify: `docs/operacao/asaas-homologacao.md`

- [ ] **Step 1: Escrever testes de autenticação e idempotência do webhook**

```ts
it("recusa webhook sem token dedicado", async () => {
  const response = await asaasWebhook(request({ headers: {} }));
  expect(response.status).toBe(401);
});

it("grava o evento Asaas uma única vez e libera pedido confirmado", async () => {
  await asaasWebhook(validWebhookRequest("evt_1"));
  await asaasWebhook(validWebhookRequest("evt_1"));
  expect(fakeSupabase.paymentEvents).toHaveLength(1);
  expect(fakeSupabase.printJobs).toHaveLength(1);
});
```

- [ ] **Step 2: Confirmar a falha inicial**

Run: `pnpm vitest run api/webhooks/asaas.test.ts`  
Expected: FAIL porque o handler Vercel não existe.

- [ ] **Step 3: Implementar o handler sem habilitar pagamento real**

O handler aceita somente `POST`, compara `asaas-access-token` em tempo seguro ao token server-side, valida o payload e chama a RPC transacional `process_asaas_event`. A RPC deve garantir unicidade por `(provider, external_event_id)`, atualizar pedido apenas uma vez, criar evento operacional e enfileirar impressão quando necessário.

Conserve `ASAAS_ENVIRONMENT=sandbox` e bloqueie qualquer valor de produção em `asaasSandboxConfig.ts`. Sem `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN`, a criação de cobrança e a sonda externa devem falhar antes de abrir conexão HTTP. Não adicione chaves neste plano.

- [ ] **Step 4: Executar a cobertura de segurança**

Run: `pnpm vitest run api/webhooks/asaas.test.ts server/services/asaasSandboxConfig.test.ts server/services/asaasSandboxProbe.test.ts`  
Expected: PASS; pagamento oficial permanece indisponível sem segredos.

- [ ] **Step 5: Registrar o marco**

```bash
git add api/webhooks server/services/asaasSandboxConfig.ts server/services/asaasSandboxProbe.ts docs/operacao/asaas-homologacao.md
git commit -m "feat: move Asaas webhook to Vercel function"
```

### Task 8: Remover dependências da infraestrutura atual e adicionar migração de dados reversível

**Files:**
- Create: `scripts/export-current-mysql.mjs`
- Create: `scripts/import-supabase.mjs`
- Create: `scripts/verify-supabase-import.mjs`
- Create: `scripts/README.md`
- Modify: `package.json`
- Modify: `README.md`
- Delete: `server/_core/oauth.ts`
- Delete: `server/_core/context.ts`
- Delete: `server/_core/trpc.ts`
- Delete: `server/routers.ts`
- Delete: `server/db.ts`
- Delete: `client/src/lib/trpc.ts`

- [ ] **Step 1: Escrever testes de exportação sem dados pessoais em logs**

```ts
it("exporta entidades em ordem de dependência e não registra telefone", async () => {
  const result = await exportCurrentDatabase(fakeMySql);
  expect(result.tables).toEqual(["users", "categories", "products", "productOptions", "orders", "orderItems", "orderEvents", "paymentEvents", "printJobs", "storeSettings"]);
  expect(result.logText).not.toContain("44999999999");
});
```

- [ ] **Step 2: Confirmar a falha inicial**

Run: `pnpm vitest run scripts/export-current-mysql.test.ts scripts/import-supabase.test.ts`  
Expected: FAIL até que scripts e testes existam.

- [ ] **Step 3: Implementar exportação, importação e verificação**

`export-current-mysql.mjs` deve usar `DATABASE_URL` somente localmente, exportar JSON para `tmp/marmitas-tb-export-<timestamp>.json`, mascarar campos pessoais no log e sair com erro se o arquivo estiver dentro de diretório versionado. `import-supabase.mjs` deve exigir `SUPABASE_SERVICE_ROLE_KEY`, inserir em ordem de dependência, preservar códigos de pedido e validar duplicatas. `verify-supabase-import.mjs` deve comparar somente contagens, códigos e integridade referencial; não deve imprimir endereços, telefones ou payloads de pagamento.

Adicione os scripts `data:export`, `data:import` e `data:verify` ao `package.json`. Antes de excluir os módulos antigos, confirme por `grep` que não restam importações de tRPC, Drizzle MySQL, cookies Manus ou `server/_core/oauth` no cliente/servidor de produção.

- [ ] **Step 4: Executar regressão completa após a remoção**

Run: `pnpm test && pnpm check && pnpm build`  
Expected: PASS sem pacote `mysql2`, `drizzle-orm/mysql2`, `@trpc/*` ou OAuth Manus no build final.

- [ ] **Step 5: Registrar o marco**

```bash
git add scripts package.json README.md server client
git rm server/_core/oauth.ts server/_core/context.ts server/_core/trpc.ts server/routers.ts server/db.ts client/src/lib/trpc.ts
git commit -m "refactor: remove legacy managed backend dependencies"
```

### Task 9: Conectar projetos existentes, configurar Preview e validar sem publicar

**Files:**
- Modify: `README.md`
- Modify: `.github/workflows/ci.yml`
- Modify: `docs/operacao/asaas-homologacao.md`
- Create: `docs/operacao/supabase-vercel-homologacao.md`

- [ ] **Step 1: Escrever checklist verificável de homologação**

```markdown
- [ ] Projeto Supabase conectado e migrations aplicadas em Preview.
- [ ] `VITE_SUPABASE_URL` e chave publicável disponíveis somente no build.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` disponível somente em funções Vercel.
- [ ] URL `*.vercel.app` e URLs de Preview autorizadas no Supabase Auth.
- [ ] OTP de e-mail bloqueia e-mail não provisionado.
- [ ] RLS bloqueia leitura anônima de pedidos e impressão.
- [ ] Asaas continua em Sandbox, sem chave nem token configurados.
```

- [ ] **Step 2: Validar localmente sem contas externas**

Run: `pnpm test && pnpm check && pnpm build`  
Expected: PASS; `pnpm build` não inclui `SUPABASE_SERVICE_ROLE_KEY`, `ASAAS_API_KEY` ou `ASAAS_WEBHOOK_TOKEN` nos arquivos de `dist`.

- [ ] **Step 3: Conectar Supabase e Vercel somente após solicitação de confirmação**

Habilite os conectores existentes e selecione os projetos corretos. Configure Preview antes de Produção. No Supabase, aplique as migrations, crie o bucket e habilite OTP por e-mail; em Auth URL Configuration, cadastre a URL `vercel.app` do projeto e os padrões de Preview. Na Vercel, importe o repositório `Alves1986/ministral`, defina `marmitastb/` como Root Directory, configure instalação `pnpm install --frozen-lockfile` e build `pnpm build`, e registre as variáveis por ambiente sem valores em arquivos.

- [ ] **Step 4: Executar aceitação de Preview sem publicar Produção**

Verifique: catálogo público; carrinho persistente; OTP de e-mail para perfil provisionado; bloqueio a e-mail não provisionado; fila de operação por staff; administração por admin; rastreamento com dados reduzidos; retorno 401 no webhook sem token; e bloqueio da criação de cobrança Asaas sem chaves. Capture os resultados em `docs/operacao/supabase-vercel-homologacao.md` sem credenciais ou dados pessoais.

- [ ] **Step 5: Atualizar CI e registrar o marco**

Modifique `.github/workflows/ci.yml` para executar `pnpm test`, `pnpm check`, `pnpm build`, auditoria que falha se encontrar `SUPABASE_SERVICE_ROLE_KEY` ou chaves Asaas no `dist`, e upload do artefato `dist`. Em seguida:

```bash
git add README.md .github/workflows/ci.yml docs/operacao
git commit -m "docs: add Supabase and Vercel staging guide"
```

## Validação final e checkpoint

- [ ] Execute `pnpm test`, `pnpm check` e `pnpm build` após todas as tarefas.
- [ ] Execute `git diff --check` e confirme que nenhuma variável secreta foi incluída.
- [ ] Leia `todo.md`, mantenha pendências de chave Asaas explicitamente não concluídas e marque apenas itens entregues.
- [ ] Salve um checkpoint antes de solicitar qualquer deploy.
- [ ] Nunca publique na Vercel sem nova confirmação explícita do proprietário.
