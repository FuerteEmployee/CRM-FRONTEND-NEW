export const TRINETRA_PILOT_EMAIL = "info@trinetratechnoworld.com";

export const isTrinetraPilotUser = (email?: string | null): boolean => {
  if (!email) return false;
  return email.trim().toLowerCase() === TRINETRA_PILOT_EMAIL;
};
