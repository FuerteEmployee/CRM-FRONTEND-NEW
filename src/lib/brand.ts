// Which company's branding the PRE-LOGIN pages (login, forgot password) show
// on the shared domain, where nobody is logged in yet to tell us:
//   1. ?company=<login_code> in the link   (a company's own login link)
//   2. the company last logged in on this browser
// Companies on their own domain don't need either — the backend matches the
// domain itself. After login the user's own tenant always wins on the backend.

const CODE_KEY = "crm_brand_code";
const TENANT_KEY = "crm_brand_tenant";

const safeGet = (key: string) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const safeSet = (key: string, value: string | null) => {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch { /* storage blocked — branding falls back to the default */ }
};

// Pages where nobody is logged in and the company has to be guessed. The super
// admin's own login is excluded: it must always show the platform default.
export const isPublicBrandingPage = (pathname = window.location.pathname) =>
  !pathname.startsWith("/super-admin") &&
  /\/(login|forgot-password|reset-password|signup|set-password)(\/|$)/.test(pathname);

// Reads ?company= from the link once and remembers it, so the company's logo
// stays after the login page reloads or the user comes back later.
export const getBrandCode = (): string | null => {
  try {
    const fromLink = new URLSearchParams(window.location.search).get("company");
    if (fromLink && /^[a-z0-9-]{1,40}$/i.test(fromLink)) {
      const code = fromLink.toLowerCase();
      safeSet(CODE_KEY, code);
      safeSet(TENANT_KEY, null); // an explicit company link beats an older login
      return code;
    }
  } catch { /* no window/URL — ignore */ }
  return safeGet(CODE_KEY);
};

// Called after a successful login: this browser now belongs to that company.
export const rememberBrandTenant = (tenantId?: string | null) => {
  if (!tenantId) return; // super admin (no tenant) leaves the memory as it was
  safeSet(TENANT_KEY, String(tenantId));
};

// Query params / headers for the settings request on a pre-login page.
export const brandRequestConfig = () => {
  if (!isPublicBrandingPage()) return undefined;
  const code = getBrandCode();
  const tenantId = safeGet(TENANT_KEY);
  if (code && !tenantId) return { params: { company: code } };
  if (tenantId) return { headers: { "x-tenant-id": tenantId } };
  return undefined;
};

// Favicon for a company that never uploaded one: the first letter of its name
// on a blue rounded square (same look as the sidebar's company badge).
export const letterFavicon = (name?: string | null) => {
  const letter = (String(name || "").trim().charAt(0) || "C").toUpperCase()
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="#2563eb"/>` +
    `<text x="32" y="44" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="38" font-weight="700" fill="#ffffff">${letter}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};
