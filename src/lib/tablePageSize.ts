// Setup > Settings > Misc > "Tables Pagination Limit": the starting "rows per
// page" of the list pages. SettingsContext caches it here so a page can read
// it synchronously for its initial state.

const KEY = "crm_table_page_size";
const ALLOWED = [10, 25, 50, 100];

export const cacheTablePageSize = (value: unknown) => {
  try {
    const n = parseInt(String(value ?? ""), 10);
    if (n > 0) localStorage.setItem(KEY, String(n));
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable — pages keep their own default */
  }
};

/** The configured page size (snapped to 10/25/50/100), else `fallback`. */
export const defaultPageSize = (fallback: number): number => {
  let n = 0;
  try {
    n = parseInt(localStorage.getItem(KEY) || "", 10);
  } catch {
    /* ignore */
  }
  if (!n || n <= 0) return fallback;
  return ALLOWED.reduce((best, v) => (Math.abs(v - n) < Math.abs(best - n) ? v : best), ALLOWED[0]);
};
