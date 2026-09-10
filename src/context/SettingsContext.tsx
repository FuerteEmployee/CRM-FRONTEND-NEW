import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { settingsService } from "@/api/services/settings.service";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

interface SettingsContextType {
  settings: Record<string, any>;
  loading: boolean;
  getSetting: (name: string, defaultValue?: any) => any;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Record<string, any>>(() => {
    const host = window.location.hostname;
    const isTrinetra = host.includes("trinetratechnoworld") || host.includes("erp.");
    
    // logo-icon.png is NOT a real generic default — the actual file content
    // is the Trinetra logo (a pre-existing asset mix-up), so it must never be
    // used as the non-Trinetra fallback. Leaving it empty here means the real
    // fallback chain (OG Image, then the neutral monogram UI already built
    // into Login/ClientLogin) takes over correctly once refreshSettings runs.
    const defaultCompanyName = isTrinetra ? "Trinetra TechnoWorld" : "Fuerte Developers";
    const defaultLogoLight = isTrinetra ? "/trinetra-logo.jpg" : "";
    const defaultLogoDark = isTrinetra ? "/trinetra-logo.jpg" : "";
    const defaultFavicon = isTrinetra ? "/trinetra-icon.jpg" : "/favicon.ico";

    const cachedName = localStorage.getItem("crm_company_name") || defaultCompanyName;
    const cachedFavicon = localStorage.getItem("crm_favicon") || defaultFavicon;
    const cachedLogoLight = localStorage.getItem("crm_comp_logo_light") || defaultLogoLight;
    const cachedLogoDark = localStorage.getItem("crm_comp_logo_dark") || defaultLogoDark;
    
    const initial: Record<string, any> = {
      companyName: cachedName,
      favicon: cachedFavicon,
      compLogoLight: cachedLogoLight,
      compLogoDark: cachedLogoDark
    };
    return initial;
  });
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await settingsService.getSettings();
      const settingsArray = Array.isArray(response) ? response : (response?.settings || []);
      
      const settingsMap: Record<string, any> = {};
      settingsArray.forEach((s: any) => {
        let val = s.value;
        // Basic type conversion — only for string-encoded values (e.g. from
        // an <Input>). A value already stored as a real boolean/number
        // (e.g. saved from a Checkbox-driven toggle) must pass through
        // untouched: Number(true) === 1, so running this on an actual
        // boolean silently turns `true`/`false` into `1`/`0`, which then
        // fails every `=== true` check anywhere else in the app that reads
        // this setting via getSetting().
        if (typeof val === "string") {
          if (val === "true") val = true;
          else if (val === "false") val = false;
          else if (val !== "" && !isNaN(Number(val))) val = Number(val);
          else if ((val.startsWith("[") && val.endsWith("]")) || (val.startsWith("{") && val.endsWith("}"))) {
            // Array/object-valued settings (e.g. a list of named message
            // templates) are JSON-stringified before saving — parse them
            // back so getSetting() returns real data, not a JSON string.
            try { val = JSON.parse(val); } catch { /* not actually JSON — leave as string */ }
          }
        }

        settingsMap[s.name] = val;
      });

      // Most admins only ever upload one logo, not a separate light/dark
      // pair — different pages (sidebar, login hero panel, login mobile
      // view, landing navbar) intentionally read different variants
      // depending on their own background color, so uploading only one
      // left the other pages showing a placeholder instead of the logo
      // that was actually set. Falling back to whichever one IS set means
      // a single upload now covers every page; uploading both later still
      // lets each page show its own distinct variant as designed.
      if (!settingsMap.compLogoDark && settingsMap.compLogoLight) {
        settingsMap.compLogoDark = settingsMap.compLogoLight;
      } else if (!settingsMap.compLogoLight && settingsMap.compLogoDark) {
        settingsMap.compLogoLight = settingsMap.compLogoDark;
      }

      const host = window.location.hostname;
      const isTrinetra = host.includes("trinetratechnoworld") || host.includes("erp.");
      
