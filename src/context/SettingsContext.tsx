import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { settingsService } from "@/api/services/settings.service";

interface SettingsContextType {
  settings: Record<string, any>;
  loading: boolean;
  getSetting: (name: string, defaultValue?: any) => any;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Record<string, any>>({});
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
    }
    
    if (settings.favicon) {
      const link: HTMLLinkElement = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = settings.favicon;
      document.getElementsByTagName('head')[0].appendChild(link);
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
    return settings[name] !== undefined ? settings[name] : defaultValue;
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
