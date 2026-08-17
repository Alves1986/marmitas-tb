export type OperationalRole = "user" | "admin" | "staff";

export function canAccessOperation(role: OperationalRole): boolean {
  return role === "admin" || role === "staff";
}

export function canManageCatalog(role: OperationalRole): boolean {
  return role === "admin";
}

export function canManageStoreSettings(role: OperationalRole): boolean {
  return role === "admin";
}
