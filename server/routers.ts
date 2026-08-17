import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, operationProcedure, publicProcedure, router } from "./_core/trpc";
import { orderStatuses } from "../shared/operations";

const orderItemInput = z.object({
  productId: z.number().int().positive().optional(),
  productName: z.string().trim().min(1).max(180),
  unitPriceInCents: z.number().int().nonnegative(),
  quantity: z.number().int().positive().max(99),
  selections: z.array(z.unknown()).default([]),
  notes: z.string().trim().max(600).optional(),
});

const createOrderInput = z.object({
  customerName: z.string().trim().min(2).max(160),
  customerPhone: z.string().trim().min(8).max(32),
  fulfillmentMethod: z.enum(["delivery", "pickup"]),
  deliveryAddress: z.string().trim().max(600).optional(),
  customerNotes: z.string().trim().max(900).optional(),
  subtotalInCents: z.number().int().nonnegative(),
  deliveryFeeInCents: z.number().int().nonnegative(),
  totalInCents: z.number().int().positive(),
  paymentMethod: z.enum(["pix", "credit_card", "voucher", "cash"]),
  items: z.array(orderItemInput).min(1).max(50),
}).superRefine((value, context) => {
  if (value.fulfillmentMethod === "delivery" && !value.deliveryAddress) {
    context.addIssue({ code: "custom", message: "Endereço é obrigatório para entrega.", path: ["deliveryAddress"] });
  }
  const calculated = value.subtotalInCents + value.deliveryFeeInCents;
  if (calculated !== value.totalInCents) {
    context.addIssue({ code: "custom", message: "Total do pedido inválido.", path: ["totalInCents"] });
  }
});

const productOptionInput = z.object({
  groupName: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(160),
  priceDeltaInCents: z.number().int().min(-100_000).max(100_000),
  isRequired: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
  isActive: z.boolean(),
});

const adminProductInput = z.object({
  id: z.number().int().positive().optional(),
  categoryId: z.number().int().positive(),
  name: z.string().trim().min(1).max(180),
  description: z.string().trim().max(3_000).nullable().optional(),
  imageUrl: z.string().trim().max(3_000).nullable().optional(),
  priceInCents: z.number().int().nonnegative(),
  originalPriceInCents: z.number().int().nonnegative().nullable().optional(),
  isActive: z.boolean(),
  requiresConfiguration: z.boolean(),
  options: z.array(productOptionInput).max(100),
});

const adminCategoryInput = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(140).regex(/^[a-z0-9-]+$/, "Use letras minúsculas, números e hífens."),
  sortOrder: z.number().int().min(0).max(999),
  isActive: z.boolean(),
});

const storeSettingsInput = z.object({
  storeName: z.string().trim().min(1).max(160),
  deliveryFeeInCents: z.number().int().nonnegative().max(100_000),
  openingHours: z.string().trim().min(1).max(1_000),
  paymentMode: z.enum(["test", "asaas"]),
  autoPrint: z.boolean(),
});

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  orders: router({
    create: publicProcedure.input(createOrderInput).mutation(async ({ input }) => {
      return db.createStoredOrder(input);
    }),
    confirmTestPayment: publicProcedure.input(z.object({
      paymentReference: z.string().trim().min(8).max(160),
    })).mutation(async ({ input }) => {
      try {
        const order = await db.confirmStoredTestPayment(input.paymentReference);
        return { order };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Não foi possível confirmar o pagamento de teste.",
        });
      }
    }),
    track: publicProcedure.input(z.object({
      code: z.string().trim().min(8).max(32),
      phone: z.string().trim().min(8).max(32),
    })).query(async ({ input }) => {
      return db.getOrderByTracking(input.code.toUpperCase(), input.phone);
    }),
  }),
  catalog: router({
    listAdmin: adminProcedure.query(() => db.listAdminCatalog()),
    upsertCategory: adminProcedure.input(adminCategoryInput).mutation(({ ctx, input }) => db.upsertCategory({ ...input, actorUserId: ctx.user.id })),
    upsertProduct: adminProcedure.input(adminProductInput).mutation(({ ctx, input }) => db.upsertProduct({ ...input, actorUserId: ctx.user.id })),
    setAvailability: adminProcedure.input(z.object({
      productId: z.number().int().positive(),
      available: z.boolean(),
    })).mutation(({ ctx, input }) => db.setProductAvailability({ ...input, actorUserId: ctx.user.id })),
  }),
  store: router({
    publicSettings: publicProcedure.query(async () => {
      const settings = await db.getStoreSettings();
      return { paymentMode: settings.paymentMode };
    }),
  }),
  operations: router({
    list: operationProcedure.query(() => db.listOperationalOrders()),
    transition: operationProcedure.input(z.object({
      orderId: z.number().int().positive(),
      nextStatus: z.enum(orderStatuses),
      message: z.string().trim().max(500).optional(),
    })).mutation(async ({ ctx, input }) => {
      try {
        return await db.transitionStoredOrder({ ...input, actorUserId: ctx.user.id });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Não foi possível atualizar o pedido.",
        });
      }
    }),
    acknowledge: operationProcedure.input(z.object({
      orderId: z.number().int().positive(),
    })).mutation(async ({ ctx, input }) => {
      try {
        return await db.acknowledgeOperationalAlert({ ...input, actorUserId: ctx.user.id });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Não foi possível reconhecer o alerta do pedido.",
        });
      }
    }),
    queuePrint: operationProcedure.input(z.object({
      orderId: z.number().int().positive(),
    })).mutation(async ({ ctx, input }) => {
      try {
        return await db.queueManualPrintJob({ ...input, actorUserId: ctx.user.id });
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Não foi possível enfileirar a reimpressão.",
        });
      }
    }),
    printJobs: operationProcedure.query(() => db.listQueuedPrintJobs()),
    markPrintJob: operationProcedure.input(z.object({
      printJobId: z.number().int().positive(),
      status: z.enum(["printed", "failed"]),
      printerName: z.string().trim().max(160).optional(),
    })).mutation(({ input }) => db.markPrintJobResult(input)),
  }),
  admin: router({
    access: adminProcedure.query(() => ({ allowed: true })),
    listStaff: adminProcedure.query(() => db.listStaffMembers()),
    upsertStaff: adminProcedure.input(z.object({
      userId: z.number().int().positive(),
      role: z.enum(["user", "staff", "admin"]),
    })).mutation(({ ctx, input }) => db.upsertStaffMember({ ...input, actorUserId: ctx.user.id })),
    getSettings: adminProcedure.query(() => db.getStoreSettings()),
    updateSettings: adminProcedure.input(storeSettingsInput).mutation(({ ctx, input }) => db.updateStoreSettings({ ...input, actorUserId: ctx.user.id })),
  }),
});

export type AppRouter = typeof appRouter;
