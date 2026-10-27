// Round 29 (S2): View / Edit / Delete icons on the Orders and Approvals rows —
// enabled or disabled with the reason as the tooltip. Mirrors
// CRM-BACKEND/src/services/poActions.js (the API answers with the same words).

export const LOCKED: Record<string, string> = {
  pending_approval: "Pending POs are locked",
  approved: "Approved POs are locked",
  sent: "Approved POs are locked",
  partially_received: "Approved POs are locked",
  received: "Approved POs are locked",
  cancelled: "Cancelled POs are locked",
};
export const NO_PERMISSION = "No permission";
export const HAS_PROFORMA = "Has a proforma invoice";
export const OLD_SALES = "Old Sales POs are read-only";

type Perms = { canEdit?: boolean; canDelete?: boolean; hasProforma?: boolean };
type Po = { type?: string; status?: string; has_proforma?: boolean };

export const editBlock = (po: Po, { canEdit }: Perms): string | null => {
  if (po?.type === "sales") return OLD_SALES;
  if (!canEdit) return NO_PERMISSION;
  if (po?.status !== "draft") return LOCKED[po?.status || ""] || "This PO is locked";
  return null;
};

export const deleteBlock = (po: Po, { canDelete, hasProforma }: Perms): string | null => {
  if (!canDelete) return NO_PERMISSION;
  const pf = hasProforma ?? po?.has_proforma;
  // Round 30: a locked PO that also has a proforma says both (status first).
  if (!["draft", "cancelled"].includes(po?.status || "")) {
    const locked = LOCKED[po?.status || ""] || "This PO is locked";
    return pf ? `${locked} · has a proforma invoice` : locked;
  }
  if (pf) return HAS_PROFORMA;
  return null;
};

export type ActionState = { enabled: boolean; reason: string | null };
export const rowActions = (po: Po, perms: Perms): { view: ActionState; edit: ActionState; delete: ActionState } => {
  const e = editBlock(po, perms);
  const d = deleteBlock(po, perms);
  return { view: { enabled: true, reason: null }, edit: { enabled: !e, reason: e }, delete: { enabled: !d, reason: d } };
};

export const deleteConfirmText = (poNumber: string) => `Delete PO ${poNumber}? This can't be undone.`;

// Proforma rows: view always; edit only a draft; cancel unless already cancelled.
export const proformaActions = (pf: { status?: string }, { canEdit }: { canEdit: boolean }) => ({
  view: { enabled: true, reason: null as string | null },
  edit: !canEdit
    ? { enabled: false, reason: NO_PERMISSION }
    : pf?.status === "draft"
      ? { enabled: true, reason: null }
      : { enabled: false, reason: pf?.status === "sent" ? "Sent proformas are locked" : "Cancelled proformas are locked" },
  cancel: !canEdit
    ? { enabled: false, reason: NO_PERMISSION }
    : pf?.status === "cancelled"
      ? { enabled: false, reason: "Already cancelled" }
      : { enabled: true, reason: null },
});

// PO Items rows: view always; edit / delete need Manage Prices; an item used on
// a PO can't be deleted — it is switched off instead (the server says so).
export const poItemActions = ({ canManage }: { canManage: boolean }) => ({
  view: { enabled: true, reason: null as string | null },
  edit: canManage ? { enabled: true, reason: null } : { enabled: false, reason: NO_PERMISSION },
  delete: canManage ? { enabled: true, reason: null } : { enabled: false, reason: NO_PERMISSION },
});
