export type DeliveryMode = "delivery" | "pickup";

export type PaymentMethod = "cash" | "card" | "food_voucher";

export type ProductOption = {
  id: string;
  label: string;
  priceAdjustment?: number;
};

export type ProductOptionGroup = {
  id: string;
  label: string;
  required?: boolean;
  options: ProductOption[];
};

export type Product = {
  id: string;
  categoryId: string;
  categoryLabel: string;
  name: string;
  description: string;
  imageUrl?: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  accent?: "red" | "green" | "gold";
  options?: ProductOptionGroup[];
};

export type CartSelection = {
  groupId: string;
  groupLabel: string;
  optionId: string;
  optionLabel: string;
  priceAdjustment?: number;
};

export type CartItem = {
  id: string;
  productId: string;
  name: string;
  unitPrice: number;
  originalUnitPrice?: number;
  quantity: number;
  selections: CartSelection[];
  note: string;
};

export type CartSummary = {
  subtotal: number;
  savings: number;
  deliveryFee: number;
  total: number;
};

export type CheckoutDraft = {
  name: string;
  phone: string;
  address: string;
  neighborhood: string;
  reference: string;
  paymentMethod: PaymentMethod | "";
  changeFor: string;
};

export type OrderPayload = {
  id: string;
  createdAt: string;
  customer: CheckoutDraft;
  deliveryMode: DeliveryMode;
  items: CartItem[];
  summary: CartSummary;
};

export type OrderConfirmation = {
  orderNumber: string;
  estimatedTime: string;
  submittedAt: string;
};
