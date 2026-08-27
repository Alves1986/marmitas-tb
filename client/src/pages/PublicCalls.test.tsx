// @vitest-environment happy-dom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicCallsContent } from "./PublicCalls";

const tickets = [
  { ticket: "MTB-006", readyAt: "2026-08-27T12:06:00.000Z" },
  { ticket: "MTB-005", readyAt: "2026-08-27T12:05:00.000Z" },
  { ticket: "MTB-004", readyAt: "2026-08-27T12:04:00.000Z" },
  { ticket: "MTB-003", readyAt: "2026-08-27T12:03:00.000Z" },
  { ticket: "MTB-002", readyAt: "2026-08-27T12:02:00.000Z" },
  { ticket: "MTB-001", readyAt: "2026-08-27T12:01:00.000Z" },
];

describe("Painel público de chamadas", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("destaca a senha mais recente e mostra até cinco chamadas recentes sem dados pessoais", async () => {
    render(<PublicCallsContent loadTickets={vi.fn().mockResolvedValue(tickets)} />);

    expect(await screen.findByRole("heading", { name: "MTB-006", level: 1 })).toBeTruthy();
    expect(screen.getByText("MTB-005")).toBeTruthy();
    expect(screen.getByText("MTB-001")).toBeTruthy();
    expect(screen.getByText("Acompanhe sua senha")).toBeTruthy();
    expect(screen.queryByText(/Cliente|telefone|R\$/i)).toBeNull();
  });

  it("explica quando não há senha chamada e mostra falha pública sem detalhes internos", async () => {
    const { rerender } = render(<PublicCallsContent loadTickets={vi.fn().mockResolvedValue([])} />);
    expect(await screen.findByText("Nenhuma senha chamada agora")).toBeTruthy();

    rerender(<PublicCallsContent loadTickets={vi.fn().mockRejectedValue(new Error("Postgres connection secret"))} />);
    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível atualizar as chamadas.");
    expect(screen.queryByText(/Postgres connection secret/)).toBeNull();
  });

  it("reconsulta as senhas a cada dez segundos", async () => {
    vi.useFakeTimers();
    const loadTickets = vi.fn().mockResolvedValue([]);
    render(<PublicCallsContent loadTickets={loadTickets} />);

    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText("Nenhuma senha chamada agora")).toBeTruthy();
    await act(async () => { vi.advanceTimersByTime(10_000); await Promise.resolve(); });

    expect(loadTickets).toHaveBeenCalledTimes(2);
  });
});
