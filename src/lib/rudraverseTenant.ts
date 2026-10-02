import { isTrinetraPilotUser } from "./trinetraPilot";

// The Rudraverse tenant's only staff account is info@trinetratechnoworld.com,
// so gating by that email (rather than hostname) works the same on
// localhost, staging, and every production domain this tenant is served on.
export const isRudraverseTenant = (email?: string | null): boolean => isTrinetraPilotUser(email);
