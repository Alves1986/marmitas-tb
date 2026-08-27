// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import CustomerHelp from "./CustomerHelp";
import { ManagementHelpContent } from "./ManagementHelp";

afterEach(() => cleanup());

describe("páginas de tutorial", () => {
  it("mostra o guia do cliente com início de pedido e acompanhamento", () => {
    render(<CustomerHelp />);

    expect(screen.getByRole("heading", { name: /como pedir na marmitas tb/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ver a marmita do dia" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Acompanhar o pedido" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /voltar para pedir/i }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("link", { name: "Baixar tutorial do cliente em PDF" }).getAttribute("href")).toContain("tutorial-cliente-marmitas-tb_");
  });

  it("mantém o guia de gestão protegido para perfis sem acesso interno", () => {
    render(<ManagementHelpContent role="user" />);

    expect(screen.getByRole("heading", { name: "Acesso restrito" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /guia de gestão/i })).toBeNull();
  });
});
