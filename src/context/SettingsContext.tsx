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
    const cachedName = localStorage.getItem("crm_company_name");
    const cachedFavicon = localStorage.getItem("crm_favicon");
    const cachedLogoLight = localStorage.getItem("crm_comp_logo_light");
    const cachedLogoDark = localStorage.getItem("crm_comp_logo_dark");
    const initial: Record<string, any> = {};
    if (cachedName) initial.companyName = cachedName;
    if (cachedFavicon) initial.favicon = cachedFavicon;
    if (cachedLogoLight) initial.compLogoLight = cachedLogoLight;
    if (cachedLogoDark) initial.compLogoDark = cachedLogoDark;
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
        // Basic type conversion
        if (val === "true") val = true;
        else if (val === "false") val = false;
        else if (!isNaN(Number(val)) && val !== "" && val !== null) val = Number(val);
        
        settingsMap[s.name] = val;
      });
      
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
