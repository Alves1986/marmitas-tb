import { describe, expect, it } from "vitest";
import { createLocalOrderService, createVercelOrderService } from "./orderService";

describe("local order service", () => {
  it("confirms a delivery order through the standard payload contract", async () => {
    const service = createLocalOrderService({
      now: () => new Date("2026-08-17T15:30:00.000Z"),
      createOrderNumber: () => "TB-2841",
    });

    const confirmation = await service.submit({
      id: "local-order-1",
      createdAt: "2026-08-17T15:30:00.000Z",
      deliveryMode: "delivery",
      customer: {
        name: "Ana Oliveira",
        phone: "(42) 99999-0000",
        address: "Rua Exemplo, 100",
        neighborhood: "Centro",
        reference: "Portão azul",
        paymentMethod: "card",
        changeFor: "",
      },
      items: [],
      summary: { subtotal: 0, savings: 0, deliveryFee: 0, total: 0 },
    });

    expect(confirmation).toEqual({
      orderNumber: "TB-2841",
      estimatedTime: "35 a 50 min",
      submittedAt: "2026-08-17T15:30:00.000Z",
    });
  });

  it("uses the pickup estimate for orders collected at the store", async () => {
    const service = createLocalOrderService({
      now: () => new Date("2026-08-17T15:30:00.000Z"),
      createOrderNumber: () => "TB-2842",
    });

    const confirmation = await service.submit({
      id: "local-order-2",
      createdAt: "2026-08-17T15:30:00.000Z",
      deliveryMode: "pickup",
      customer: {
        name: "Caio Lima",
        phone: "(42) 98888-0000",
        address: "",
        neighborhood: "",
        reference: "",
        paymentMethod: "cash",
        changeFor: "50",
      },
      items: [],
      summary: { subtotal: 0, savings: 0, deliveryFee: 0, total: 0 },
    });

    expect(confirmation.estimatedTime).toBe("15 a 25 min");
  });
});

describe("Vercel order service", () => {
  it("resolve os identificadores estáticos do carrinho pelo cardápio público antes de enviar o pedido", async () => {
    let submittedBody: unknown;
    const service = createVercelOrderService({
      request: async (_path, options) => {
        submittedBody = options.body;
        return { orderNumber: "TB-20260819-TESTE", estimatedTime: "15 a 25 min", submittedAt: "2026-08-19T20:00:00.000Z" };
      },
      loadMenu: async () => ({
        products: [{
          id: "39d49829-9a02-4e97-b19c-602582131771",
          name: "Panqueca de carne + Coca 200 ml",
          options: [
            { id: "56ee2e8e-649b-4aa1-9c1f-f8efa3e547d7", groupName: "Escolha a embalagem", label: "Isopor" },
            { id: "f58bd94f-98a9-4246-b6b5-75436419e425", groupName: "Acompanhamento", label: "Batata frita" },
          ],
        }],
      }),
    });

    await service.submit({
      id: "local-order-static-ids",
      createdAt: "2026-08-19T20:00:00.000Z",
      deliveryMode: "pickup",
      customer: { name: "Homologação Marmitas TB", phone: "42999990000", address: "", neighborhood: "", reference: "", paymentMethod: "pix", changeFor: "" },
      items: [{
        id: "panqueca-coca::package:foam|side:fries",
        productId: "panqueca-coca",
        name: "Panqueca de carne + Coca 200 ml",
        unitPrice: 23,
        quantity: 1,
        selections: [
          { groupId: "package", groupLabel: "Escolha a embalagem", optionId: "foam", optionLabel: "Isopor" },
          { groupId: "side", groupLabel: "Acompanhamento", optionId: "fries", optionLabel: "Batata frita" },
        ],
        note: "HOMOLOGAÇÃO",
      }],
      summary: { subtotal: 23, savings: 0, deliveryFee: 0, total: 23 },
    });

    expect(submittedBody).toMatchObject({
      fulfillmentMethod: "pickup",
      paymentMethod: "pix",
      items: [{
        productId: "39d49829-9a02-4e97-b19c-602582131771",
        optionIds: ["56ee2e8e-649b-4aa1-9c1f-f8efa3e547d7", "f58bd94f-98a9-4246-b6b5-75436419e425"],
      }],
    });
  });

  it("converte o contrato atual do checkout e usa a confirmação do servidor", async () => {
    const request = async (_path: string, options: { body?: unknown }) => {
      expect(options.body).toMatchObject({ fulfillmentMethod: "delivery", paymentMethod: "credit_card" });
      return { orderNumber: "TB-20260818-A1B2C3", estimatedTime: "35 a 45 min", submittedAt: "2026-08-18T18:00:00.000Z", paymentStatus: "pending", isTestPayment: true };
    };
    const service = createVercelOrderService({ request });
    const confirmation = await service.submit({ id: "local-order-3", createdAt: "2026-08-18T18:00:00.000Z", deliveryMode: "delivery", customer: { name: "Ana", phone: "42999991234", address: "Rua 1", neighborhood: "Centro", reference: "Portão", paymentMethod: "card", changeFor: "" }, items: [{ id: "1", productId: "19c4f23b-1e6d-4ca1-8e62-c44876fc65f2", name: "Marmita", unitPrice: 20, quantity: 1, selections: [], note: "" }], summary: { subtotal: 20, savings: 0, deliveryFee: 5, total: 25 } });
    expect(confirmation.orderNumber).toBe("TB-20260818-A1B2C3");
  });
});
