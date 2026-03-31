import { usePermissionContext } from "@/context/PermissionContext";

export const usePermissions = () => {
    const { user, permissions, isAdmin, can, canView, refreshPermissions } = usePermissionContext();

    return {
        user,
        permissions,
        isAdmin,
        can,
        canView,
        refreshPermissions,
    };
};
