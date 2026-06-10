import { useState, useEffect } from "react";
import { clearThemeFromDom, applyThemeToDom } from "@/lib/themeUtils";

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark" | "color">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("crm_theme_preference");
      if (stored === "dark" || stored === "light" || stored === "color") return stored;
      return document.documentElement.classList.contains("dark") ? "dark" : 
             document.documentElement.classList.contains("color") ? "color" : "light";
    }
    return "light";
  });

  useEffect(() => {
    document.documentElement.classList.remove("dark", "color");
    if (theme !== "light") {
      document.documentElement.classList.add(theme);
    }
    
    if (theme === "light" || theme === "dark") {
      clearThemeFromDom();
    } else if (theme === "color") {
      const cached = localStorage.getItem("crm_theme_style_cache");
      if (cached) {
        try {
          applyThemeToDom(JSON.parse(cached));
        } catch(e) {}
      }
    }
    
    localStorage.setItem("crm_theme_preference", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark")); // Kept for backwards compatibility if used elsewhere

  return { theme, toggleTheme, setTheme };
}
