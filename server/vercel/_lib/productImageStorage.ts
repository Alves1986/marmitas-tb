import type { SupabaseClient } from "@supabase/supabase-js";

export const PRODUCT_IMAGE_BUCKET = "marmitas-tb-assets";

export async function createProductImageUpload(client: SupabaseClient): Promise<{ path: string; token: string }> {
  const path = `catalog/products/${crypto.randomUUID()}.webp`;
  const { data, error } = await client.storage.from(PRODUCT_IMAGE_BUCKET).createSignedUploadUrl(path);

  if (error || !data?.token) throw new Error("Não foi possível preparar o envio da foto do produto.");
  return { path, token: data.token };
}
