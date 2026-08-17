// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  storeSettings: { paymentMode: "asaas" as "test" | "asaas" },
  trackedOrder: {
    code: "TB-20260817-0001",
    status: "confirmado",
    paymentProvider: "asaas",
    paymentStatus: "confirmed",
    paymentMethod: "pix",
    fulfillmentMethod: "pickup",
    deliveryAddress: null,
    totalInCents: 2590,
  },
}));

vi.mock("@/contexts/OrderContext", () => ({
  useOrder: () => ({
    items: [],
    summary: { subtotal: 0, deliveryFee: 0, total: 0 },
    deliveryMode: "pickup",
    checkoutDraft: { name: "Maria", phone: "42999999999", address: "", neighborhood: "", reference: "", paymentMethod: "cash", changeFor: "" },
    setCheckoutDraft: vi.fn(),
  }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    orders: {
      create: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      confirmTestPayment: { useMutation: () => ({ mutateAsync: vi.fn() }) },
      track: { useQuery: () => ({ data: { order: mocks.trackedOrder, events: [] }, isFetching: false }) },
    },
    store: { publicSettings: { useQuery: () => ({ data: mocks.storeSettings }) } },
  },
}));

import { CheckoutFlow } from "./CheckoutFlow";
import { CheckoutSuccess } from "./CheckoutSuccess";
import TrackOrder from "@/pages/TrackOrder";

afterEach(cleanup);

describe("avisos de modo de pagamento nos fluxos públicos", () => {
  it("mostra o aviso oficial no checkout conforme a configuração pública da loja", async () => {
    render(<CheckoutFlow onBack={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    await screen.findByText(/retirada no local/i);
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    expect(await screen.findByText(/pagamento oficial ativo/i)).toBeTruthy();
  });

  it("mostra o aviso oficial na confirmação conforme o resultado do pedido", () => {
    render(<CheckoutSuccess confirmation={{ orderNumber: "TB-20260817-0001", trackingCode: "TB-20260817-0001", paymentReference: "pay_12345678", paymentStatus: "confirmed", isTestPayment: false, estimatedTime: "20 min", submittedAt: new Date().toISOString() }} items={[]} summary={{ subtotal: 0, deliveryFee: 0, total: 0, savings: 0 }} deliveryMode="pickup" onClose={vi.fn()} />);

    expect(screen.getByText(/pagamento oficial ativo/i)).toBeTruthy();
  });

  it("mostra o aviso oficial no acompanhamento conforme o provedor persistido", () => {
    render(<TrackOrder />);

    expect(screen.getByText(/pagamento oficial ativo/i)).toBeTruthy();
  });
});
