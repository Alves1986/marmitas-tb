import { describe, expect, it } from "vitest";
import { json } from "./vercel/_lib/http";
import { createOperationsResourceHandler } from "../api/operations/[resource]";

describe("dispatcher de recursos operacionais", () => {
  it.each(["orders", "alerts", "inventory", "printJobs"])("preserva a URL operacional de %s", async (resource) => {
    const handler = createOperationsResourceHandler({
      orders: () => async () => json(200, { resource: "orders" }),
      alerts: () => async () => json(200, { resource: "alerts" }),
      inventory: () => async () => json(200, { resource: "inventory" }),
      printJobs: () => async () => json(200, { resource: "printJobs" }),
    });

    const response = await handler(new Request(`https://app.test/api/operations/${resource}`));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ resource });
  });

  it("recusa recurso operacional não registrado", async () => {
    const handler = createOperationsResourceHandler({
      orders: () => async () => json(200, { resource: "orders" }),
      alerts: () => async () => json(200, { resource: "alerts" }),
      inventory: () => async () => json(200, { resource: "inventory" }),
      printJobs: () => async () => json(200, { resource: "printJobs" }),
    });

    const response = await handler(new Request("https://app.test/api/operations/unknown"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Recurso operacional não encontrado." });
  });
});
