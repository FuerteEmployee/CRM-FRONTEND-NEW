import { usePermissionContext } from "@/context/PermissionContext";
import SetupRolesNew from "./SetupRolesNew";
import SetupRolesLegacy from "./SetupRolesLegacy";

// Per-tenant opt-in switch (see Tenant.enabled_beta_features) — only tenants
// with "new_roles_layout" in that list get the redesigned Setup > Roles &
// Permissions page; every other tenant keeps the previous layout unchanged.
export default function SetupRoles() {
  const { user } = usePermissionContext();
  const enabledBetaFeatures: string[] = (user as any)?.tenant?.enabled_beta_features || [];
  const useNewLayout = enabledBetaFeatures.includes("new_roles_layout");

  return useNewLayout ? <SetupRolesNew /> : <SetupRolesLegacy />;
}