      // Override default branding dynamically if not customized in DB or if it's default
      if (isTrinetra) {
        if (!settingsMap.companyName || settingsMap.companyName === "CRMPro" || settingsMap.companyName === "Trinetra TechnoWorld" || settingsMap.companyName === "Fuerte Developers") {
          settingsMap.companyName = "Trinetra TechnoWorld";
        }
        if (!settingsMap.compLogoLight || settingsMap.compLogoLight.startsWith("/logo") || settingsMap.compLogoLight === "") {
          settingsMap.compLogoLight = "/trinetra-logo.jpg";
        }
        if (!settingsMap.compLogoDark || settingsMap.compLogoDark.startsWith("/logo") || settingsMap.compLogoDark === "") {
          settingsMap.compLogoDark = "/trinetra-logo.jpg";
        }
        if (!settingsMap.favicon || settingsMap.favicon.startsWith("/favicon") || settingsMap.favicon === "") {
          settingsMap.favicon = "/trinetra-icon.jpg";
        }
      } else {
        if (!settingsMap.companyName || settingsMap.companyName === "CRMPro" || settingsMap.companyName === "Trinetra TechnoWorld" || settingsMap.companyName === "Fuerte Developers") {
          settingsMap.companyName = "Fuerte Developers";
        }
        // No non-Trinetra tenant has a real default logo file to fall back
        // to (logo-icon.png is mislabeled — see the comment above the
        // initial-state defaults) — fall back to the OG Image instead if
        // one's been uploaded; otherwise leave it unset so Login/ClientLogin
        // show their neutral monogram fallback rather than any wrong image.
        const fallbackLogo = settingsMap.ogImage || "";
        if (!settingsMap.compLogoLight || settingsMap.compLogoLight === "/trinetra-logo.jpg") {
          settingsMap.compLogoLight = fallbackLogo;
        }
        if (!settingsMap.compLogoDark || settingsMap.compLogoDark === "/trinetra-logo.jpg") {
          settingsMap.compLogoDark = fallbackLogo;
        }
        if (!settingsMap.favicon || settingsMap.favicon === "/trinetra-icon.jpg") {
          settingsMap.favicon = "/favicon.ico";
        }
      }
      
      setSettings(settingsMap);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  // Apply global branding dynamically
  useEffect(() => {
    if (settings.companyName) {
      document.title = settings.companyName;
      localStorage.setItem("crm_company_name", settings.companyName);
    }
    if (settings.compLogoLight) {
      localStorage.setItem("crm_comp_logo_light", settings.compLogoLight);
    }
    if (settings.compLogoDark) {
      localStorage.setItem("crm_comp_logo_dark", settings.compLogoDark);
    }
    
    if (settings.favicon) {
      const link: HTMLLinkElement = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      const faviconUrl = resolveImageUrl(settings.favicon);
      link.href = faviconUrl;
      document.getElementsByTagName('head')[0].appendChild(link);
      localStorage.setItem("crm_favicon", faviconUrl);
    }

    // Updates the live DOM's og:image/twitter:image tags for anyone with the
    // page already open. NOTE: this does NOT help the actual social-share
    // preview — Facebook/Slack/WhatsApp/Twitter crawlers fetch the raw HTML
    // and never run this JS, so they only ever see index.html's static
    // fallback tag. There's no fix for that without per-tenant server-side
    // rendering or per-tenant domains (same limitation as the login page
    // logo before it).
    // Falls back to the company logo when no dedicated OG image was
    // uploaded — better than the generic placeholder, and means a link
    // preview shows something real from the very first logo upload.
    const ogImageSource = settings.ogImage || settings.compLogoDark || settings.compLogoLight;
    if (ogImageSource) {
      const ogImageUrl = resolveImageUrl(ogImageSource);
      const setMetaContent = (selector: string, create: () => HTMLMetaElement) => {
        const el: HTMLMetaElement = document.querySelector(selector) || create();
        el.content = ogImageUrl;
        if (!el.parentNode) document.getElementsByTagName('head')[0].appendChild(el);
      };
      setMetaContent("meta[property='og:image']", () => {
        const el = document.createElement('meta');
        el.setAttribute('property', 'og:image');
        return el;
      });
      setMetaContent("meta[name='twitter:image']", () => {
        const el = document.createElement('meta');
        el.setAttribute('name', 'twitter:image');
        return el;
      });
    }

    // Apply RTL Direction
    const isClientPath = window.location.pathname === '/' || (!window.location.pathname.startsWith('/admin'));
    if (isClientPath) {
      document.documentElement.dir = settings.rtlCustomers === true ? 'rtl' : 'ltr';
    } else {
      document.documentElement.dir = settings.rtlAdmin === true ? 'rtl' : 'ltr';
    }
  }, [settings]);

  const getSetting = (name: string, defaultValue: any = "") => {
    if (settings[name] !== undefined) return settings[name];
    if (name === "companyName" && localStorage.getItem("crm_company_name")) return localStorage.getItem("crm_company_name");
    if (name === "compLogoLight" && localStorage.getItem("crm_comp_logo_light")) return localStorage.getItem("crm_comp_logo_light");
    if (name === "compLogoDark" && localStorage.getItem("crm_comp_logo_dark")) return localStorage.getItem("crm_comp_logo_dark");
    if (name === "favicon" && localStorage.getItem("crm_favicon")) return localStorage.getItem("crm_favicon");
    return defaultValue;
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, getSetting, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
