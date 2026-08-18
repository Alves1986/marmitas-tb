import { describe, expect, it, vi } from "vitest";
import { createVercelTrackingService } from "./trackingService";

describe("adaptador de acompanhamento Vercel", () => {
  it("consulta o pedido ativo pelo telefone informado", async () => {
    const request = vi.fn().mockResolvedValue({ code: "TB-20260818-A1B2C3", status: "em_preparo" });
    const service = createVercelTrackingService({ request });

    await expect(service.byPhone("(42) 99999-1234")).resolves.toMatchObject({ status: "em_preparo" });
    expect(request).toHaveBeenCalledWith("/api/public/orders?phone=%2842%29+99999-1234");
  });

  it("exige telefone junto ao código no acompanhamento específico", async () => {
    const request = vi.fn().mockResolvedValue({ code: "TB-20260818-A1B2C3", status: "em_preparo" });
    const service = createVercelTrackingService({ request });

    await service.byCode("tb-20260818-a1b2c3", "42999991234");
    expect(request).toHaveBeenCalledWith("/api/public/orders?code=TB-20260818-A1B2C3&phone=42999991234");
  });
});
