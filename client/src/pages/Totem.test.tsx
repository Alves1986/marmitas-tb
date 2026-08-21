// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

  it("adiciona a marmita escolhida e segue diretamente para as bebidas", () => {
    render(<Totem />);

    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);

    expect(screen.getByRole("heading", { name: /quer uma bebida/i })).toBeTruthy();
  });

  it("volta com destino claro e preserva a marmita já escolhida", () => {
    render(<Totem />);

    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByRole("heading", { name: /quer uma bebida/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /voltar para marmitas/i }));
    expect(screen.getByRole("heading", { name: /escolha sua marmita/i })).toBeTruthy();
    expect(screen.getByText("No pedido")).toBeTruthy();
  });

  it("exibe uma ação de voltar identificável em cada etapa navegável", () => {
    render(<Totem />);

    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByRole("button", { name: /voltar para opções/i })).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByRole("button", { name: /voltar para marmitas/i })).toBeTruthy();
  });

  it("mantém o retorno em uma barra de ação persistente durante a escolha de bebida", () => {
    render(<Totem />);

    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);

    const actions = screen.getByTestId("totem-step-actions");
    expect(within(actions).getByRole("button", { name: /voltar para marmitas/i })).toBeTruthy();
  });

  it("segue das bebidas para sobremesa e da sobremesa para a revisão ao selecionar adicionais", () => {
    render(<Totem />);

    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByRole("heading", { name: /quer uma bebida/i })).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByRole("heading", { name: /uma sobremesa/i })).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByRole("heading", { name: /confira seu pedido/i })).toBeTruthy();
  });

  it("permite pular a sobremesa e seguir diretamente para a revisão", () => {
    render(<Totem />);

    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByRole("heading", { name: /uma sobremesa/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /não quero sobremesa/i }));
    expect(screen.getByRole("heading", { name: /confira seu pedido/i })).toBeTruthy();
  });

  it("oferece a recusa explícita no conteúdo da escolha de sobremesa", () => {
    render(<Totem />);

    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);

    const dessertChoice = screen.getByTestId("totem-dessert-choice");
    fireEvent.click(within(dessertChoice).getByRole("button", { name: /não quero sobremesa/i }));
    expect(screen.getByRole("heading", { name: /confira seu pedido/i })).toBeTruthy();
  });

  it("leva da revisão ao pagamento e confirma o recibo após escolher cartão", () => {
    vi.useFakeTimers();
    render(<Totem />);

    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByRole("heading", { name: /confira seu pedido/i })).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(/anderson/i), { target: { value: "Anderson" } });
    fireEvent.click(screen.getByRole("button", { name: /ir para pagamento/i }));
    expect(screen.getByRole("heading", { name: /como deseja pagar/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /cartão/i }));
    act(() => { vi.advanceTimersByTime(1_200); });
    expect(screen.getByRole("heading", { name: /sua senha é/i })).toBeTruthy();
    expect(screen.getByText(/anderson/i)).toBeTruthy();
    vi.useRealTimers();
  });

  it("não permite confirmar sem escolher PIX ou cartão de demonstração", () => {
    render(<Totem />);

    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getByRole("button", { name: /ir para pagamento/i }));

    expect(screen.getByRole("heading", { name: /como deseja pagar/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /escolha uma forma/i })).toBeNull();
    expect(screen.queryByRole("heading", { name: /sua senha é/i })).toBeNull();
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
