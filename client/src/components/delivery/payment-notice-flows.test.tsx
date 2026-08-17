// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  storeSettings: { paymentMode: "asaas" as "test" | "asaas" },
  createOrder: vi.fn().mockResolvedValue({ code: "TB-20260817-0002", paymentReference: "test_TB-20260817-0002_1" }),
  confirmTestPayment: vi.fn().mockResolvedValue({ order: {} }),
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
      create: { useMutation: () => ({ mutateAsync: mocks.createOrder }) },
      confirmTestPayment: { useMutation: () => ({ mutateAsync: mocks.confirmTestPayment }) },
      track: { useQuery: () => ({ data: { order: mocks.trackedOrder, events: [] }, isFetching: false }) },
    },
    store: { publicSettings: { useQuery: () => ({ data: mocks.storeSettings }) } },
  },
}));

import { CheckoutFlow } from "./CheckoutFlow";
import { CheckoutSuccess } from "./CheckoutSuccess";
import TrackOrder from "@/pages/TrackOrder";

afterEach(() => {
  cleanup();
  mocks.createOrder.mockClear();
  mocks.confirmTestPayment.mockClear();
});

describe("avisos de modo de pagamento nos fluxos públicos", () => {
  it("mostra o aviso oficial no checkout conforme a configuração pública da loja", async () => {
    render(<CheckoutFlow onBack={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    await screen.findByText(/retirada no local/i);
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));

    expect(await screen.findByText(/pagamento oficial ativo/i)).toBeTruthy();
  });

  it("permite selecionar PIX e o identifica na revisão do pedido", async () => {
    render(<CheckoutFlow onBack={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    await screen.findByText(/retirada no local/i);
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    const pix = await screen.findByRole("button", { name: /pix/i });
    fireEvent.click(pix);
    expect(pix.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    expect(await screen.findByText(/retirada no local · PIX/i)).toBeTruthy();
  });

  it.each([
    ["PIX", "pix"],
    ["Cartão", "credit_card"],
    ["Voucher alimentação", "voucher"],
  ] as const)("envia %s ao adaptador simulado como %s", async (label, paymentMethod) => {
    render(<CheckoutFlow onBack={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    await screen.findByText(/retirada no local/i);
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    fireEvent.click(await screen.findByRole("button", { name: new RegExp(label, "i") }));
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }));
    fireEvent.click(await screen.findByRole("button", { name: /confirmar pedido/i }));

    await vi.waitFor(() => expect(mocks.createOrder).toHaveBeenCalledWith(expect.objectContaining({ paymentMethod })));
    expect(mocks.confirmTestPayment).toHaveBeenCalledWith(expect.objectContaining({ paymentReference: "test_TB-20260817-0002_1" }));
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
