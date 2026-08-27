import { describe, expect, it } from "vitest";
import { canDisplayHelpLauncher, getHelpSurface } from "./helpRouting";

describe("roteamento do assistente de ajuda", () => {
  it.each([
    ["/", "storefront"],
    ["/acompanhar", "tracking"],
    ["/admin", "admin"],
    ["/operacao", "operations"],
    ["/operacao/pdv", "counter"],
    ["/operacao/cozinha", "kitchen"],
    ["/operacao/estoque", "inventory"],
    ["/ajuda/pedidos", "storefront"],
    ["/ajuda/gestao", "admin"],
  ])("mapeia %s para a superfície %s", (path, surface) => {
    expect(getHelpSurface(path)).toBe(surface);
  });

  it.each(["/totem", "/chamadas", "/acesso", "/definir-senha"])('não mostra assistente em %s', (path) => {
    expect(getHelpSurface(path)).toBeNull();
  });

  it("mantém a ajuda interna oculta até que um papel de equipe seja confirmado", () => {
    expect(canDisplayHelpLauncher("storefront", null)).toBe(true);
    expect(canDisplayHelpLauncher("admin", null)).toBe(false);
    expect(canDisplayHelpLauncher("operations", "user")).toBe(false);
    expect(canDisplayHelpLauncher("inventory", "staff")).toBe(true);
    expect(canDisplayHelpLauncher("admin", "admin")).toBe(true);
  });
});
