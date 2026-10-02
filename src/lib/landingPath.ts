// Resolves where a logged-in user should land right after login (or when
// bounced back to "their" dashboard by a route guard). A role can carry an
// ordered priority list of modules via Setup > Roles; we walk it and land on
// the first one this specific staff member can actually view (per-staff
// permission overrides can differ from the role's own baseline), falling
// through to the next entry, and finally to Dashboard if none apply.

type PermissionsMap = Record<string, Record<string, boolean>>;
type DefaultModuleEntry = { module: string; permission?: string };

function isAdminOrSuper(user: any): boolean {
  const roleName =
    typeof user?.role === "object" ? (user.role?.role || user.role?.name || "") : String(user?.role || "");
  const rk = roleName.toLowerCase();
  return !!(
    user?.is_superadmin ||
    user?.admin === true ||
    user?.admin === 1 ||
    user?.admin === "1" ||
    user?.admin === "true" ||
    rk.includes("admin") ||
    rk.includes("owner") ||
    rk.includes("super")
  );
}

function canViewFeature(permissions: PermissionsMap, feature: string, bypass: boolean): boolean {
  if (bypass) return true;
  if (!feature) return true; // items with no permission key are unrestricted
  const perms = permissions?.[feature];
  if (!perms) return false;
  return perms["View(Global)"] === true || perms["View (Own)"] === true;
}

export function getLandingPath(user: any, permissions: PermissionsMap, isStaff: boolean): string {
  if (user?.is_superadmin) return "/super-admin/dashboard";

  const basePath = isStaff ? "/staff" : "/admin";
  const bypass = isAdminOrSuper(user);
  const defaultModules: DefaultModuleEntry[] =
    (typeof user?.role === "object" ? user.role?.default_modules : undefined) || [];

  for (const entry of defaultModules) {
    if (entry?.module && canViewFeature(permissions, entry.permission || "", bypass)) {
      return `${basePath}/${entry.module}`;
    }
  }

  return `${basePath}/dashboard`;
}
