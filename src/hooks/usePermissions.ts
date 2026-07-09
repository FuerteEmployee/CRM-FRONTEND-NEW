import { usePermissionContext } from "@/context/PermissionContext";

export const usePermissions = () => {
    const { user, permissions, planModules, isAdmin, isStaff, can, canView, isModuleEnabled, refreshPermissions } = usePermissionContext();

    return {
        user,
        permissions,
        planModules,
        isAdmin,
        isStaff,
        can,
        canView,
        isModuleEnabled,
        refreshPermissions,
    };
};
