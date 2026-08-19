import { json, jsonError, methodNotAllowed } from "../../server/vercel/_lib/http.js";
import { createSupabasePublic } from "../../server/vercel/_lib/supabasePublic.js";

type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
};

type MenuOption = {
  id: string;
  groupName: string;
  label: string;
  priceDeltaInCents: number;
  isRequired: boolean;
  sortOrder: number;
};

type MenuProduct = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imagePath: string | null;
  priceInCents: number;
  originalPriceInCents: number | null;
  requiresConfiguration: boolean;
  options: MenuOption[];
};

type MenuPayload = {
  categories: MenuCategory[];
  products: MenuProduct[];
};

export type MenuRepository = {
  listMenu(): Promise<MenuPayload>;
};

type RawCategory = { id: string; name: string; slug: string; sort_order: number };
type RawProduct = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  image_path: string | null;
  price_in_cents: number;
  original_price_in_cents: number | null;
  requires_configuration: boolean;
};
type RawOption = {
  id: string;
  product_id: string;
  group_name: string;
  label: string;
  price_delta_in_cents: number;
  is_required: boolean;
  sort_order: number;
};

async function listSupabaseMenu(): Promise<MenuPayload> {
  const client = createSupabasePublic();
  const [categoryResult, productResult, optionResult] = await Promise.all([
    client.from("categories").select("id, name, slug, sort_order").eq("is_active", true).order("sort_order"),
    client
      .from("products")
      .select("id, category_id, name, description, image_path, price_in_cents, original_price_in_cents, requires_configuration")
      .eq("is_active", true)
      .order("name"),
    client
      .from("product_options")
      .select("id, product_id, group_name, label, price_delta_in_cents, is_required, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  if (categoryResult.error || productResult.error || optionResult.error) {
    throw new Error("Não foi possível carregar o cardápio.");
  }

  const optionsByProduct = new Map<string, MenuOption[]>();
  for (const option of (optionResult.data ?? []) as RawOption[]) {
    const options = optionsByProduct.get(option.product_id) ?? [];
    options.push({
      id: option.id,
      groupName: option.group_name,
      label: option.label,
      priceDeltaInCents: option.price_delta_in_cents,
      isRequired: option.is_required,
      sortOrder: option.sort_order,
    });
    optionsByProduct.set(option.product_id, options);
  }

  return {
    categories: ((categoryResult.data ?? []) as RawCategory[]).map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      sortOrder: category.sort_order,
    })),
    products: ((productResult.data ?? []) as RawProduct[]).map((product) => ({
      id: product.id,
      categoryId: product.category_id,
      name: product.name,
      description: product.description,
      imagePath: product.image_path,
      priceInCents: product.price_in_cents,
      originalPriceInCents: product.original_price_in_cents,
      requiresConfiguration: product.requires_configuration,
      options: optionsByProduct.get(product.id) ?? [],
    })),
  };
}

export function createMenuHandler(repository: MenuRepository) {
  return async function menuHandler(request: Request): Promise<Response> {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);

    try {
      return json(200, await repository.listMenu());
    } catch (error) {
      return jsonError(500, error);
    }
  };
}

export default createMenuHandler({ listMenu: listSupabaseMenu });
