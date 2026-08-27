// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { OrderProvider } from "@/contexts/OrderContext";
import { StoreHeader } from "./StoreHeader";

afterEach(() => cleanup());

describe("Cabeçalho de venda", () => {
  it("mantém acompanhamento público e sacola, sem navegação institucional extensa", () => {
    render(<OrderProvider><StoreHeader /></OrderProvider>);

    expect(screen.getByRole("link", { name: /acompanhar pedido/i }).getAttribute("href")).toBe("/acompanhar");
    expect(screen.queryByRole("button", { name: "Informações" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Contato" })).toBeNull();
    expect(screen.getByRole("button", { name: /abrir sacola com 0 itens/i })).toBeTruthy();
  });
});
