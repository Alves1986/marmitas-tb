import { z } from "zod";
import { json, jsonError, methodNotAllowed } from "../_lib/http";
import { normalizePhoneForLookup, phoneTrackingInput, trackingInput } from "../_lib/orders";
import { createSupabaseOrder, findSupabaseTracking, findSupabaseTrackingByPhone } from "../_lib/ordersRepository";

const itemInput = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
  optionIds: z.array(z.string().uuid()).max(20),
  note: z.string().trim().max(500).default(""),
});

export const createOrderInput = z
  .object({
    customer: z.object({
      name: z.string().trim().min(2).max(160),
      phone: z.string().transform(normalizePhoneForLookup).refine((value) => value.length >= 8, "Informe um telefone válido."),
      address: z.string().trim().max(500).optional(),
      notes: z.string().trim().max(500).optional(),
    }),
    fulfillmentMethod: z.enum(["delivery", "pickup"]),
    paymentMethod: z.enum(["pix", "credit_card", "voucher", "cash"]),
    items: z.array(itemInput).min(1).max(30),
  })
  .superRefine((value, context) => {
    if (value.fulfillmentMethod === "delivery" && !value.customer.address) {
      context.addIssue({ code: "custom", message: "Informe o endereço de entrega.", path: ["customer", "address"] });
    }
  });

export type CreatePublicOrderInput = z.infer<typeof createOrderInput> & {
  customerPhoneLookup: string;
};

export type PublicOrderConfirmation = {
  orderNumber: string;
  estimatedTime: string;
  submittedAt: string;
  trackingCode?: string;
  paymentStatus: "pending" | "confirmed";
  isTestPayment: boolean;
};

export type PublicTrackingOrder = {
  code: string;
  status: string;
  customerName: string;
  items: Array<{ name: string; quantity: number }>;
  totalInCents: number;
  paymentStatus: "pending" | "confirmed";
  paymentMethod: "pix" | "credit_card" | "voucher" | "cash";
  paymentProvider: "asaas_test" | "asaas";
  fulfillmentMethod: "delivery" | "pickup";
  createdAt: string;
  events: Array<{ id: string; toStatus: string | null; message: string | null; createdAt: string }>;
};

export type PublicOrderRepository = {
  createOrder(input: CreatePublicOrderInput): Promise<PublicOrderConfirmation>;
  findTracking(input: z.infer<typeof trackingInput>): Promise<PublicTrackingOrder | null>;
  findLatestTrackingByPhone(phone: string): Promise<PublicTrackingOrder | null>;
};

export function createPublicOrdersHandler(repository: PublicOrderRepository) {
  return async function publicOrdersHandler(request: Request): Promise<Response> {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const code = url.searchParams.get("code") ?? "";
      const phone = url.searchParams.get("phone") ?? "";

      try {
        if (!code) {
          const input = phoneTrackingInput.safeParse({ phone });
          if (!input.success) return jsonError(400, "Informe um telefone válido.");
          const tracking = await repository.findLatestTrackingByPhone(input.data.phone);
          return tracking ? json(200, tracking) : jsonError(404, "Pedido não encontrado.");
        }
        const input = trackingInput.safeParse({ code, phone });
        if (!input.success) return jsonError(400, "Informe código e telefone válidos.");
        const tracking = await repository.findTracking(input.data);
        return tracking ? json(200, tracking) : jsonError(404, "Pedido não encontrado.");
      } catch (error) {
        return jsonError(500, error);
      }
    }

    if (request.method !== "POST") return methodNotAllowed(["GET", "POST"]);

    try {
      const rawBody: unknown = await request.json();
      const input = createOrderInput.safeParse(rawBody);
      if (!input.success) return jsonError(400, "Dados do pedido inválidos.");

      const confirmation = await repository.createOrder({
        ...input.data,
        customerPhoneLookup: input.data.customer.phone,
      });
      return json(201, confirmation);
    } catch (error) {
      return jsonError(500, error);
    }
  };
}

export default createPublicOrdersHandler({
  createOrder: createSupabaseOrder,
  findTracking: findSupabaseTracking,
  findLatestTrackingByPhone: findSupabaseTrackingByPhone,
});
