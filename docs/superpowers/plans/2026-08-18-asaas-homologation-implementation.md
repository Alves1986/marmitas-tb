# Homologação segura do Asaas — plano de implementação

> **Para agentes de implementação:** SUB-HABILIDADE OBRIGATÓRIA: use `executing-plans` para executar este plano tarefa a tarefa. Os passos usam caixas de seleção para acompanhamento.

**Objetivo:** Preparar e validar a autenticação da Marmitas TB no Sandbox do Asaas com segredos privados, sem criar cobranças ou habilitar Produção.

**Arquitetura:** Um módulo exclusivo converterá as variáveis de ambiente em uma configuração discriminada: pronta somente para `sandbox`, URL oficial, chave do Sandbox e token de webhook distinto e estruturalmente seguro. O ambiente central e a rota de webhook consumirão essa configuração. Um verificador de conectividade fará somente uma consulta `GET /myAccount/status`, injetando `fetch` para testes determinísticos e sem efeitos financeiros.

**Tecnologias:** TypeScript, Node.js 22, Express 4, tRPC 11, Vitest e Asaas API Sandbox.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `server/services/asaasSandboxConfig.ts` | Validar e expor uma configuração segura e discriminada do Sandbox. |
| `server/services/asaasSandboxConfig.test.ts` | Provar os bloqueios de ambiente, URL e segredos. |
| `server/services/asaasSandboxProbe.ts` | Verificar a autenticação no Sandbox sem criar recursos financeiros. |
| `server/services/asaasSandboxProbe.test.ts` | Provar os contratos HTTP e a ausência de vazamento de segredo. |
| `server/_core/env.ts` | Centralizar a configuração validada do Asaas para o servidor. |
| `server/routers/asaasWebhook.ts` | Obter o token esperado por meio da configuração central. |
| `server/services/asaasSandboxConfig.secret.test.ts` | Verificar, após o cadastro protegido, que o segredo injetado forma uma configuração pronta sem imprimir valores. |
| `docs/operacao/asaas-homologacao.md` | Orientar a operação de Sandbox, a verificação e o cadastro manual do webhook. |

### Task 1: Configuração segura e centralizada do Sandbox

**Files:**
- Create: `server/services/asaasSandboxConfig.ts`
- Create: `server/services/asaasSandboxConfig.test.ts`
- Modify: `server/_core/env.ts`

- [ ] **Step 1: Escrever o teste que falha para uma configuração válida de Sandbox**

```ts
import { describe, expect, it } from "vitest";
import { ASAAS_SANDBOX_API_URL, getAsaasSandboxConfig } from "./asaasSandboxConfig";

describe("getAsaasSandboxConfig", () => {
  const validEnv = {
    ASAAS_ENVIRONMENT: "sandbox",
    ASAAS_API_KEY: "$aact_hmlg_example_key",
    ASAAS_WEBHOOK_TOKEN: "whsec_0123456789abcdef0123456789abcdef",
  };

  it("aceita exclusivamente a configuração completa do Sandbox", () => {
    expect(getAsaasSandboxConfig(validEnv)).toEqual({
      ready: true,
      config: {
        environment: "sandbox",
        baseUrl: ASAAS_SANDBOX_API_URL,
        apiKey: validEnv.ASAAS_API_KEY,
        webhookToken: validEnv.ASAAS_WEBHOOK_TOKEN,
      },
    });
  });
});
```

- [ ] **Step 2: Executar o teste e confirmar a falha esperada**

Run: `pnpm vitest run server/services/asaasSandboxConfig.test.ts`

Expected: falha por não encontrar o módulo `./asaasSandboxConfig`.

- [ ] **Step 3: Implementar a configuração mínima validada**

