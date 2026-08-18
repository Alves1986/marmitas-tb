// @vitest-environment happy-dom
import React, { useEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CartItem, CartSummary, DeliveryMode, OrderConfirmation, Product } from "@shared/order";
import { OrderProvider, useOrder } from "@/contexts/OrderContext";
import { StoreHeader } from "./StoreHeader";
import { CartPanel } from "./CartPanel";
import { ProductConfigurator } from "./ProductConfigurator";
import { CheckoutFlow } from "./CheckoutFlow";
import { CheckoutSuccess } from "./CheckoutSuccess";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    orders: {
      create: { useMutation: () => ({ mutateAsync: vi.fn().mockResolvedValue({ code: "TB-001234", paymentReference: "test_payment_001" }) }) },
      confirmTestPayment: { useMutation: () => ({ mutateAsync: vi.fn().mockResolvedValue({ status: "confirmed" }) }) },
    },
    store: { publicSettings: { useQuery: () => ({ data: { paymentMode: "test" } }) } },
  },
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

const configurableProduct: Product = {
  id: "keyboard-product",
  categoryId: "destaques",
  categoryLabel: "Destaques",
  name: "Marmita para teste",
  description: "Produto usado para validar o fluxo por teclado.",
  imageUrl: "/manus-storage/marmita-teste.jpg",
  price: 20,
  options: [
    {
      id: "size",
      label: "Tamanho",
      required: true,
      options: [
        { id: "small", label: "Pequena" },
        { id: "large", label: "Grande", priceAdjustment: 5 },
      ],
    },
  ],
};

function SeedCart() {
  const { addProduct } = useOrder();
  useEffect(() => {
    addProduct(configurableProduct, [{ groupId: "size", groupLabel: "Tamanho", optionId: "small", optionLabel: "Pequena" }], "");
  }, [addProduct]);
  return null;
}

const confirmation: OrderConfirmation = { orderNumber: "TB-001234", estimatedTime: "35 a 50 min", submittedAt: "2026-08-17T20:00:00.000Z" };
const confirmedItems: CartItem[] = [{ id: "item-1", productId: configurableProduct.id, name: configurableProduct.name, unitPrice: 20, quantity: 1, selections: [], note: "" }];
const confirmedSummary: CartSummary = { subtotal: 20, savings: 0, deliveryFee: 6, total: 26 };

describe("fluxo acessível de pedido", () => {
  it("mostra a foto do produto no topo da configuração", () => {
    render(
      <OrderProvider>
        <ProductConfigurator product={configurableProduct} onOpenChange={vi.fn()} />
      </OrderProvider>,
    );

    const productImage = screen.getByRole("img", { name: /foto de marmita para teste/i });
    expect(productImage.getAttribute("src")).toBe("/manus-storage/marmita-teste.jpg");
  });

  it("não reserva uma área de imagem quando o produto não possui foto", () => {
    const productWithoutImage = { ...configurableProduct, imageUrl: undefined };
    render(
      <OrderProvider>
        <ProductConfigurator product={productWithoutImage} onOpenChange={vi.fn()} />
      </OrderProvider>,
    );

    expect(screen.queryByRole("img", { name: /foto de marmita para teste/i })).toBeNull();
  });

  it("abre e fecha a sacola com teclado", async () => {
    const user = userEvent.setup();
    render(
      <OrderProvider>
        <StoreHeader />
        <CartPanel />
      </OrderProvider>,
    );

    const cartButton = screen.getByRole("button", { name: /abrir sacola/i });
    cartButton.focus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("dialog")).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("seleciona uma opção e fecha o configurador com teclado", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <OrderProvider>
        <ProductConfigurator product={configurableProduct} onOpenChange={onOpenChange} />
      </OrderProvider>,
    );

    const smallOption = screen.getByRole("button", { name: /pequena/i });
    smallOption.focus();
    await user.keyboard(" ");
    expect(smallOption.getAttribute("aria-pressed")).toBe("true");

    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("avança, retorna e confirma o checkout por teclado", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(
      <OrderProvider>
        <SeedCart />
        <CheckoutFlow onBack={vi.fn()} onSuccess={onSuccess} />
      </OrderProvider>,
    );

    const name = screen.getByLabelText(/Nome para o pedido/i);
    name.focus();
    await user.keyboard("Ana");
    const phone = screen.getByLabelText(/Telefone/i);
    phone.focus();
    await user.keyboard("42999999999");
    screen.getByRole("button", { name: /Continuar/i }).focus();
    await user.keyboard("{Enter}");

    const address = await screen.findByLabelText(/^Endereço$/i);
    address.focus();
    await user.keyboard("Rua das Flores, 100");
    const neighborhood = screen.getByLabelText(/^Bairro$/i);
    neighborhood.focus();
    await user.keyboard("Centro");
    screen.getByRole("button", { name: /Continuar/i }).focus();
    await user.keyboard("{Enter}");

    const card = await screen.findByRole("button", { name: /Cartão/i });
    card.focus();
    await user.keyboard(" ");
    expect(card.getAttribute("aria-pressed")).toBe("true");
    screen.getByRole("button", { name: /Continuar/i }).focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByText(/Itens do pedido/i)).toBeTruthy();

    const back = screen.getByRole("button", { name: /Voltar à etapa anterior/i });
    back.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByText(/Selecione como pretende pagar/i)).toBeTruthy();

    const backToAddress = screen.getByRole("button", { name: /Voltar à etapa anterior/i });
    backToAddress.focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByLabelText(/Endereço/i)).toBeTruthy();
    screen.getByRole("button", { name: /Continuar/i }).focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByText(/Selecione como pretende pagar/i)).toBeTruthy();
    screen.getByRole("button", { name: /Continuar/i }).focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByText(/Itens do pedido/i)).toBeTruthy();
    screen.getByRole("button", { name: /Confirmar pedido/i }).focus();
    await user.keyboard("{Enter}");

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it("mantém ações da confirmação alcançáveis por teclado", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    render(<CheckoutSuccess confirmation={confirmation} items={confirmedItems} summary={confirmedSummary} deliveryMode={"delivery" as DeliveryMode} onClose={onClose} />);

    const successHeading = screen.getByRole("heading", { name: /Tudo certo por aqui/i });
    await waitFor(() => expect(document.activeElement).toBe(successHeading));

    const copy = screen.getByRole("button", { name: /Copiar/i });
    copy.focus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("TB-001234"));

    const whatsapp = screen.getByRole("link", { name: /Abrir mensagem no WhatsApp/i });
    whatsapp.focus();
    expect(document.activeElement).toBe(whatsapp);
    expect(whatsapp.getAttribute("href")).toContain("api.whatsapp.com");

    const returnToMenu = screen.getByRole("button", { name: /Voltar ao cardápio/i });
    returnToMenu.focus();
    await user.keyboard(" ");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
