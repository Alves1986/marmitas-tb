import { z } from "zod";
import { asVercelNodeHandler, json, jsonError, methodNotAllowed } from "../../server/vercel/_lib/http.js";
import { normalizePhoneForLookup, phoneTrackingInput, trackingInput } from "../../server/vercel/_lib/orders.js";
import { createSupabaseOrder, findSupabaseTracking, findSupabaseTrackingByPhone } from "../../server/vercel/_lib/ordersRepository.js";

const itemInput = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
  optionIds: z.array(z.string().uuid()).max(20),
  note: z.string().trim().max(500).default(""),
});

export const createOrderInput = z
  .object({
    idempotencyKey: z.string().uuid(),
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
  sourceChannel: "OWN_APP";
};

const createKioskOrderInput = z.object({
  idempotencyKey: z.string().uuid(),
  displayName: z.string().trim().max(40).optional(),
  paymentMethod: z.enum(["pix", "card"]),
  items: z.array(itemInput).min(1).max(30),
});

export type CreateKioskOrderInput = z.infer<typeof createKioskOrderInput> & {
  sourceChannel: "KIOSK";
};

export type KioskOrderConfirmation = {
  orderNumber: string;
  estimatedTime: string;
  submittedAt: string;
};

export type PublicOrderConfirmation = {
  orderNumber: string;
  estimatedTime: string;
  submittedAt: string;
  trackingCode?: string;
  paymentReference?: string;
  paymentUrl?: string;
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

export type KioskOrderRepository = {
  createOrder(input: CreateKioskOrderInput): Promise<KioskOrderConfirmation>;
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
        sourceChannel: "OWN_APP",
      });
      return json(201, confirmation);
    } catch (error) {
      return jsonError(500, error);
    }
  };
}

export function createKioskOrdersHandler(repository: KioskOrderRepository) {
  return async function kioskOrdersHandler(request: Request): Promise<Response> {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);

    try {
      const input = createKioskOrderInput.safeParse(await request.json());
      if (!input.success) return jsonError(400, "Dados do pedido do totem inválidos.");

      return json(201, await repository.createOrder({ ...input.data, sourceChannel: "KIOSK" }));
    } catch (error) {
      return jsonError(500, error);
    }
  };
}

export default asVercelNodeHandler(createPublicOrdersHandler({
  createOrder: createSupabaseOrder,
  findTracking: findSupabaseTracking,
  findLatestTrackingByPhone: findSupabaseTrackingByPhone,
}));