```ts
export const ASAAS_SANDBOX_API_URL = "https://api-sandbox.asaas.com/v3" as const;

export type AsaasEnvironment = {
  ASAAS_ENVIRONMENT?: string;
  ASAAS_API_URL?: string;
  ASAAS_API_KEY?: string;
  ASAAS_WEBHOOK_TOKEN?: string;
};

export type AsaasSandboxConfig = {
  environment: "sandbox";
  baseUrl: typeof ASAAS_SANDBOX_API_URL;
  apiKey: string;
  webhookToken: string;
};

export type AsaasSandboxConfigResult =
  | { ready: true; config: AsaasSandboxConfig }
  | { ready: false; reason: "invalid_environment" | "invalid_url" | "missing_api_key" | "invalid_api_key" | "invalid_webhook_token" };

function normalizeUrl(value?: string): string {
  return (value ?? ASAAS_SANDBOX_API_URL).replace(/\/+$/, "");
}

function isSandboxApiKey(value: string): boolean {
  return /^\$?aact_hmlg_/.test(value);
}

function isSafeWebhookToken(token: string | undefined, apiKey: string | undefined): token is string {
  return Boolean(token && apiKey && token !== apiKey && token.length >= 32 && token.length <= 255 && !/\s/.test(token));
}

export function getAsaasSandboxConfig(env: AsaasEnvironment): AsaasSandboxConfigResult {
  if (env.ASAAS_ENVIRONMENT !== "sandbox") return { ready: false, reason: "invalid_environment" };
  if (normalizeUrl(env.ASAAS_API_URL) !== ASAAS_SANDBOX_API_URL) return { ready: false, reason: "invalid_url" };
  if (!env.ASAAS_API_KEY) return { ready: false, reason: "missing_api_key" };
  if (!isSandboxApiKey(env.ASAAS_API_KEY)) return { ready: false, reason: "invalid_api_key" };
  if (!isSafeWebhookToken(env.ASAAS_WEBHOOK_TOKEN, env.ASAAS_API_KEY)) return { ready: false, reason: "invalid_webhook_token" };

  return {
    ready: true,
    config: {
      environment: "sandbox",
      baseUrl: ASAAS_SANDBOX_API_URL,
      apiKey: env.ASAAS_API_KEY,
      webhookToken: env.ASAAS_WEBHOOK_TOKEN,
    },
  };
}
```

Atualize `server/_core/env.ts` para importar `getAsaasSandboxConfig` e adicionar `asaas: getAsaasSandboxConfig(process.env)` ao objeto `ENV`.

- [ ] **Step 4: Executar o teste e confirmar a aprovação**

Run: `pnpm vitest run server/services/asaasSandboxConfig.test.ts`

Expected: PASS.

- [ ] **Step 5: Cobrir os bloqueios críticos antes de prosseguir**

Acrescente os casos abaixo ao mesmo arquivo de teste:

```ts
it.each([
  [{ ...validEnv, ASAAS_ENVIRONMENT: "production" }, "invalid_environment"],
  [{ ...validEnv, ASAAS_API_URL: "https://api.asaas.com/v3" }, "invalid_url"],
  [{ ...validEnv, ASAAS_API_KEY: "" }, "missing_api_key"],
  [{ ...validEnv, ASAAS_API_KEY: "$aact_prod_example_key" }, "invalid_api_key"],
  [{ ...validEnv, ASAAS_WEBHOOK_TOKEN: validEnv.ASAAS_API_KEY }, "invalid_webhook_token"],
  [{ ...validEnv, ASAAS_WEBHOOK_TOKEN: "curto" }, "invalid_webhook_token"],
] as const)("bloqueia configuração insegura", (env, reason) => {
  expect(getAsaasSandboxConfig(env)).toEqual({ ready: false, reason });
});
```

Run: `pnpm vitest run server/services/asaasSandboxConfig.test.ts`

Expected: PASS, sem imprimir as variáveis de ambiente.

- [ ] **Step 6: Salvar o marco local**

```bash
git add server/services/asaasSandboxConfig.ts server/services/asaasSandboxConfig.test.ts server/_core/env.ts
git commit -m "feat: valida configuração sandbox do Asaas"
```

### Task 2: Sonda de autenticação sem cobrança

**Files:**
- Create: `server/services/asaasSandboxProbe.ts`
- Create: `server/services/asaasSandboxProbe.test.ts`

- [ ] **Step 1: Escrever o teste que falha para a consulta segura**

```ts
import { describe, expect, it, vi } from "vitest";
import { getAsaasSandboxConfig } from "./asaasSandboxConfig";
import { probeAsaasSandbox } from "./asaasSandboxProbe";

describe("probeAsaasSandbox", () => {
  const configuration = getAsaasSandboxConfig({
    ASAAS_ENVIRONMENT: "sandbox",
    ASAAS_API_KEY: "$aact_hmlg_example_key",
    ASAAS_WEBHOOK_TOKEN: "whsec_0123456789abcdef0123456789abcdef",
  });

  it("consulta somente o status da conta usando cabeçalhos server-side", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    await expect(probeAsaasSandbox(configuration, fetchImpl)).resolves.toEqual({ ok: true, status: 200 });
    expect(fetchImpl).toHaveBeenCalledWith("https://api-sandbox.asaas.com/v3/myAccount/status", {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "marmitas-tb-delivery",
        access_token: "$aact_hmlg_example_key",
      },
      method: "GET",
    });
  });
});
```

