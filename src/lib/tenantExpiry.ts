// One place to work out when a company's plan/trial ends. Used by the Super
// Admin pages, the CRM sidebar/dashboard and the expiry banner, which used to
// each do this differently (hardcoded 14/30 days, ignoring the plan).

const DAY_MS = 24 * 60 * 60 * 1000;

export interface TenantLike {
  status?: string;
  createdAt?: string;
  trial_ends_at?: string | null;
  billing_cycle_start?: string | null;
  billing_cycle_end?: string | null;
  plan_id?: { billing_cycle?: string; trial_days?: number; banner_warning_days?: number } | string | null;
}

const planOf = (t: TenantLike) => (t.plan_id && typeof t.plan_id === "object" ? t.plan_id : null);

export const isLifetimePlan = (t: TenantLike) => planOf(t)?.billing_cycle === "lifetime";

/** Plan length in days for the plan's billing cycle. */
export const cycleDays = (billingCycle?: string) =>
  billingCycle === "yearly" ? 365 : billingCycle === "lifetime" ? 36500 : 30;

/** When the current trial / billing period ends, or null when it never does. */
export const getExpiryDate = (t: TenantLike | null | undefined): Date | null => {
  if (!t) return null;
  if (isLifetimePlan(t) && t.status !== "trial") return null;
  const plan = planOf(t);

  // A trial ends at trial_ends_at; every other status at billing_cycle_end.
  const explicit = t.status === "trial" ? t.trial_ends_at : t.billing_cycle_end || t.trial_ends_at;
  if (explicit) {
    const d = new Date(explicit);
    if (!isNaN(d.getTime())) return d;
  }

  // Older companies without stored dates: start + plan length.
  const start = t.status === "trial" ? t.createdAt : t.billing_cycle_start || t.createdAt;
  if (!start) return null;
  const startMs = new Date(start).getTime();
  if (isNaN(startMs)) return null;
  const span = t.status === "trial" ? plan?.trial_days ?? 14 : cycleDays(plan?.billing_cycle);
  return new Date(startMs + span * DAY_MS);
};

/** Whole days left (rounded up), negative once ended, null when it never ends. */
export const getDaysLeft = (t: TenantLike | null | undefined): number | null => {
  const end = getExpiryDate(t);
  if (!end) return null;
  return Math.ceil((end.getTime() - Date.now()) / DAY_MS);
};

/**
 * Grace period after a plan/trial ends: the company keeps working and sees a
 * "renew now" banner; the "Subscription Expired" popup comes only after it.
 * Same length as the backend's TENANT_GRACE_DAYS (cron/tenantExpiry.js).
 */
export const GRACE_DAYS = 7;

/** Grace days left after the period ended, or null when it hasn't ended (or never ends). */
export const graceDaysLeft = (t: TenantLike | null | undefined): number | null => {
  if (!t || t.status === "expired") return t?.status === "expired" ? 0 : null;
  const days = getDaysLeft(t);
  if (days === null || days > 0) return null;
  return Math.max(0, GRACE_DAYS + days);
};

/** True once the grace period is over too (or the company is marked expired). */
export const isPastGrace = (t: TenantLike | null | undefined): boolean => {
  if (!t) return false;
  if (t.status === "expired") return true;
  const days = getDaysLeft(t);
  return days !== null && days <= -GRACE_DAYS;
};

/** True when the company's plan/trial has ended (or it is marked expired). */
export const isTenantExpired = (t: TenantLike | null | undefined): boolean => {
  if (!t) return false;
  if (t.status === "expired") return true;
  const days = getDaysLeft(t);
  return days !== null && days <= 0;
};

/** How many days before expiry the warning banner starts (set per plan). */
export const bannerWarningDays = (t: TenantLike | null | undefined): number =>
  (t && planOf(t)?.banner_warning_days) || 30;

/** Price label for a plan: "₹999/month", "₹9999/year", "₹4999 one-time". */
export const planPriceLabel = (price: number, billingCycle?: string) =>
  billingCycle === "lifetime" ? `₹${price} one-time` : `₹${price}/${billingCycle === "yearly" ? "year" : "month"}`;
