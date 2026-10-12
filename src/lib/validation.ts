// Shared form rules for login accounts (company owners, admins, Setup staff,
// HRMS staff). The backend enforces the same rules in
// CRM-BACKEND/src/utils/accountUniqueness.js — one email / one mobile per
// account across the whole software, mobile exactly 10 digits.

export const PHONE_10_MESSAGE = "Mobile number must be exactly 10 digits";
export const PHONE_REQUIRED_MESSAGE = "Mobile number is required (10 digits)";

/** Keep only digits, at most 10 — use in a mobile input's onChange. */
export const clampPhone10 = (value: string) => String(value || "").replace(/\D/g, "").slice(0, 10);

/** True when the value is exactly 10 digits. */
export const isValidPhone10 = (value: unknown) => /^\d{10}$/.test(String(value ?? "").trim());

/**
 * Error text for a mobile field, or "" when fine.
 * `required` — creating an account, or editing a form that shows the field.
 */
export const phone10Error = (value: unknown, required = true) => {
  const v = String(value ?? "").trim();
  if (!v) return required ? PHONE_REQUIRED_MESSAGE : "";
  return isValidPhone10(v) ? "" : PHONE_10_MESSAGE;
};
