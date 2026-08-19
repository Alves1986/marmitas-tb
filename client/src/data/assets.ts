export const SUPABASE_PUBLIC_ASSET_BASE_URL = "https://hwkgplnzvcaobjozfmqx.supabase.co/storage/v1/object/public/marmitas-tb-assets";

export function catalogAsset(fileName: string) {
  return `${SUPABASE_PUBLIC_ASSET_BASE_URL}/catalog/${fileName}`;
}

export function brandAsset(fileName: string) {
  return `${SUPABASE_PUBLIC_ASSET_BASE_URL}/brand/${fileName}`;
}
