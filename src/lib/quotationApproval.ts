// Quotation approval add-on (Tenant.enabled_features "quotation_approval",
// switched on per company by the super admin). Must match
// CRM-BACKEND/src/controllers/quotation_controller.js.

export const QUOTATION_APPROVAL_FEATURE = "quotation_approval";

// Extra row for Setup > Roles, shown only to tenants with the add-on.
export const QUOTATION_APPROVE_PERMISSION = { name: "Quotations", caps: ["Approve"] };

export const hasQuotationApproval = (user: any): boolean =>
  Array.isArray(user?.tenant?.enabled_features) &&
  user.tenant.enabled_features.includes(QUOTATION_APPROVAL_FEATURE);
