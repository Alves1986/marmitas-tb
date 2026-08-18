import { categories, products } from "../client/src/data/catalog.ts";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias para a migração do catálogo.");
}

const apiBase = `${url}/rest/v1`;
const storageBase = `${url}/storage/v1/object/public/marmitas-tb-assets/catalog`;
const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

async function request(path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ao acessar ${path}: ${text}`);
  return text ? JSON.parse(text) : null;
}

function cents(value) {
  return Math.round(Number(value) * 100);
}

function imagePath(imageUrl) {
  if (!imageUrl) return null;
  return `${storageBase}/${imageUrl.split("/").pop()}`;
}

const categoryIds = new Map();
for (const [sortOrder, category] of categories.entries()) {
  const existing = await request(`/categories?slug=eq.${encodeURIComponent(category.id)}&select=id&limit=1`);
  if (existing.length) {
    categoryIds.set(category.id, existing[0].id);
    continue;
  }
  const inserted = await request("/categories", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ name: category.label, slug: category.id, sort_order: sortOrder, is_active: true }),
  });
  categoryIds.set(category.id, inserted[0].id);
}

let createdProducts = 0;
let createdOptions = 0;
for (const product of products) {
  const categoryId = categoryIds.get(product.categoryId);
  const existing = await request(`/products?category_id=eq.${categoryId}&name=eq.${encodeURIComponent(product.name)}&select=id&limit=1`);
  let productId = existing[0]?.id;
  if (!productId) {
    const inserted = await request("/products", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        category_id: categoryId,
        name: product.name,
        description: product.description ?? null,
        image_path: imagePath(product.imageUrl),
        price_in_cents: cents(product.price),
        original_price_in_cents: product.originalPrice == null ? null : cents(product.originalPrice),
        is_active: true,
        requires_configuration: Boolean(product.options?.length),
      }),
    });
    productId = inserted[0].id;
    createdProducts += 1;
  }

  const currentOptions = await request(`/product_options?product_id=eq.${productId}&select=id&limit=1`);
  if (currentOptions.length || !product.options?.length) continue;
  const rows = product.options.flatMap((group, groupIndex) => group.options.map((option, optionIndex) => ({
    product_id: productId,
    group_name: group.label,
    label: option.label,
    price_delta_in_cents: cents(option.priceAdjustment),
    is_required: Boolean(group.required),
    sort_order: groupIndex * 100 + optionIndex,
    is_active: true,
  })));
  if (rows.length) {
    await request("/product_options", { method: "POST", body: JSON.stringify(rows) });
    createdOptions += rows.length;
  }
}

console.log(JSON.stringify({ categories: categories.length, productsCreated: createdProducts, optionsCreated: createdOptions }));
