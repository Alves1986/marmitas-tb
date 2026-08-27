// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Hero } from "./Hero";

afterEach(() => cleanup());

describe("Hero de venda", () => {
  it("destaca a marmita do dia e leva ao catálogo real", () => {
    render(<Hero />);

    expect(screen.getByRole("heading", { name: /marmita do dia/i })).toBeTruthy();
    expect(screen.getByRole("img", { name: /carne de panela com purê de batata/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /realizar pedido/i }).getAttribute("href")).toBe("#cardapio");
  });
});
