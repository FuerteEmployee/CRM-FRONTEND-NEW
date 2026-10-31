
/**
 * Resolves any valid CSS color string (name, hex, rgb, etc.) to HSL format for Tailwind.
 */
export function anyToHsl(color: string): string {
  if (!color) return '0 0% 0%';

  const temp = document.createElement('div');
  temp.style.color = color;
  document.body.appendChild(temp);
  const resolved = getComputedStyle(temp).color;
  document.body.removeChild(temp);

  const rgb = resolved.match(/\d+/g);
  if (!rgb || rgb.length < 3) return '0 0% 0%';

  let r = parseInt(rgb[0]) / 255;
  let g = parseInt(rgb[1]) / 255;
  let b = parseInt(rgb[2]) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Ensures a color is in valid HEX format for the HTML color input.
 */
export function normalizeToHex(color: string): string {
  if (!color) return '#000000';
  if (color.startsWith('#') && (color.length === 4 || color.length === 7)) return color;

  const temp = document.createElement('div');
  temp.style.color = color;
  document.body.appendChild(temp);
  const resolved = getComputedStyle(temp).color;
  document.body.removeChild(temp);

  const rgb = resolved.match(/\d+/g);
  if (!rgb || rgb.length < 3) return '#000000';

  const r = parseInt(rgb[0]).toString(16).padStart(2, '0');
  const g = parseInt(rgb[1]).toString(16).padStart(2, '0');
  const b = parseInt(rgb[2]).toString(16).padStart(2, '0');

  return `#${r}${g}${b}`;
}

export const mapping: Record<string, string[]> = {
  'adminArea': [
    'sidebarBackground', '--sidebar-background',
    'sidebarForeground', '--sidebar-foreground',
    'activeItemBackground', '--sidebar-primary',
    'activeItemForeground', '--sidebar-primary-foreground',
    'headerBackground', '--header-background',
    'headerLinks', '--header-links',
    'mainContentBackground', '--main-content-bg'
  ],
  'customersArea': [
    'navigationBackground', '--customer-nav-bg',
    'navigationLinks', '--customer-nav-links',
    'footerBackground', '--customer-footer-bg',
    'footerText', '--customer-footer-text'
  ],
  'buttons': [
    'default', '--secondary',
    'primary', '--primary',
    'info', '--info',
    'success', '--success',
    'danger', '--destructive'
  ],
  'modals': [
    'headingBackground', '--modal-heading-bg',
    'headingColor', '--modal-heading-color',
    'closeButtonColor', '--modal-close-color',
    'headerTextColor', '--modal-header-text'
  ],
  'tables': [
    'linksColor', '--table-links-color',
    'linksHoverColor', '--table-links-hover-color',
    'headingsColor', '--table-headings-color',
    'itemsHeadingBg', '--items-table-heading-bg',
    'itemsHeadingText', '--items-table-heading-text'
  ],
  'general': [
    'links', '--links-color',
    'linksHover', '--links-hover-color',
    'adminLoginBg', '--admin-login-bg',
    'textMuted', '--text-muted',
    'textDanger', '--text-danger',
    'textWarning', '--text-warning',
    'textInfo', '--text-info',
    'textSuccess', '--text-success'
  ],
  'tags': [
    'adsLeads', '--tag-adsleads',
    'brijTag', '--tag-brijtag',
    'ceramic', '--tag-ceramic',
    'closedToday', '--tag-closedtoday',
    'education', '--tag-education',
    'furniture', '--tag-furniture',
    'god', '--tag-god',
    'homeopathy', '--tag-homeopathy',
    'hospital', '--tag-hospital',
    'jaimin', '--tag-jaimin',
    'jaiminfollowups', '--tag-jaiminfollowups',
    'jewellery', '--tag-jewellery',
    'meetingDoneWithAdil', '--tag-meetingdonewithadil',
    'meetingDoneWithYagnesh', '--tag-meetingdonewithyagnesh',
    'metaAds', '--tag-metaads',
    'morbi', '--tag-morbi',
    'naturopathy', '--tag-naturopathy',
    'podcast', '--tag-podcast',
    'solidSurface', '--tag-solidsurface',
    'studyRoomReferral', '--tag-studyroomreferral',
    'supermarket', '--tag-supermarket',
    'tiles', '--tag-tiles',
    'warm', '--tag-warm',
    'yagnesh', '--tag-yagnesh'
  ],
};

export const clearThemeFromDom = () => {
  const root = document.documentElement;
  Object.values(mapping).forEach(pairs => {
    for (let i = 0; i < pairs.length; i += 2) {
      const variable = pairs[i + 1];
      root.style.removeProperty(variable);
      if (variable === '--primary') {
        root.style.removeProperty('--ring');
      }
    }
  });

  const removeStyle = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  };

  removeStyle('custom-css-both');
  removeStyle('custom-css-admin');
  removeStyle('custom-css-customers');
};

