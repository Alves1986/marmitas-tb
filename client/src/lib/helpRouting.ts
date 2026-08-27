import type { HelpSurface } from "@shared/helpContent";

export type HelpLauncherSurface = Exclude<HelpSurface, "totem" | "calls">;

export function getHelpSurface(path: string): HelpLauncherSurface | null {
  if (path === "/" || path.startsWith("/ajuda/pedidos")) return "storefront";
  if (path.startsWith("/acompanhar")) return "tracking";
  if (path.startsWith("/admin") || path.startsWith("/ajuda/gestao")) return "admin";
  if (path.startsWith("/operacao/estoque")) return "inventory";
  if (path.startsWith("/operacao/cozinha")) return "kitchen";
  if (path.startsWith("/operacao/pdv")) return "counter";
  if (path.startsWith("/operacao")) return "operations";
  return null;
}

export function canDisplayHelpLauncher(surface: HelpLauncherSurface, role: "customer" | "user" | "staff" | "admin" | null) {
  if (surface === "storefront" || surface === "tracking") return true;
  return role === "staff" || role === "admin";
}
