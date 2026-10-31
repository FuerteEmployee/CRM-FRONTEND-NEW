import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { utilityService } from '@/api/services/utility.service';
import { useSettings } from '@/context/SettingsContext';
import { queryClient as globalQueryClient } from '@/lib/queryClient';
import { applyThemeToDom, themeCacheKey } from '@/lib/themeUtils';


const ThemeStyleContext = createContext({
  themeSettings: null,
  updateTheme: async (settings: any) => {},
  loading: true,
});

export const ThemeStyleProvider = ({ children }: { children: React.ReactNode }) => {
  const [hasAppliedInitial, setHasAppliedInitial] = useState(false);
  const { settings: globalSettings, refreshSettings } = useSettings();

  const themeSettings = React.useMemo(() => {
    const fromApi = globalSettings?.theme_style;
    
    if (fromApi) {
      localStorage.setItem(themeCacheKey(), JSON.stringify(fromApi));
      return fromApi;
    }
    
    // Fallback to cache during initial load or if API fails
    const cached = localStorage.getItem(themeCacheKey());
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [globalSettings]);

  // Apply cache immediately on mount before first paint — no preference gate
  useLayoutEffect(() => {
    const hasSession = localStorage.getItem("crm_user") || localStorage.getItem("crm_client");
    if (!hasSession) {
      clearThemeFromDom();
      return;
    }
    const cached = localStorage.getItem(themeCacheKey());
    if (cached && !hasAppliedInitial) {
      try {
        const parsed = JSON.parse(cached);
        applyThemeToDom(parsed);
        setHasAppliedInitial(true);
      } catch (e) {
        console.warn("Failed to apply cached theme", e);
      }
    }
  }, []);

  // Apply theme when fetched from API — always apply if data exists
  useEffect(() => {
    if (themeSettings) {
      applyThemeToDom(themeSettings);
      localStorage.setItem(themeCacheKey(), JSON.stringify(themeSettings));
    }
  }, [themeSettings]);

  const updateTheme = async (newTheme) => {
    try {
      // Cache and activate color mode so theme persists across page navigation
      localStorage.setItem(themeCacheKey(), JSON.stringify(newTheme));
      localStorage.setItem('crm_theme_preference', 'color');
      applyThemeToDom(newTheme);

      await utilityService.updateSettings({
        settings: [{ name: 'theme_style', value: newTheme }]
      });

      // Sync global settings context so other components see the change
      await refreshSettings();
    } catch (error) {
      console.error("Theme update failed:", error);
      throw error;
    }
  };

  return (
    <ThemeStyleContext.Provider value={{ 
      themeSettings, 
      updateTheme, 
      loading: !globalSettings 
    }}>
      {children}
    </ThemeStyleContext.Provider>
  );
};

export const useThemeStyle = () => useContext(ThemeStyleContext);