- [ ] **Step 2: Executar o teste e confirmar a falha esperada**

Run: `pnpm vitest run server/services/asaasSandboxProbe.test.ts`

Expected: falha por não encontrar o módulo `./asaasSandboxProbe`.

- [ ] **Step 3: Implementar a sonda sem efeitos financeiros**

```ts
import type { AsaasSandboxConfigResult } from "./asaasSandboxConfig";

type FetchResponse = Pick<Response, "ok" | "status">;
export type AsaasFetch = (url: string, init: RequestInit) => Promise<FetchResponse>;

export type AsaasSandboxProbeResult =
  | { ok: true; status: number }
  | { ok: false; reason: "configuration_not_ready" | "authentication_failed" | "request_failed"; status?: number };

export async function probeAsaasSandbox(
  configuration: AsaasSandboxConfigResult,
  fetchImpl: AsaasFetch = fetch,
): Promise<AsaasSandboxProbeResult> {
  if (!configuration.ready) return { ok: false, reason: "configuration_not_ready" };

  try {
    const response = await fetchImpl(`${configuration.config.baseUrl}/myAccount/status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "marmitas-tb-delivery",
        access_token: configuration.config.apiKey,
      },
    });

    return response.ok
      ? { ok: true, status: response.status }
      : { ok: false, reason: "authentication_failed", status: response.status };
  } catch {
    return { ok: false, reason: "request_failed" };
  }
}
```

- [ ] **Step 4: Executar o teste e confirmar a aprovação**

Run: `pnpm vitest run server/services/asaasSandboxProbe.test.ts`

Expected: PASS.

- [ ] **Step 5: Cobrir falhas sem revelar a chave**

```ts
it("retorna falha de autenticação sem incluir a chave da API", async () => {
  const result = await probeAsaasSandbox(configuration, vi.fn().mockResolvedValue({ ok: false, status: 401 }));

  expect(result).toEqual({ ok: false, reason: "authentication_failed", status: 401 });
  expect(JSON.stringify(result)).not.toContain("$aact_hmlg_example_key");
});

it("não chama a rede quando a configuração não está pronta", async () => {
  const fetchImpl = vi.fn();

  await expect(probeAsaasSandbox({ ready: false, reason: "missing_api_key" }, fetchImpl)).resolves.toEqual({
    ok: false,
    reason: "configuration_not_ready",
  });
  expect(fetchImpl).not.toHaveBeenCalled();
});
```

Run: `pnpm vitest run server/services/asaasSandboxProbe.test.ts`

Expected: PASS.

- [ ] **Step 6: Salvar o marco local**

```bash
git add server/services/asaasSandboxProbe.ts server/services/asaasSandboxProbe.test.ts
git commit -m "feat: verifica autenticação do Asaas no sandbox"
```

### Task 3: Token centralizado para o webhook e guarda de segredo injetado

**Files:**
- Modify: `server/routers/asaasWebhook.ts`
- Create: `server/services/asaasSandboxConfig.secret.test.ts`

- [ ] **Step 1: Escrever o teste que falha para a ausência segura de configuração injetada**

```ts
import { expect, it } from "vitest";
import { ENV } from "../_core/env";

it("aceita uma configuração de segredo injetado sem expor valores", () => {
  expect(ENV.asaas.ready).toBe(true);
});
```

- [ ] **Step 2: Executar o teste e confirmar que falha até o formulário seguro receber os valores**

Run: `pnpm vitest run server/services/asaasSandboxConfig.secret.test.ts`

Expected: FAIL enquanto os segredos de Sandbox ainda não foram cadastrados.

- [ ] **Step 3: Centralizar o token do webhook**

Substitua a dependência padrão de `registerAsaasWebhook` por esta implementação:

```ts
import { ENV } from "../_core/env";

