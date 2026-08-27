import { describe, expect, it } from "vitest";
import { buildPublicCallsBoard } from "./publicCallsBoard";

describe("buildPublicCallsBoard", () => {
  it("separa a senha mais recente como chamada principal e preserva até cinco recentes", () => {
    const tickets = Array.from({ length: 7 }, (_, index) => ({
      ticket: `MTB-${String(7 - index).padStart(3, "0")}`,
      readyAt: `2026-08-27T12:0${7 - index}:00.000Z`,
    }));

    const board = buildPublicCallsBoard(tickets);

    expect(board.featured).toEqual({ ticket: "MTB-007", readyAt: "2026-08-27T12:07:00.000Z" });
    expect(board.recent).toHaveLength(5);
    expect(board.recent[0]?.ticket).toBe("MTB-006");
    expect(board.recent[4]?.ticket).toBe("MTB-002");
  });

  it("representa uma lista vazia sem inventar chamada principal", () => {
    expect(buildPublicCallsBoard([])).toEqual({ featured: null, recent: [] });
  });
});
