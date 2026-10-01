export const EKAGRA_EMAIL = "ekagraengineering@gmail.com";

export const isEkagraUser = (email?: string | null): boolean => {
  if (!email) return false;
  return email.trim().toLowerCase() === EKAGRA_EMAIL;
};
