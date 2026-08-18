import { z } from "zod";
import { ApiAuthError, createSupabaseAuthGuards, type AuthenticatedProfile } from "../_lib/auth";
import { json, jsonError, methodNotAllowed } from "../_lib/http";
import { createSupabaseAdmin } from "../_lib/supabaseAdmin";

const availabilityInput = z.object({ productId: z.string().uuid(), isActive: z.boolean() });

export type AdminCatalogDependencies = {
  requireAdmin(request: Request): Promise<AuthenticatedProfile>;
  getCatalog(): Promise<unknown>;
  setProductAvailability(input: { productId: string; isActive: boolean }): Promise<{ id: string; isActive: boolean }>;
};

export function createAdminCatalogHandler(dependencies: AdminCatalogDependencies) {
  return async function adminCatalogHandler(request: Request): Promise<Response> {
    try {
      await dependencies.requireAdmin(request);
      if (request.method === "GET") return json(200, await dependencies.getCatalog());
      if (request.method !== "PATCH") return methodNotAllowed(["GET", "PATCH"]);

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
  const { data, error } = await client
    .from("products")
    .update({ is_active: input.isActive })
    .eq("id", input.productId)
    .select("id, is_active")
    .single();
  if (error || !data) throw new Error("Não foi possível atualizar a disponibilidade do produto.");
  return { id: data.id, isActive: data.is_active };
}

export default function defaultAdminCatalogHandler(request: Request): Promise<Response> {
  const client = createSupabaseAdmin();
  return createAdminCatalogHandler({
    requireAdmin: createSupabaseAuthGuards(client).requireAdmin,
    getCatalog: getSupabaseCatalog,
    setProductAvailability: setSupabaseProductAvailability,
  })(request);
}
