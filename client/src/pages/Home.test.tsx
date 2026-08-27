// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/delivery/Hero", () => ({ Hero: () => <section data-testid="hero-venda" /> }));
vi.mock("@/components/delivery/StoreHeader", () => ({ StoreHeader: () => <header data-testid="cabecalho-venda" /> }));
vi.mock("@/components/delivery/StoreInfo", () => ({ StoreInfo: () => <section data-testid="informacoes-institucionais" /> }));
vi.mock("@/components/delivery/ProductCatalog", () => ({ ProductCatalog: () => <section id="cardapio" data-testid="catalogo" /> }));
vi.mock("@/components/delivery/CartPanel", () => ({ CartPanel: () => <aside data-testid="sacola" /> }));
vi.mock("@/components/delivery/OrderActions", () => ({ MobileCartBar: () => <aside data-testid="sacola-mobile" /> }));

import Home from "./Home";

afterEach(() => cleanup());

describe("Página inicial de venda", () => {
  it("apresenta o catálogo logo depois da abertura, sem bloco institucional antes da compra", () => {
    const { container } = render(<Home />);
    const main = container.querySelector("main");

    expect(main?.firstElementChild?.getAttribute("data-testid")).toBe("hero-venda");
    expect(main?.querySelector("#cardapio")).toBeTruthy();
    expect(screen.queryByTestId("informacoes-institucionais")).toBeNull();
    expect(screen.getByTestId("sacola")).toBeTruthy();
    expect(screen.getByTestId("sacola-mobile")).toBeTruthy();
  });
});
