import { z } from "zod";
import { ApiAuthError, createSupabaseAuthGuards, type AuthenticatedProfile } from "../../server/vercel/_lib/auth.js";
import { asVercelNodeHandler, json, jsonError, methodNotAllowed } from "../../server/vercel/_lib/http.js";
import { createProductImageUpload } from "../../server/vercel/_lib/productImageStorage.js";
import { createSupabaseAdmin } from "../../server/vercel/_lib/supabaseAdmin.js";

const availabilityInput = z.object({ productId: z.string().uuid(), isActive: z.boolean() });
const imageUploadInput = z.object({ contentType: z.literal("image/webp") });
const categoryInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(140),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean(),
});
const optionInput = z.object({
  groupName: z.string().trim().min(1).max(120),
  label: z.string().trim().min(1).max(160),
  priceDeltaInCents: z.number().int().min(0),
  isRequired: z.boolean(),
  sortOrder: z.number().int().min(0),
  isActive: z.boolean(),
});
const productInput = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1_000).nullable(),
  imagePath: z.string().trim().min(1).max(1_000).nullable(),
  priceInCents: z.number().int().positive(),
  originalPriceInCents: z.number().int().positive().nullable(),
  isActive: z.boolean(),
  requiresConfiguration: z.boolean(),
  options: z.array(optionInput).max(40),
});
const upsertInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("upsert-category"), category: categoryInput }),
  z.object({ action: z.literal("upsert-product"), product: productInput }),
]);

type CategoryInput = z.infer<typeof categoryInput>;
type ProductInput = z.infer<typeof productInput>;

export type AdminCatalogDependencies = {
  requireAdmin(request: Request): Promise<AuthenticatedProfile>;
  getCatalog(): Promise<unknown>;
  setProductAvailability(input: { productId: string; isActive: boolean }): Promise<{ id: string; isActive: boolean }>;
  createProductImageUpload(): Promise<{ path: string; token: string }>;
  upsertCategory(input: CategoryInput): Promise<unknown>;
  upsertProduct(input: ProductInput): Promise<unknown>;
};

export function createAdminCatalogHandler(dependencies: AdminCatalogDependencies) {
  return async function adminCatalogHandler(request: Request): Promise<Response> {
    try {
      await dependencies.requireAdmin(request);
      if (request.method === "GET") return json(200, await dependencies.getCatalog());
      if (request.method === "POST") {
        const input = imageUploadInput.safeParse(await request.json());
        if (!input.success) return jsonError(400, "Envie uma imagem WebP válida.");
        return json(200, await dependencies.createProductImageUpload());
      }
      if (request.method === "PUT") {
        const input = upsertInput.safeParse(await request.json());
        if (!input.success) return jsonError(400, "Dados de catálogo inválidos.");
        if (input.data.action === "upsert-category") return json(200, await dependencies.upsertCategory(input.data.category));
        return json(200, await dependencies.upsertProduct(input.data.product));
      }
      if (request.method !== "PATCH") return methodNotAllowed(["GET", "POST", "PATCH", "PUT"]);
      const input = availabilityInput.safeParse(await request.json());
      if (!input.success) return jsonError(400, "Dados de disponibilidade inválidos.");
      return json(200, await dependencies.setProductAvailability(input.data));
    } catch (error) {
      if (error instanceof ApiAuthError) return jsonError(error.statusCode, error.message);
      return jsonError(500, error);
    }
  };
}

async function getSupabaseCatalog() {
  const client = createSupabaseAdmin();
  const [categories, products, options] = await Promise.all([
    client.from("categories").select("id, name, slug, sort_order, is_active").order("sort_order"),
    client.from("products").select("id, category_id, name, description, image_path, price_in_cents, original_price_in_cents, requires_configuration, is_active").order("name"),
    client.from("product_options").select("id, product_id, group_name, label, price_delta_in_cents, is_required, sort_order, is_active").order("sort_order"),
  ]);
  if (categories.error || products.error || options.error) throw new Error("Não foi possível carregar o catálogo administrativo.");
  return { categories: categories.data ?? [], products: products.data ?? [], options: options.data ?? [] };
}

async function setSupabaseProductAvailability(input: { productId: string; isActive: boolean }) {
  const client = createSupabaseAdmin();
  const { data, error } = await client.from("products").update({ is_active: input.isActive }).eq("id", input.productId).select("id, is_active").single();
  if (error || !data) throw new Error("Não foi possível atualizar a disponibilidade do produto.");
  return { id: data.id, isActive: data.is_active };
}

async function upsertSupabaseCategory(input: CategoryInput) {
  const client = createSupabaseAdmin();
  const values = { name: input.name, slug: input.slug, sort_order: input.sortOrder, is_active: input.isActive };
  const query = input.id ? client.from("categories").update(values).eq("id", input.id) : client.from("categories").insert(values);
  const { data, error } = await query.select("id, name, slug, sort_order, is_active").single();
  if (error || !data) throw new Error("Não foi possível salvar a categoria.");
  return { id: data.id, name: data.name, slug: data.slug, sortOrder: data.sort_order, isActive: data.is_active };
}

async function upsertSupabaseProduct(input: ProductInput) {
  const client = createSupabaseAdmin();
  const values = {
    category_id: input.categoryId,
    name: input.name,
    description: input.description,
    image_path: input.imagePath,
    price_in_cents: input.priceInCents,
    original_price_in_cents: input.originalPriceInCents,
    is_active: input.isActive,
    requires_configuration: input.requiresConfiguration,
  };
  const query = input.id ? client.from("products").update(values).eq("id", input.id) : client.from("products").insert(values);
  const { data, error } = await query.select("id").single();
  if (error || !data) throw new Error("Não foi possível salvar o produto.");
  const { error: deleteError } = await client.from("product_options").delete().eq("product_id", data.id);
  if (deleteError) throw new Error("Não foi possível atualizar as opções do produto.");
  if (input.options.length > 0) {
    const { error: optionsError } = await client.from("product_options").insert(input.options.map((option) => ({
      product_id: data.id,
      group_name: option.groupName,
      label: option.label,
      price_delta_in_cents: option.priceDeltaInCents,
      is_required: option.isRequired,
      sort_order: option.sortOrder,
      is_active: option.isActive,
    })));
    if (optionsError) throw new Error("Não foi possível atualizar as opções do produto.");
  }
  return { id: data.id, name: input.name };
}

function defaultAdminCatalogHandler(request: Request): Promise<Response> {
  const client = createSupabaseAdmin();
  return createAdminCatalogHandler({
    requireAdmin: createSupabaseAuthGuards(client).requireAdmin,
    getCatalog: getSupabaseCatalog,
    setProductAvailability: setSupabaseProductAvailability,
    createProductImageUpload: () => createProductImageUpload(client),
    upsertCategory: upsertSupabaseCategory,
    upsertProduct: upsertSupabaseProduct,
  })(request);
}

export default asVercelNodeHandler(defaultAdminCatalogHandler);
