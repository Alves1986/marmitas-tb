import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { CartItem, CartSelection, CheckoutDraft, DeliveryMode, Product } from "@shared/order";
import { calculateCartSummary, createCartItemKey, readStoredCart, writeStoredCart } from "@/lib/order";

const defaultCheckoutDraft: CheckoutDraft = {
  name: "",
  phone: "",
  address: "",
  neighborhood: "",
  reference: "",
  paymentMethod: "",
  changeFor: "",
};

type OrderContextValue = {
  items: CartItem[];
  deliveryMode: DeliveryMode;
  checkoutDraft: CheckoutDraft;
  isCartOpen: boolean;
  itemCount: number;
  summary: ReturnType<typeof calculateCartSummary>;
  addProduct: (product: Product, selections: CartSelection[], note: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  setDeliveryMode: (mode: DeliveryMode) => void;
  setCheckoutDraft: (patch: Partial<CheckoutDraft>) => void;
  setCartOpen: (isOpen: boolean) => void;
  clearCart: () => void;
};

const OrderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    return readStoredCart(window.localStorage);
  });
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("delivery");
  const [checkoutDraft, setCheckoutDraftState] = useState<CheckoutDraft>(defaultCheckoutDraft);
  const [isCartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") writeStoredCart(window.localStorage, items);
  }, [items]);

  const addProduct = useCallback((product: Product, selections: CartSelection[], note: string) => {
    const unitPrice = product.price + selections.reduce((total, selection) => total + (selection.priceAdjustment ?? 0), 0);
    const itemId = createCartItemKey(
      product.id,
      selections.map((selection) => `${selection.groupId}:${selection.optionId}`),
      note,
    );

    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === itemId);
      if (existingItem) {
        return currentItems.map((item) =>
          item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [
        ...currentItems,
        {
          id: itemId,
          productId: product.id,
          name: product.name,
          unitPrice,
          originalUnitPrice: product.originalPrice,
          quantity: 1,
          selections,
          note: note.trim(),
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    setItems((currentItems) =>
      quantity <= 0
        ? currentItems.filter((item) => item.id !== itemId)
        : currentItems.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
    );
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
  }, []);

  const setCheckoutDraft = useCallback((patch: Partial<CheckoutDraft>) => {
    setCheckoutDraftState((currentDraft) => ({ ...currentDraft, ...patch }));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCheckoutDraftState(defaultCheckoutDraft);
  }, []);

  const summary = useMemo(() => calculateCartSummary(items, deliveryMode), [items, deliveryMode]);
  const itemCount = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);

  const value = useMemo<OrderContextValue>(
    () => ({
      items,
      deliveryMode,
      checkoutDraft,
      isCartOpen,
      itemCount,
      summary,
      addProduct,
      updateQuantity,
      removeItem,
      setDeliveryMode,
      setCheckoutDraft,
      setCartOpen,
      clearCart,
    }),
    [
      addProduct,
      checkoutDraft,
      clearCart,
      deliveryMode,
      isCartOpen,
      itemCount,
      items,
      removeItem,
      setCheckoutDraft,
      summary,
      updateQuantity,
    ],
  );

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (!context) throw new Error("useOrder precisa ser usado dentro de OrderProvider");
  return context;
}
