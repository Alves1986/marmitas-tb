export type PrintTicketItem = {
  quantity: number;
  productName: string;
  unitPriceInCents: number;
  notes?: string | null;
};

export type PrintTicketInput = {
  code: string;
  customerName: string;
  customerPhone: string;
  fulfillmentMethod: "delivery" | "pickup";
  deliveryAddress?: string | null;
  paymentMethod: string;
  paymentStatus: string;
  totalInCents: number;
  notes?: string | null;
  items: PrintTicketItem[];
  createdAt?: Date;
};

export function formatBRL(valueInCents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valueInCents / 100);
}

function paymentLabel(method: string): string {
  const labels: Record<string, string> = {
    pix: "PIX",
    credit_card: "Cartão",
    voucher: "Vale-refeição",
    cash: "Dinheiro",
  };
  return labels[method] ?? method;
}

function paymentStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    confirmed: "confirmado",
    pending: "pendente",
    failed: "falhou",
    cancelled: "cancelado",
    refunded: "estornado",
  };
  return labels[status] ?? status;
}

export function buildPrintTicketText(input: PrintTicketInput): string {
  const fulfillment = input.fulfillmentMethod === "delivery" ? "Entrega" : "Retirada";
  const lines = [
    "MARMITAS TB",
    `COMANDA · ${input.code}`,
    "--------------------------------",
    `Cliente: ${input.customerName}`,
    `Telefone: ${input.customerPhone}`,
    ...(input.createdAt ? [`Emissão: ${new Date(input.createdAt).toLocaleString("pt-BR")}`] : []),
    input.fulfillmentMethod === "delivery" && input.deliveryAddress
      ? `Entrega: ${input.deliveryAddress}`
      : "Retirada no balcão",
    "--------------------------------",
    ...input.items.flatMap((item) => [
      `${item.quantity}x ${item.productName} · ${formatBRL(item.unitPriceInCents * item.quantity)}`,
      ...(item.notes ? [`  Obs. item: ${item.notes}`] : []),
    ]),
    ...(input.notes ? [`Obs. pedido: ${input.notes}`] : []),
    "--------------------------------",
    `Modalidade: ${fulfillment}`,
    `Pagamento: ${paymentLabel(input.paymentMethod)} · ${paymentStatusLabel(input.paymentStatus)}`,
    `TOTAL: ${formatBRL(input.totalInCents)}`,
    "Obrigado pela preferência!",
  ];

  return lines.filter(Boolean).join("\n");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

export function buildPrintTicketHtml(input: PrintTicketInput): string {
  const ticketText = escapeHtml(buildPrintTicketText(input));
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Comanda ${escapeHtml(input.code)}</title><style>@page{size:80mm auto;margin:4mm}*{box-sizing:border-box}body{margin:0;color:#000;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.45}pre{margin:0;white-space:pre-wrap;word-break:break-word}@media print{body{width:72mm}}</style></head><body><pre>${ticketText}</pre></body></html>`;
}
