// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Totem from "./Totem";

afterEach(cleanup);

describe("Totem", () => {
  it("mantém a identidade Marmitas TB e começa pelas opções do cardápio", () => {
    render(<Totem />);

    expect(screen.getByRole("img", { name: /Marmitas TB/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /escolha uma opção/i })).toBeTruthy();
    expect(screen.getAllByRole("button").length).toBeGreaterThan(2);
  });

  it("reinicia a janela de inatividade após interação e retorna ao início depois de 90 segundos", () => {
    vi.useFakeTimers();
    render(<Totem />);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByRole("heading", { name: /escolha sua marmita/i })).toBeTruthy();

    act(() => { vi.advanceTimersByTime(30_000); });
    fireEvent.pointerDown(window);
    act(() => { vi.advanceTimersByTime(89_999); });
    expect(screen.getByRole("heading", { name: /escolha sua marmita/i })).toBeTruthy();

    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByRole("heading", { name: /escolha uma opção/i })).toBeTruthy();
    vi.useRealTimers();
  });
});
