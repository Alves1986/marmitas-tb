import { describe, expect, it } from "vitest";
import * as ordersRepository from "./ordersRepository.js";

const { buildOwnAppUnifiedOrderPayload } = ordersRepository;

describe("adaptador OWN_APP", () => {
  it("constrói um comando unificado com origem e chave idempotente preservadas", () => {
    const payload = buildOwnAppUnifiedOrderPayload({
      code: "TB-20260826-CORE",
      sourceChannel: "OWN_APP",
      idempotencyKey: "b2a5f4d8-9a4d-4d66-b1a9-9aa5f93c9241",
      customer: { name: "Ana", phone: "42999991234", address: "", notes: "" },
      customerPhoneLookup: "42999991234",
      fulfillmentMethod: "pickup",
      paymentMethod: "pix",
      orderItems: [{ productId: "19c4f23b-1e6d-4ca1-8e62-c44876fc65f2", productName: "Marmita", unitPriceInCents: 2000, quantity: 1, configuration: [], note: "" }],
    });

    expect(payload).toMatchObject({
      sourceChannel: "OWN_APP",
      idempotencyKey: "b2a5f4d8-9a4d-4d66-b1a9-9aa5f93c9241",
      subtotalInCents: 2000,
      totalInCents: 2000,
      status: "aguardando_pagamento",
      paymentProvider: "asaas_test",
    });
  });
});

describe("adaptador KIOSK", () => {
  it("cria pedido de retirada confirmado para a demonstração sem abrir cobrança real", () => {
    const buildKioskUnifiedOrderPayload = Reflect.get(ordersRepository, "buildKioskUnifiedOrderPayload") as undefined | ((input: {
      code: string;
      idempotencyKey: string;
      displayName?: string;
      paymentMethod: "pix" | "card";
      orderItems: Array<{ productId: string; productName: string; unitPriceInCents: number; quantity: number; configuration: []; note: string }>;
    }) => unknown);
    expect(buildKioskUnifiedOrderPayload).toBeTypeOf("function");
    if (!buildKioskUnifiedOrderPayload) return;

    const payload = buildKioskUnifiedOrderPayload({
      code: "TB-20260826-KIOSK",
      idempotencyKey: "b2a5f4d8-9a4d-4d66-b1a9-9aa5f93c9241",
      displayName: "Anderson",
      paymentMethod: "card",
      orderItems: [{ productId: "19c4f23b-1e6d-4ca1-8e62-c44876fc65f2", productName: "Marmita", unitPriceInCents: 2000, quantity: 1, configuration: [], note: "" }],
    });

    expect(payload).toMatchObject({
      sourceChannel: "KIOSK",
      fulfillmentMethod: "pickup",
      totalInCents: 2000,
      status: "confirmado",
      paymentMethod: "credit_card",
      paymentStatus: "confirmed",
      paymentProvider: "asaas_test",
    });
  });
});

describe("adaptador COUNTER", () => {
  it("constrói uma venda presencial confirmada sem integrar cobrança externa", () => {
    const buildCounterUnifiedOrderPayload = Reflect.get(ordersRepository, "buildCounterUnifiedOrderPayload") as undefined | ((input: {
      code: string;
      idempotencyKey: string;
      displayName?: string;
      paymentMethod: "cash" | "pix" | "debit_card" | "credit_card" | "voucher";
      orderItems: Array<{ productId: string; productName: string; unitPriceInCents: number; quantity: number; configuration: []; note: string }>;
    }) => unknown);
    expect(buildCounterUnifiedOrderPayload).toBeTypeOf("function");
    if (!buildCounterUnifiedOrderPayload) return;

    const payload = buildCounterUnifiedOrderPayload({
      code: "TB-20260827-COUNTER",
      idempotencyKey: "b2a5f4d8-9a4d-4d66-b1a9-9aa5f93c9241",
      displayName: "Anderson",
      paymentMethod: "debit_card",
      orderItems: [{ productId: "19c4f23b-1e6d-4ca1-8e62-c44876fc65f2", productName: "Marmita", unitPriceInCents: 2500, quantity: 1, configuration: [], note: "" }],
    });

    expect(payload).toMatchObject({
      sourceChannel: "COUNTER",
      fulfillmentMethod: "pickup",
      totalInCents: 2500,
      status: "confirmado",
      paymentMethod: "debit_card",
      paymentStatus: "confirmed",
      paymentProvider: "counter_record",
    });
  });
});
