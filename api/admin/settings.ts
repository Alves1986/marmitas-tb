import { z } from "zod";
import { ApiAuthError, createSupabaseAuthGuards, type AuthenticatedProfile } from "../../server/vercel/_lib/auth";
import { json, jsonError, methodNotAllowed } from "../../server/vercel/_lib/http";
import { createSupabaseAdmin } from "../../server/vercel/_lib/supabaseAdmin";

const settingsInput = z.object({
  storeName: z.string().trim().min(1).max(160),
  deliveryFeeInCents: z.number().int().nonnegative().max(100_000),
  openingHours: z.string().trim().min(1).max(1_000),
  paymentMode: z.enum(["test", "asaas"]),
  autoPrint: z.boolean(),
});

export type StoreSettings = z.infer<typeof settingsInput>;

export type AdminSettingsDependencies = {
  requireAdmin(request: Request): Promise<AuthenticatedProfile>;
  getSettings(): Promise<StoreSettings>;
  updateSettings(input: StoreSettings & { actorUserId: string }): Promise<StoreSettings>;
};

export function createAdminSettingsHandler(dependencies: AdminSettingsDependencies) {
  return async function adminSettingsHandler(request: Request): Promise<Response> {
    try {
      const actor = await dependencies.requireAdmin(request);
      if (request.method === "GET") return json(200, await dependencies.getSettings());
      if (request.method !== "PATCH") return methodNotAllowed(["GET", "PATCH"]);
      const input = settingsInput.safeParse(await request.json());
      if (!input.success) return jsonError(400, "Configurações inválidas.");
      return json(200, await dependencies.updateSettings({ ...input.data, actorUserId: actor.id }));
    } catch (error) {
      if (error instanceof ApiAuthError) return jsonError(error.statusCode, error.message);
      return jsonError(500, error);
    }
  };
}

const defaultSettings: StoreSettings = {
  storeName: "Marmitas TB",
  deliveryFeeInCents: 500,
  openingHours: "Segunda a sábado, 10h às 14h",
  paymentMode: "test",
  autoPrint: true,
};

async function getSupabaseSettings(): Promise<StoreSettings> {
  const client = createSupabaseAdmin();
  const { data, error } = await client.from("store_settings").select("setting_key, setting_value");
  if (error) throw new Error("Não foi possível carregar as configurações.");
  const values = new Map((data ?? []).map((entry) => [entry.setting_key, entry.setting_value]));
  const raw = {
    storeName: values.get("storeName") ?? defaultSettings.storeName,
    deliveryFeeInCents: values.get("deliveryFeeInCents") ?? defaultSettings.deliveryFeeInCents,
    openingHours: values.get("openingHours") ?? defaultSettings.openingHours,
    paymentMode: values.get("paymentMode") ?? defaultSettings.paymentMode,
    autoPrint: values.get("autoPrint") ?? defaultSettings.autoPrint,
  };
  const parsed = settingsInput.safeParse(raw);
  return parsed.success ? parsed.data : defaultSettings;
}

async function updateSupabaseSettings(input: StoreSettings & { actorUserId: string }): Promise<StoreSettings> {
  const client = createSupabaseAdmin();
  const entries = Object.entries({
    storeName: input.storeName,
    deliveryFeeInCents: input.deliveryFeeInCents,
    openingHours: input.openingHours,
    paymentMode: input.paymentMode,
    autoPrint: input.autoPrint,
  }).map(([setting_key, setting_value]) => ({ setting_key, setting_value, updated_by_user_id: input.actorUserId }));
  const { error } = await client.from("store_settings").upsert(entries, { onConflict: "setting_key" });
  if (error) throw new Error("Não foi possível atualizar as configurações.");
  return getSupabaseSettings();
}

export default function defaultAdminSettingsHandler(request: Request): Promise<Response> {
  const client = createSupabaseAdmin();
  return createAdminSettingsHandler({
    requireAdmin: createSupabaseAuthGuards(client).requireAdmin,
    getSettings: getSupabaseSettings,
    updateSettings: updateSupabaseSettings,
  })(request);
}