export function registerAsaasWebhook(app: Pick<Express, "post">, dependencies?: WebhookDependencies) {
  const expectedToken = ENV.asaas.ready ? ENV.asaas.config.webhookToken : undefined;
  app.post("/api/asaas/webhook", createAsaasWebhookHandler(
    dependencies ?? {
      expectedToken,
      processEvent: processAsaasWebhookEvent,
    },
  ));
}
```

Mantenha a injeção de dependências existente, para que os testes de webhook continuem independentes de segredos reais.

- [ ] **Step 4: Executar os testes de webhook e confirmar que continuam verdes**

Run: `pnpm vitest run server/routers/asaasWebhook.test.ts server/services/asaasWebhookEvent.test.ts`

Expected: PASS.

- [ ] **Step 5: Após cadastrar os segredos, executar a guarda de segredo**

Run: `pnpm vitest run server/services/asaasSandboxConfig.secret.test.ts`

Expected: PASS sem imprimir chave da API ou token no resultado.

- [ ] **Step 6: Salvar o marco local**

```bash
git add server/routers/asaasWebhook.ts server/services/asaasSandboxConfig.secret.test.ts
git commit -m "feat: protege webhook de homologação Asaas"
```

### Task 4: Documentação e contrato de ambiente

**Files:**
- Create: `docs/operacao/asaas-homologacao.md`

- [ ] **Step 1: Registrar o contrato de ambiente sem valores em documentação versionada**

Documente em `docs/operacao/asaas-homologacao.md` os nomes `ASAAS_ENVIRONMENT`, `ASAAS_API_URL`, `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN`, os valores permitidos para as duas primeiras e a classificação privada das duas últimas. O ambiente gerenciado pelo projeto é o único meio permitido para registrar variáveis; arquivos `.env` e `.env.example` não serão criados ou versionados.

- [ ] **Step 2: Documentar a operação sem comandos que exponham segredos**

Inclua em `docs/operacao/asaas-homologacao.md` a sequência: criar conta Sandbox independente; gerar chave nomeada para Marmitas TB Homologação; cadastrar chave e token por cofre de segredos; executar a guarda de segredo; configurar manualmente o webhook HTTPS `/api/asaas/webhook` com os eventos indispensáveis `PAYMENT_CREATED`, `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE` e `PAYMENT_REFUNDED`; testar com dados autorizados; e consultar os logs de webhook do Asaas em caso de erro. A documentação deve declarar explicitamente que não se deve enviar chaves em mensagens, repositórios ou frontend.

- [ ] **Step 3: Verificar que a documentação não contém valores reais nem prefixos de frontend**

Run: `grep -nE 'ASAAS_(API_KEY|WEBHOOK_TOKEN)=[^[:space:]]+|VITE_ASAAS' docs/operacao/asaas-homologacao.md`

Expected: nenhuma credencial literal e nenhuma variável `VITE_ASAAS`.

- [ ] **Step 4: Salvar o marco local**

```bash
git add docs/operacao/asaas-homologacao.md
git commit -m "docs: orienta homologação segura do Asaas"
```

### Task 5: Cadastro protegido, validação integrada e checkpoint

**Files:**
- Modify: `todo.md`
- Verify: `server/services/asaasSandboxConfig.secret.test.ts`

- [ ] **Step 1: Solicitar as credenciais mínimas por formulário seguro**

Solicitar somente `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN`. Informar que a primeira deve ser uma chave `aact_hmlg` gerada na conta Sandbox; a segunda deve ser um valor aleatório distinto, sem espaços e com 32–255 caracteres. Registrar `ASAAS_ENVIRONMENT=sandbox` e `ASAAS_API_URL=https://api-sandbox.asaas.com/v3` como configuração não secreta do servidor.

- [ ] **Step 2: Validar a injeção sem imprimir segredos**

Run: `pnpm vitest run server/services/asaasSandboxConfig.secret.test.ts`

Expected: PASS.

- [ ] **Step 3: Confirmar autenticação no Sandbox sem criar cobrança**

Executar a sonda `GET /myAccount/status` pelo servidor, registrar apenas o código HTTP e o resultado `ok`/`falha`, e não persistir, registrar ou retornar a chave da API. Não alterar `paymentMode` da loja.

- [ ] **Step 4: Rodar a regressão completa**

Run: `pnpm test && pnpm check && pnpm build`

Expected: todas as suítes aprovadas, verificação de tipos sem erro e build de produção concluído.

- [ ] **Step 5: Atualizar o acompanhamento e salvar checkpoint**

Marcar a tarefa de homologação do Asaas como concluída em `todo.md`, revisar o arquivo integralmente e salvar um checkpoint com a descrição da configuração Sandbox sem cobrança real.

## Revisão do plano

| Requisito da especificação | Tarefa que o cobre |
| --- | --- |
| Sandbox apenas, URL oficial e bloqueio de Produção | Task 1 |
| Segredos privados, distintos e sem `VITE_` | Tasks 1, 3 e 4 |
| Consulta sem efeito financeiro | Task 2 |
| Token de webhook centralizado e idempotência preservada | Task 3 |
| Documentação operacional e contrato sem segredos | Task 4 |
| Segredos protegidos, validação e regressão | Task 5 |

Não há itens pendentes, nomes inconsistentes ou marcadores vagos neste plano.
