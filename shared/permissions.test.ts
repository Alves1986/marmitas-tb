import { describe, expect, it } from "vitest";
import { canAccessOperation, canManageCatalog, canManageStoreSettings } from "./permissions";

describe("operational permissions", () => {
  it("permite à equipe acessar pedidos e comandas", () => {
    expect(canAccessOperation("staff")).toBe(true);
  });

  it("impede a equipe de alterar o catálogo", () => {
    expect(canManageCatalog("staff")).toBe(false);
  });

  it("permite somente ao administrador alterar configurações", () => {
    expect(canManageStoreSettings("admin")).toBe(true);
    expect(canManageStoreSettings("staff")).toBe(false);
  });
});
