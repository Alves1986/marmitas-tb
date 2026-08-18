// @vitest-environment happy-dom
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ markPrintJob: vi.fn() }));

vi.mock("@/lib/runtimeConfig", () => ({ isVercelRuntime: () => true }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ operations: { list: { invalidate: vi.fn() }, printJobs: { invalidate: vi.fn() } } }),
    operations: {
      list: { useQuery: () => ({ data: [], isLoading: false, error: null }) },
      printJobs: { useQuery: () => ({ data: [] }) },
      transition: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      markPrintJob: { useMutation: () => ({ mutate: vi.fn() }) },
      queuePrint: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
  },
}));
vi.mock("@/services/browserPrint", () => ({ printReceipt: vi.fn() }));
vi.mock("@/services/operationsService", () => ({
  vercelOperationsService: {
    listOrders: vi.fn().mockResolvedValue([{
      id: "8f2c5c62-a27d-49ef-a6d6-d1db97002631", code: "TB-0001", customerName: "Ana", customerPhone: "42999990000",
      fulfillmentMethod: "pickup", deliveryAddress: null, customerNotes: null, totalInCents: 2990,
      status: "confirmado", paymentMethod: "pix", paymentStatus: "confirmed", acknowledgedAt: null,
      createdAt: "2026-08-18T22:00:00.000Z", items: [{ productName: "Marmita", quantity: 1, unitPriceInCents: 2990, notes: null }],
    }]),
    listPrintJobs: vi.fn().mockResolvedValue([{ id: "print-1", order_id: "8f2c5c62-a27d-49ef-a6d6-d1db97002631", status: "queued", orders: { code: "TB-0001" } }]),
    transitionOrder: vi.fn(), requeuePrint: vi.fn(), markPrintJob: mocks.markPrintJob,
  },
}));

import { OrderQueue } from "./OrderQueue";

describe("OrderQueue no runtime Vercel", () => {
  it("exibe a falha de baixa da impressão ao operador", async () => {
    mocks.markPrintJob.mockRejectedValueOnce(new Error("Impressora indisponível"));
    render(<OrderQueue />);

    await waitFor(() => expect(mocks.markPrintJob).toHaveBeenCalledWith("print-1", "printed", "Navegador do posto"));
    expect(await screen.findByText("Impressora indisponível")).toBeTruthy();
  });
});
