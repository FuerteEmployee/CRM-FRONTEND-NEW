import { isTrinetraPilotUser } from "./trinetraPilot";
import { isEkagraUser } from "./ekagraTenant";

// Bank Details is shared by the Trinetra pilot tenant and Ekagra Engineering,
// kept as its own check rather than folded into isTrinetraPilotUser since that
// flag also gates unrelated Trinetra-only features.
export const canAccessBankDetails = (email?: string | null): boolean =>
  isTrinetraPilotUser(email) || isEkagraUser(email);
