import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { utilityService } from '@/api/services/utility.service';
import { useSettings } from '@/context/SettingsContext';
import { queryClient as globalQueryClient } from '@/lib/queryClient';
import { applyThemeToDom } from '@/lib/themeUtils';

const THEME_CACHE_KEY = 'crm_theme_style_cache';

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
      localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(fromApi));
      return fromApi;
    }
    
    // Fallback to cache during initial load or if API fails
    const cached = localStorage.getItem(THEME_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [globalSettings]);

  // Apply cache immediately on mount (before paint if possible)
  useLayoutEffect(() => {
    const pref = localStorage.getItem('crm_theme_preference');
    if (pref !== 'color') return; // Do not inject inline styles if not in color mode

    const cached = localStorage.getItem(THEME_CACHE_KEY);
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

  // Apply theme when fetched from API
  useEffect(() => {
    const pref = localStorage.getItem('crm_theme_preference');
    if (themeSettings && pref === 'color') {
      applyThemeToDom(themeSettings);
    }
  }, [themeSettings]);

  const updateTheme = async (newTheme) => {
    try {
      // Update cache immediately for instant feedback
      localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(newTheme));
      
      const pref = localStorage.getItem('crm_theme_preference');
      if (pref === 'color') {
        applyThemeToDom(newTheme);
      }

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
