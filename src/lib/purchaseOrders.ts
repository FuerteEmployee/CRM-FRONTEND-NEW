// Purchase Orders add-on (Tenant.enabled_features "purchase_orders", switched
// on per company by the super admin — today only Trinetra). Must match
// CRM-BACKEND/src/config/tenantFeatures.js and purchase_order_routes.js.

export const PURCHASE_ORDERS_FEATURE = "purchase_orders";
export const PO_MODULE = "Purchase Orders";
export const PO_URL = "/admin/purchase-orders";

// Extra row for Setup > Roles and the staff form, shown only to tenants
// with the add-on.
export const PURCHASE_ORDERS_PERMISSION = {
  name: PO_MODULE,
  caps: ["View(Global)", "View (Own)", "Create", "Edit", "Delete", "Approve", "Manage Prices"],
};

export const hasPurchaseOrders = (user: any): boolean =>
  Array.isArray(user?.tenant?.enabled_features) &&
  user.tenant.enabled_features.includes(PURCHASE_ORDERS_FEATURE);
