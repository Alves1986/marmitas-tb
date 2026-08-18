// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  trackByPhoneUseQuery: vi.fn(),
  trackedOrder: {
    code: "TB-20260817-0002",
    status: "em_preparo",
    totalInCents: 2890,
    paymentStatus: "confirmed",
    paymentMethod: "pix",
    paymentProvider: "asaas_test",
    fulfillmentMethod: "delivery",
    createdAt: new Date("2026-08-17T15:00:00.000Z"),
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    orders: {
      track: { useQuery: () => ({ data: undefined, isFetching: false, error: null }) },
      trackByPhone: { useQuery: mocks.trackByPhoneUseQuery },
    },
  },
}));

vi.mock("@/components/delivery/PaymentModeNotice", () => ({
  PaymentModeNotice: () => null,
  toPaymentNoticeModeFromProvider: () => "test",
}));

import TrackOrder from "./TrackOrder";

afterEach(() => {
  cleanup();
  mocks.trackByPhoneUseQuery.mockReset();
});

describe("acompanhamento por telefone", () => {
  it("consulta o pedido ativo pelo telefone informado", async () => {
    mocks.trackByPhoneUseQuery.mockImplementation((_input: { phone: string }, options: { enabled: boolean }) => ({
      data: options.enabled ? { order: mocks.trackedOrder, events: [] } : undefined,
      isFetching: false,
      error: null,
    }));

    render(<TrackOrder />);
    fireEvent.change(screen.getByLabelText(/^telefone$/i, { selector: "#track-phone" }), { target: { value: "(42) 99999-9999" } });
    fireEvent.click(screen.getByRole("button", { name: /acompanhar pedido/i }));

    expect(mocks.trackByPhoneUseQuery).toHaveBeenLastCalledWith(
      { phone: "(42) 99999-9999" },
      expect.objectContaining({ enabled: true }),
    );
    expect(await screen.findByText(/^em preparo$/i)).toBeTruthy();
  });

  it("não mostra endereço nem itens na resposta encontrada por telefone", () => {
    mocks.trackByPhoneUseQuery.mockReturnValue({ data: { order: mocks.trackedOrder, events: [] }, isFetching: false, error: null });

    render(<TrackOrder />);

    expect(screen.queryByText(/rua das flores/i)).toBeNull();
    expect(screen.queryByText(/frango grelhado/i)).toBeNull();
  });

  it("informa que o acompanhamento precisa de conexão quando a consulta falha por rede", () => {
    mocks.trackByPhoneUseQuery.mockReturnValue({ data: undefined, isFetching: false, error: new Error("Failed to fetch") });

    render(<TrackOrder />);

    expect(screen.getByRole("alert").textContent).toMatch(/verifique sua conexão/i);
  });
});
