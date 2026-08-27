import { describe, expect, it } from "vitest";
import { getHelpGuide, getHelpProfile } from "./helpContent";

describe("conteúdo canônico da ajuda", () => {
  it("separa perfis, tutoriais e superfícies sem assistente", () => {
    expect(getHelpProfile("storefront")).toMatchObject({
      audience: "customer",
      guidePath: "/ajuda/pedidos",
    });
    expect(getHelpProfile("admin")).toMatchObject({
      audience: "management",
      guidePath: "/ajuda/gestao",
    });
    expect(getHelpProfile("totem")).toBeNull();
    expect(getHelpProfile("calls")).toBeNull();
  });

  it("mantém o guia do cliente concentrado no pedido e o de gestão nos módulos internos", () => {
    const customerText = getHelpGuide("customer").sections.map(section => `${section.title} ${section.body} ${section.steps.join(" ")}`).join(" ");
    const managementText = getHelpGuide("management").sections.map(section => `${section.title} ${section.body} ${section.steps.join(" ")}`).join(" ");

    expect(customerText).toMatch(/marmita do dia/i);
    expect(customerText).toMatch(/acompanhar o pedido/i);
    expect(customerText).not.toMatch(/estoque|relatórios|equipe/i);
    expect(managementText).toMatch(/estoque/i);
    expect(managementText).toMatch(/relatórios/i);
    expect(managementText).toMatch(/reimpressão/i);
  });
});
