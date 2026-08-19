import { getAsaasSandboxConfig, type AsaasEnvironment } from "../../services/asaasSandboxConfig.js";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type AsaasSandboxPixPaymentInput = {
  orderCode: string;
  customer: {
    name: string;
    phone: string;
  };
  totalInCents: number;
};

export type CreateAsaasSandboxPixPaymentDependencies = {
  environment: AsaasEnvironment;
  input: AsaasSandboxPixPaymentInput;
  fetch?: FetchLike;
  dueDate?: () => string;
};

export type AsaasSandboxPixPaymentResult =
  | { available: false }
  | {
      available: true;
      paymentId: string;
      paymentUrl: string;
    };

type AsaasCustomer = { id?: unknown };
type AsaasCustomerList = { data?: AsaasCustomer[] };
type AsaasPayment = { id?: unknown; invoiceUrl?: unknown };

function createBrazilDueDate(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = new Map(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}`;
}

function asaasHeaders(apiKey: string): HeadersInit {
  return {
    "content-type": "application/json",
    access_token: apiKey,
  };
}

async function readAsaasJson<T>(response: Response, failureMessage: string): Promise<T> {
  if (!response.ok) throw new Error(failureMessage);
  return response.json() as Promise<T>;
}

function customerReference(phone: string): string {
  return `marmitas-tb:${phone}`;
}

function requireIdentifier(value: unknown, failureMessage: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(failureMessage);
  return value;
}

function requireSandboxInvoiceUrl(value: unknown): string {
  const invoiceUrl = requireIdentifier(value, "O Asaas Sandbox não retornou o link da cobrança.");
  try {
    const parsed = new URL(invoiceUrl);
    if (parsed.protocol !== "https:" || parsed.hostname !== "sandbox.asaas.com") {
      throw new Error();
    }
  } catch {
    throw new Error("O Asaas Sandbox retornou um link de cobrança inválido.");
  }
  return invoiceUrl;
}

export async function createAsaasSandboxPixPayment(
  dependencies: CreateAsaasSandboxPixPaymentDependencies,
): Promise<AsaasSandboxPixPaymentResult> {
  const config = getAsaasSandboxConfig(dependencies.environment);
  if (!config.ready) return { available: false };
  if (!Number.isInteger(dependencies.input.totalInCents) || dependencies.input.totalInCents <= 0) {
    throw new Error("O total do pedido não permite emitir uma cobrança Pix.");
  }

  const request = dependencies.fetch ?? globalThis.fetch;
  const headers = asaasHeaders(config.config.apiKey);
  const reference = customerReference(dependencies.input.customer.phone);
  const encodedReference = encodeURIComponent(reference);
  const customerList = await readAsaasJson<AsaasCustomerList>(
    await request(`${config.config.baseUrl}/customers?externalReference=${encodedReference}`, { headers }),
    "Não foi possível localizar o pagador no Asaas Sandbox.",
  );

  let customerId = customerList.data?.[0]?.id;
  if (typeof customerId !== "string" || !customerId.trim()) {
    const customer = await readAsaasJson<AsaasCustomer>(
      await request(`${config.config.baseUrl}/customers`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: dependencies.input.customer.name,
          mobilePhone: dependencies.input.customer.phone,
          externalReference: reference,
          notificationDisabled: true,
        }),
      }),
      "Não foi possível cadastrar o pagador no Asaas Sandbox.",
    );
    customerId = requireIdentifier(customer.id, "O Asaas Sandbox não retornou o identificador do pagador.");
  }

  const payment = await readAsaasJson<AsaasPayment>(
    await request(`${config.config.baseUrl}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: customerId,
        billingType: "PIX",
        value: dependencies.input.totalInCents / 100,
        dueDate: (dependencies.dueDate ?? createBrazilDueDate)(),
        description: `Pedido Marmitas TB ${dependencies.input.orderCode}`,
        externalReference: dependencies.input.orderCode,
      }),
    }),
    "Não foi possível emitir a cobrança Pix no Asaas Sandbox.",
  );

  return {
    available: true,
    paymentId: requireIdentifier(payment.id, "O Asaas Sandbox não retornou o identificador da cobrança."),
    paymentUrl: requireSandboxInvoiceUrl(payment.invoiceUrl),
  };
}
