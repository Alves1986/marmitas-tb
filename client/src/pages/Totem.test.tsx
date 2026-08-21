// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Totem from "./Totem";

afterEach(cleanup);

describe("Totem", () => {
  it("mantém a identidade Marmitas TB e começa pelas opções do cardápio", () => {
    render(<Totem />);

    expect(screen.getByRole("img", { name: /Marmitas TB/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /escolha uma opção/i })).toBeTruthy();
    expect(screen.getAllByRole("button").length).toBeGreaterThan(2);
  });
});
