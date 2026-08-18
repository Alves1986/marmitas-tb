import { apiRequest } from "@/lib/api";

type ApiRequest = <T>(path: string, init?: { method?: string; body?: unknown }) => Promise<T>;

export type AdminCategoryInput = {
  id?: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
};

export type AdminProductOptionInput = {
  groupName: string;
  label: string;
  priceDeltaInCents: number;
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
};

export type AdminProductInput = {
  id?: string;
  categoryId: string;
  name: string;
  description: string | null;
  imagePath: string | null;
  priceInCents: number;
  originalPriceInCents: number | null;
  isActive: boolean;
  requiresConfiguration: boolean;
  options: AdminProductOptionInput[];
};

export type SupabaseStaffRole = "customer" | "staff" | "admin";

export type AdminStaffMember = {
  id: string;
  display_name: string | null;
  role: SupabaseStaffRole;
  created_at: string;
};

export type AdminStoreSettings = {
  storeName: string;
  deliveryFeeInCents: number;
  openingHours: string;
  paymentMode: "test" | "asaas";
  autoPrint: boolean;
};

function vercelApi<T>(path: string, init?: { method?: string; body?: unknown }) {
  return apiRequest<T>(path, {
    method: init?.method,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
}

export function createVercelAdminService(request: ApiRequest = vercelApi) {
  return {
    getCatalog: () => request<{ categories: unknown[]; products: unknown[]; options: unknown[] }>("/api/admin/catalog"),
    setProductAvailability: (productId: string, isActive: boolean) => request("/api/admin/catalog", { method: "PATCH", body: { productId, isActive } }),
    upsertCategory: (category: AdminCategoryInput) => request("/api/admin/catalog", { method: "PUT", body: { action: "upsert-category", category } }),
    upsertProduct: (product: AdminProductInput) => request("/api/admin/catalog", { method: "PUT", body: { action: "upsert-product", product } }),
    listStaff: () => request<AdminStaffMember[]>("/api/admin/staff"),
    setStaffRole: (userId: string, role: SupabaseStaffRole) => request("/api/admin/staff", { method: "PATCH", body: { userId, role } }),
    getSettings: () => request<AdminStoreSettings>("/api/admin/settings"),
    updateSettings: (settings: AdminStoreSettings) => request("/api/admin/settings", { method: "PATCH", body: settings }),
  };
}
