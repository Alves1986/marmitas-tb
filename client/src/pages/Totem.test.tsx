// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Totem, { mapPublicMenuToTotemCatalog, type TotemCatalog } from "./Totem";
import * as TotemModule from "./Totem";

afterEach(cleanup);

const demoKioskConfirmation = async () => ({ orderNumber: "TB-20260826-KIOSK", estimatedTime: "15 a 25 min", submittedAt: "2026-08-26T23:45:00.000Z" });

describe("Totem", () => {
  it("mantém a identidade Marmitas TB e começa pelas opções do cardápio", () => {
    render(<Totem />);

    expect(screen.getByRole("img", { name: /Marmitas TB/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /escolha uma opção/i })).toBeTruthy();
    expect(screen.getByText(/90 segundos sem interação/i)).toBeTruthy();
    expect(screen.getAllByRole("button").length).toBeGreaterThan(2);
  });

  it("converte o cardápio público em escolhas do totem com IDs persistidos e opções obrigatórias", () => {
    const mapPublicMenuToTotemCatalog = Reflect.get(TotemModule, "mapPublicMenuToTotemCatalog") as undefined | ((menu: unknown) => unknown);
    expect(mapPublicMenuToTotemCatalog).toBeTypeOf("function");
    if (!mapPublicMenuToTotemCatalog) return;

    expect(mapPublicMenuToTotemCatalog({
      categories: [{ id: "cat-1", name: "Destaques", slug: "destaques", sortOrder: 0 }],
      products: [{
        id: "19c4f23b-1e6d-4ca1-8e62-c44876fc65f2",
        categoryId: "cat-1",
        name: "Marmita do dia",
        description: "Arroz e feijão",
        imagePath: "https://example.test/marmita.webp",
        priceInCents: 2000,
        originalPriceInCents: null,
        requiresConfiguration: true,
        options: [
          { id: "56ee2e8e-649b-4aa1-9c1f-f8efa3e547d7", groupName: "Embalagem", label: "Marmitex", priceDeltaInCents: 150, isRequired: true, sortOrder: 0 },
          { id: "f58bd94f-98a9-4246-b6b5-75436419e425", groupName: "Molho", label: "Barbecue", priceDeltaInCents: 100, isRequired: false, sortOrder: 1 },
        ],
      }],
    })).toMatchObject({
      categories: [{ id: "cat-1", label: "Destaques" }],
      products: [{ id: "19c4f23b-1e6d-4ca1-8e62-c44876fc65f2", price: 21.5, defaultOptionIds: ["56ee2e8e-649b-4aa1-9c1f-f8efa3e547d7"] }],
    });
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

  it("leva da revisão ao pagamento e confirma o recibo após escolher cartão", async () => {
    vi.useFakeTimers();
    render(<Totem submitOrder={demoKioskConfirmation} />);

    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(screen.getByRole("heading", { name: /confira seu pedido/i })).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(/anderson/i), { target: { value: "Anderson" } });
    fireEvent.click(screen.getByRole("button", { name: /ir para pagamento/i }));
    expect(screen.getByRole("heading", { name: /como deseja pagar/i })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /cartão/i }));
    await act(async () => {});
    act(() => { vi.advanceTimersByTime(1_200); });
    expect(screen.getByRole("heading", { name: /sua senha é/i })).toBeTruthy();
    expect(screen.getByText(/obrigado/i)).toBeTruthy();
    expect(screen.getByText(/seu almoço está sendo preparado com carinho/i)).toBeTruthy();
    expect(screen.getByTestId("totem-success-indicator")).toBeTruthy();
    expect(screen.getByText(/anderson/i)).toBeTruthy();
    vi.useRealTimers();
  });

  it("registra o pedido KIOSK aprovado antes de revelar a senha de retirada", async () => {
    vi.useFakeTimers();
    const submitOrder = vi.fn().mockResolvedValue({ orderNumber: "TB-20260826-KIOSK", estimatedTime: "15 a 25 min", submittedAt: "2026-08-26T23:45:00.000Z" });
    const TotemWithDependencies = Totem as unknown as (props: {
      initialCatalog: TotemCatalog;
      submitOrder: (input: unknown) => Promise<unknown>;
    }) => ReturnType<typeof Totem>;
    const initialCatalog = mapPublicMenuToTotemCatalog({
      categories: [
        { id: "food", name: "Destaques", slug: "destaques", sortOrder: 0 },
        { id: "drinks", name: "Bebidas", slug: "bebidas", sortOrder: 1 },
        { id: "desserts", name: "Sobremesas", slug: "sobremesas", sortOrder: 2 },
      ],
      products: [
        { id: "19c4f23b-1e6d-4ca1-8e62-c44876fc65f2", categoryId: "food", name: "Marmita", description: null, imagePath: null, priceInCents: 2000, originalPriceInCents: null, requiresConfiguration: false, options: [] },
        { id: "56ee2e8e-649b-4aa1-9c1f-f8efa3e547d7", categoryId: "drinks", name: "Suco", description: null, imagePath: null, priceInCents: 500, originalPriceInCents: null, requiresConfiguration: false, options: [] },
        { id: "f58bd94f-98a9-4246-b6b5-75436419e425", categoryId: "desserts", name: "Doce", description: null, imagePath: null, priceInCents: 700, originalPriceInCents: null, requiresConfiguration: false, options: [] },
      ],
    });
    render(<TotemWithDependencies initialCatalog={initialCatalog} submitOrder={submitOrder} />);

    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getByRole("button", { name: /ir para pagamento/i }));
    fireEvent.click(screen.getByRole("button", { name: /cartão/i }));
    await act(async () => {});
    act(() => { vi.advanceTimersByTime(1_200); });

    expect(submitOrder).toHaveBeenCalledWith(expect.objectContaining({
      paymentMethod: "card",
      items: [{ productId: "19c4f23b-1e6d-4ca1-8e62-c44876fc65f2", quantity: 1, optionIds: [], note: "" }, { productId: "56ee2e8e-649b-4aa1-9c1f-f8efa3e547d7", quantity: 1, optionIds: [], note: "" }],
    }));
    expect(screen.getByRole("heading", { name: /sua senha é/i })).toBeTruthy();
    vi.useRealTimers();
  });

  it("permite encerrar manualmente o atendimento na tela de retirada", async () => {
    vi.useFakeTimers();
    render(<Totem submitOrder={demoKioskConfirmation} />);

    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getByRole("button", { name: /ir para pagamento/i }));
    fireEvent.click(screen.getByRole("button", { name: /cartão/i }));
    await act(async () => {});
    act(() => { vi.advanceTimersByTime(1_200); });

    fireEvent.click(screen.getByRole("button", { name: /encerrar atendimento/i }));
    expect(screen.getByRole("heading", { name: /escolha uma opção/i })).toBeTruthy();
    expect(screen.queryByText(/sua senha é/i)).toBeNull();
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
