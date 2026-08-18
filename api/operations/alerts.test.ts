import { describe, expect, it, vi } from "vitest";
import { ApiAuthError } from "../_lib/auth";
import { createOperationsAlertsHandler } from "./alerts";

const staff = {
  id: "d9071683-ba84-45a8-bb4d-3f026d356fe0",
  email: "cozinha@marmitastb.com.br",
  displayName: "Cozinha",
  role: "staff" as const,
};

describe("/api/operations/alerts", () => {
  it("restringe o reconhecimento de alerta à equipe", async () => {
    const handler = createOperationsAlertsHandler({
      requireStaff: vi.fn().mockRejectedValue(new ApiAuthError(403, "Acesso restrito à equipe.")),
      acknowledgeAlert: vi.fn(),
    });

    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/operations/alerts", { method: "POST" }));

    expect(response.status).toBe(403);
  });

  it("registra o UUID do operador, sem aceitar autoria enviada pelo navegador", async () => {
    const acknowledgeAlert = vi.fn().mockResolvedValue({ orderId: "f10c41ea-a610-46f3-a340-9cae1e8b09f6" });
    const handler = createOperationsAlertsHandler({
      requireStaff: vi.fn().mockResolvedValue(staff),
      acknowledgeAlert,
    });

    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/operations/alerts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: "f10c41ea-a610-46f3-a340-9cae1e8b09f6", actorUserId: "browser-id" }),
    }));

    expect(response.status).toBe(200);
    expect(acknowledgeAlert).toHaveBeenCalledWith({
      orderId: "f10c41ea-a610-46f3-a340-9cae1e8b09f6",
      actorUserId: staff.id,
    });
  });
});
