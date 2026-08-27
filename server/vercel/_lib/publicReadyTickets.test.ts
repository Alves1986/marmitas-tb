import { describe, expect, it, vi } from "vitest";
import { createPublicReadyTicketsHandler, toPublicReadyTickets } from "./publicReadyTickets";

describe("chamadas públicas prontas", () => {
  it("projeta somente senha e horário, limitando o retorno a seis chamadas", () => {
    const rows = Array.from({ length: 7 }, (_, index) => ({
      counter_ticket_number: 7 - index,
      updated_at: `2026-08-27T12:0${7 - index}:00.000Z`,
      customer_name: "Não pode vazar",
      total_in_cents: 2500,
    }));

    const tickets = toPublicReadyTickets(rows);

    expect(tickets).toHaveLength(6);
    expect(tickets[0]).toEqual({ ticket: "MTB-007", readyAt: "2026-08-27T12:07:00.000Z" });
    expect(tickets[5]).toEqual({ ticket: "MTB-002", readyAt: "2026-08-27T12:02:00.000Z" });
    expect(Object.keys(tickets[0])).toEqual(["ticket", "readyAt"]);
  });

  it("aceita apenas GET e retorna a projeção pública", async () => {
    const listReadyTickets = vi.fn().mockResolvedValue([{ ticket: "MTB-001", readyAt: "2026-08-27T12:00:00.000Z" }]);
    const handler = createPublicReadyTicketsHandler({ listReadyTickets });

    const getResponse = await handler(new Request("https://marmitas-tb.vercel.app/api/public/ready-tickets"));
    const postResponse = await handler(new Request("https://marmitas-tb.vercel.app/api/public/ready-tickets", { method: "POST" }));

    expect(getResponse.status).toBe(200);
    await expect(getResponse.json()).resolves.toEqual([{ ticket: "MTB-001", readyAt: "2026-08-27T12:00:00.000Z" }]);
    expect(postResponse.status).toBe(405);
    expect(postResponse.headers.get("allow")).toBe("GET");
  });

  it("não divulga detalhes internos quando a leitura pública falha", async () => {
    const handler = createPublicReadyTicketsHandler({ listReadyTickets: vi.fn().mockRejectedValue(new Error("Falha Postgres confidencial")) });

    const response = await handler(new Request("https://marmitas-tb.vercel.app/api/public/ready-tickets"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Erro interno." });
  });
});
