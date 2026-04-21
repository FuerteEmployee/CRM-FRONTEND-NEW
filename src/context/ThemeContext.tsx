
import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { utilityService } from '@/api/services/utility.service';
import { useQuery } from '@tanstack/react-query';
import { queryClient as globalQueryClient } from '@/lib/queryClient';
import { applyThemeToDom } from '@/lib/themeUtils';

const THEME_CACHE_KEY = 'crm_theme_style_cache';

const ThemeStyleContext = createContext({
  themeSettings: null,
  updateTheme: async (settings) => {},
  loading: true,
});

export const ThemeStyleProvider = ({ children }) => {
  const [hasAppliedInitial, setHasAppliedInitial] = useState(false);

  const { data: settings = [], isLoading, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: () => utilityService.getSettings(),
  });

  const themeSettings = React.useMemo(() => {
    const fromApi = settings.find(s => s.name === 'theme_style')?.value;
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
  }, [settings]);

  // Apply cache immediately on mount (before paint if possible)
  useLayoutEffect(() => {
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
    if (themeSettings) {
      // Small delay to ensure DOM is ready if it's the first application
      // though useLayoutEffect handles the very first mount.
      applyThemeToDom(themeSettings);
    }
  }, [themeSettings]);

  const updateTheme = async (newTheme) => {
    try {
      // Update cache immediately for instant feedback
      localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(newTheme));
      applyThemeToDom(newTheme);

      await utilityService.updateSettings({
        settings: [{ name: 'theme_style', value: newTheme }]
      });
      
      // Force invalidate and await a fresh refetch to ensure UI is in sync with DB
      globalQueryClient.invalidateQueries({ queryKey: ['settings'] });
      await refetch();
    } catch (error) {
      console.error("Theme update failed:", error);
      throw error;
    }
  };

  return (
    <ThemeStyleContext.Provider value={{ themeSettings, updateTheme, loading: isLoading }}>
      {children}
    </ThemeStyleContext.Provider>
  );
};

export const useThemeStyle = () => useContext(ThemeStyleContext);