export const applyThemeToDom = (theme: any) => {
  const root = document.documentElement;

  if (!theme) return;



  Object.entries(mapping).forEach(([section, pairs]) => {
    const themeSection = theme[section];
    if (!themeSection) return;

    for (let i = 0; i < pairs.length; i += 2) {
      const key = pairs[i];
      const variable = pairs[i + 1];
      if (themeSection[key]) {
        root.style.setProperty(variable, anyToHsl(themeSection[key]));
        if (variable === '--primary') {
          root.style.setProperty('--ring', anyToHsl(themeSection[key]));
        }
      }
    }
  });

  // Inject Custom CSS overrides
  if (theme.customCss) {
    const injectCustomCss = (id: string, css: string, layoutSelector: string = '') => {
      let styleTag = document.getElementById(id);
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = id;
        document.head.appendChild(styleTag);
      }

      if (!css) {
        styleTag.innerHTML = '';
        return;
      }

      // If a layout selector is provided, attempt to gently prefix rules, 
      // otherwise inject raw. Raw injection is usually preferred for advanced user CSS.
      // We will wrap the payload in the layout selector if needed.
      if (layoutSelector) {
        // This is a naive wrapping, but works for most broad CSS nesting if browsers support it,
        // or we just inject it assuming the user wrote it correctly. For robustness, 
        // we'll just inject the raw text inside a standard media/layer or let the user scope it.
        // Actually, CSS nesting is now widely supported. We can just wrap it:
        styleTag.innerHTML = `${layoutSelector} { ${css} }`;
      } else {
        styleTag.innerHTML = css;
      }
    };

    injectCustomCss('custom-css-both', theme.customCss.both);

    // For admin-only or customer-only areas, it's safer if the user scopes it themselves, 
    // but if we want to ensure it, we can wrap it in generic layout classes.
    // Assuming ".admin-layout" and ".customer-layout" don't strictly exist globally on the body yet,
    // we'll inject the raw CSS since advanced users will target their own #ids anyway.
    injectCustomCss('custom-css-admin', theme.customCss.admin);
    injectCustomCss('custom-css-customers', theme.customCss.customers);
    syncAreaCss();
  }
};

// ── Theme Style > Custom CSS: "Admin Area" vs "Customers Area" ─────────────
// Both are injected as-is; only the one for the current part of the app is
// enabled (App.tsx calls setCssArea on every route change).
export type CssArea = "admin" | "customers";
let currentCssArea: CssArea = "admin";

// Customer portal routes (ClientLayout in App.tsx) and the client login.
const CUSTOMER_AREA_ROOTS = ["client", "dashboard", "projects", "invoices", "contracts", "estimates", "proposals", "support", "knowledge-base"];
export const cssAreaForPath = (pathname: string): CssArea =>
  CUSTOMER_AREA_ROOTS.includes(pathname.split("/").filter(Boolean)[0] || "") ? "customers" : "admin";

const syncAreaCss = () => {
  // Setting innerHTML recreates the sheet, so re-apply after every injection.
  const admin = document.getElementById('custom-css-admin') as HTMLStyleElement | null;
  const customers = document.getElementById('custom-css-customers') as HTMLStyleElement | null;
  if (admin?.sheet) admin.sheet.disabled = currentCssArea !== "admin";
  if (customers?.sheet) customers.sheet.disabled = currentCssArea !== "customers";
};

export const setCssArea = (area: CssArea) => {
  currentCssArea = area;
  syncAreaCss();
};

// ── Theme cache: one per company, so a shared browser never shows another
// company's colours / CSS before the settings load. ──────────────────────
export const themeCacheKey = (): string => {
  let id = "";
  try {
    const user = JSON.parse(localStorage.getItem("crm_user") || "null");
    id = String(user?.tenant?._id || user?.tenant_id || "");
    if (!id) id = localStorage.getItem("crm_brand_tenant") || localStorage.getItem("crm_brand_code") || "";
  } catch {
    /* storage unavailable */
  }
  return `crm_theme_style_cache${id ? ":" + id : ""}`;
};
