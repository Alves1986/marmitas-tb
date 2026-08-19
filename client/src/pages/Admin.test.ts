import { describe, expect, it } from "vitest";
import { getAdminRedirectTarget } from "./Admin";

describe("getAdminRedirectTarget", () => {
  it("encaminha sessão ausente ou sem papel administrativo para o acesso da equipe", () => {
    expect(getAdminRedirectTarget(undefined)).toBe("/acesso");
    expect(getAdminRedirectTarget("staff")).toBe("/acesso");
  });

  it("não redireciona um administrador reconhecido", () => {
    expect(getAdminRedirectTarget("admin")).toBeNull();
  });
});
