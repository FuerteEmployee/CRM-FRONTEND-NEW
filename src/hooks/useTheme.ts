import { useState, useEffect } from "react";

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
    localStorage.setItem("crm_theme_preference", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark")); // Kept for backwards compatibility if used elsewhere

  return { theme, toggleTheme, setTheme };
}
