import { describe, expect, it } from "vitest";
import { buildPrintTicketHtml, buildPrintTicketText, formatBRL } from "./printTicket";

describe("buildPrintTicketText", () => {
  it("monta uma comanda compacta com itens, endereço e pagamento", () => {
    const ticket = buildPrintTicketText({
      code: "TB-20260817-0007",
      customerName: "Ana",
      customerPhone: "42999990000",
      fulfillmentMethod: "delivery",
      deliveryAddress: "Rua das Flores, 55 · Centro",
      paymentMethod: "pix",
      paymentStatus: "confirmed",
      totalInCents: 3290,
      notes: "Sem cebola",
      items: [{ quantity: 2, productName: "Marmita executiva", unitPriceInCents: 1495, notes: "Caprichar no molho" }],
    });

    expect(ticket).toContain("COMANDA · TB-20260817-0007");
    expect(ticket).toContain("2x Marmita executiva");
    expect(ticket).toContain(`TOTAL: ${formatBRL(3290)}`);
    expect(ticket).toContain("Entrega: Rua das Flores, 55 · Centro");
    expect(ticket).toContain("Pagamento: PIX · confirmado");
  });
});

describe("buildPrintTicketHtml", () => {
  it("preserva o código, o item e o total da comanda em documento imprimível", () => {
    const ticket = buildPrintTicketHtml({
      code: "TB-20260817-0008",
      customerName: "Bruno",
      customerPhone: "42999990001",
      fulfillmentMethod: "pickup",
      paymentMethod: "cash",
      paymentStatus: "pending",
      totalInCents: 2500,
      items: [{ quantity: 1, productName: "Marmita econômica", unitPriceInCents: 2500 }],
    });

    expect(ticket).toContain("TB-20260817-0008");
    expect(ticket).toContain("Marmita econômica");
    expect(ticket).toContain("R$");
    expect(ticket).toContain("@page");
  });
});
