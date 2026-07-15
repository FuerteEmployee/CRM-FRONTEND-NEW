import React, { createContext, useContext, useEffect, useState } from "react";
import { settingsApi } from "@/hrms/services/api";

function hexToHSL(hex: string): string {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
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

function hslToHex(hslStr: string): string {
  const parts = hslStr.replace(/%/g, "").split(" ");
  const h = parseInt(parts[0]);
  const s = parseInt(parts[1]) / 100;
  const l = parseInt(parts[2]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

interface ThemeContextType {
  primaryColor: string;
  primaryHex: string;
  buttonColor: string;
  buttonTextColor: string;
  textColor: string;
  sidebarBgColor: string;
  sidebarInactiveColor: string;
  sidebarActiveColor: string;
  bodyBgColor: string;
  bodyTextColor: string;
  navbarBgColor: string;
  navbarTextColor: string;
  setPrimaryColor: (hsl: string) => void;
  setPrimaryHex: (hex: string) => void;
  setButtonColor: (hex: string) => void;
  setButtonTextColor: (hex: string) => void;
  setTextColor: (hex: string) => void;
  setSidebarBgColor: (hex: string) => void;
  setSidebarInactiveColor: (hex: string) => void;
  setSidebarActiveColor: (hex: string) => void;
  setBodyBgColor: (hex: string) => void;
  setBodyTextColor: (hex: string) => void;
  setNavbarBgColor: (hex: string) => void;
  setNavbarTextColor: (hex: string) => void;
  logo: string;
  setLogo: (url: string) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [primaryColor, setPrimaryColorState] = useState("215 41% 39%");
  const [primaryHex, setPrimaryHexState] = useState("#3B5E8C");
  const [buttonColor, setButtonColor] = useState("#3A3F8D");
  const [buttonTextColor, setButtonTextColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#1C1B1D");
  const [sidebarBgColor, setSidebarBgColor] = useState("#ffffff");
  const [sidebarInactiveColor, setSidebarInactiveColor] = useState("#6b7280");
  const [sidebarActiveColor, setSidebarActiveColor] = useState("#3B5E8C");
  const [bodyBgColor, setBodyBgColor] = useState("#f8fafc");
  const [bodyTextColor, setBodyTextColor] = useState("#1C1B1D");
  const [navbarBgColor, setNavbarBgColor] = useState("#ffffff");
  const [navbarTextColor, setNavbarTextColor] = useState("#1e293b");
  const [logo, setLogo] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Helper to determine if a color is light or dark for contrast
  const getContrastColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? "0 0% 0%" : "0 0% 100%"; // black or white in HSL format
  };

  const applyTheme = (colors: {
    primary?: string;
    button?: string;
    buttonText?: string;
    text?: string;
    sidebarBg?: string;
    sidebarInactive?: string;
    sidebarActive?: string;
    bodyBg?: string;
    bodyText?: string;
    navbarBg?: string;
    navbarText?: string;
  }) => {
    const root = document.documentElement;
    
    if (colors.primary) {
      const hex = colors.primary.startsWith("#") ? colors.primary : hslToHex(colors.primary);
      const hsl = hexToHSL(hex);
      const [h, s, l] = hsl.split(" ").map(v => v.replace("%", ""));
      const contrast = getContrastColor(hex);
      
      root.style.setProperty("--primary", hsl);
      root.style.setProperty("--primary-foreground", contrast);
      root.style.setProperty("--ring", hsl);
      root.style.setProperty("--sidebar-primary", hsl);
      root.style.setProperty("--sidebar-ring", hsl);
      
      // Secondary/Accent calculations
      const secondaryHsl = `${h} ${Math.max(0, Number(s) - 40)}% ${Math.min(100, Number(l) + 50)}%`;
      root.style.setProperty("--secondary", secondaryHsl);
      root.style.setProperty("--secondary-foreground", `${h} ${s}% 20%`);
      const accentHsl = `${h} ${Math.max(0, Number(s) - 10)}% 96%`;
      root.style.setProperty("--accent", accentHsl);
      root.style.setProperty("--accent-foreground", `${h} ${s}% 25%`);
      root.style.setProperty("--muted", `${h} 10% 96%`);
      root.style.setProperty("--muted-foreground", `${h} 15% 45%`);
      root.style.setProperty("--sidebar-accent", accentHsl);
      root.style.setProperty("--sidebar-accent-foreground", `${h} ${s}% 25%`);

      // Icons and brand accents
      root.style.setProperty("--brand-color", hsl);

      // Brand gradient for non-button elements (like login sidebar)
      root.style.setProperty("--gradient-brand", `linear-gradient(135deg, hsl(${hsl}), hsl(${hsl} / 0.85))`);
    }

    if (colors.button) {
      const hex = colors.button.startsWith("#") ? colors.button : hslToHex(colors.button);
      const hsl = hexToHSL(hex);

      root.style.setProperty("--button-bg", hsl);
      root.style.setProperty("--button-color", hsl);

      const buttonGradient = `linear-gradient(135deg, hsl(${hsl}), hsl(${hsl} / 0.85))`;
      root.style.setProperty("--gradient-button", buttonGradient);
      root.style.setProperty("--gradient-primary", buttonGradient);
      root.style.setProperty("--shadow-glow-color", hsl);
    }

    if (colors.buttonText) {
      const hex = colors.buttonText.startsWith("#") ? colors.buttonText : hslToHex(colors.buttonText);
      const hsl = hexToHSL(hex);
      root.style.setProperty("--button-foreground", hsl);
      root.style.setProperty("--primary-foreground", hsl);
    }

    if (colors.text) {
      const hex = colors.text.startsWith("#") ? colors.text : hslToHex(colors.text);
      const hsl = hexToHSL(hex);
      root.style.setProperty("--foreground", hsl);
      root.style.setProperty("--text-color", hsl);
      root.style.setProperty("--card-foreground", hsl);
      root.style.setProperty("--popover-foreground", hsl);
    }

    if (colors.sidebarBg) {
      const hex = colors.sidebarBg.startsWith("#") ? colors.sidebarBg : hslToHex(colors.sidebarBg);
      const hsl = hexToHSL(hex);
      root.style.setProperty("--sidebar-background", hsl);
    }

    if (colors.sidebarInactive) {
      const hex = colors.sidebarInactive.startsWith("#") ? colors.sidebarInactive : hslToHex(colors.sidebarInactive);
      const hsl = hexToHSL(hex);
      // Only sidebar — does NOT touch global --muted-foreground
      root.style.setProperty("--sidebar-foreground", hsl);
      root.style.setProperty("--sidebar-inactive-item-color", hsl);
    }

    if (colors.sidebarActive) {
      const hex = colors.sidebarActive.startsWith("#") ? colors.sidebarActive : hslToHex(colors.sidebarActive);
      const hsl = hexToHSL(hex);
      const contrast = getContrastColor(hex);
      const [h, s] = hsl.split(" ");
      root.style.setProperty("--sidebar-primary", hsl);
      root.style.setProperty("--sidebar-primary-foreground", contrast);
      root.style.setProperty("--sidebar-accent", `${h} ${s} 92%`);
      root.style.setProperty("--sidebar-accent-foreground", hsl);
      root.style.setProperty("--sidebar-ring", hsl);
      root.style.setProperty("--sidebar-active-item-color", hsl);
    }

    if (colors.bodyBg) {
      const hex = colors.bodyBg.startsWith("#") ? colors.bodyBg : hslToHex(colors.bodyBg);
      const hsl = hexToHSL(hex);
      root.style.setProperty("--background", hsl);
      root.style.setProperty("--card", hsl);
    }

    if (colors.bodyText) {
      const hex = colors.bodyText.startsWith("#") ? colors.bodyText : hslToHex(colors.bodyText);
      const hsl = hexToHSL(hex);
      root.style.setProperty("--foreground", hsl);
      root.style.setProperty("--text-color", hsl);
      root.style.setProperty("--card-foreground", hsl);
      root.style.setProperty("--popover-foreground", hsl);
      document.body.style.color = `hsl(${hsl})`;
    }

    if (colors.navbarBg) {
      const hex = colors.navbarBg.startsWith("#") ? colors.navbarBg : hslToHex(colors.navbarBg);
      const hsl = hexToHSL(hex);
      root.style.setProperty("--navbar-background", hsl);
    }

    if (colors.navbarText) {
      const hex = colors.navbarText.startsWith("#") ? colors.navbarText : hslToHex(colors.navbarText);
      const hsl = hexToHSL(hex);
      root.style.setProperty("--navbar-foreground", hsl);
    }
  };

  const fetchSettings = async () => {
    // 5-second timeout — on iOS, a stalled request must never block the splash screen forever
    const timeoutPromise = new Promise<null>(resolve => setTimeout(() => resolve(null), 5000));
    try {
      const res = await Promise.race([settingsApi.getSettings(), timeoutPromise]);

      if (res && res.success && res.data) {
        const { primaryColor: p, buttonColor: b, buttonTextColor: btc, textColor: t, logo: logoUrl,
                sidebarBgColor: sbg, sidebarTextColor: stxt, sidebarActiveColor: sact, bodyBgColor: bbg,
                navbarBgColor: nbg, navbarTextColor: ntxt,
                bodyTextColor: btxt } = res.data;

        if (p)   { setPrimaryHexState(p); setPrimaryColorState(p.startsWith("#") ? hexToHSL(p) : p); }
        if (b)    setButtonColor(b);
        if (btc)  setButtonTextColor(btc);
        if (t)    setTextColor(t);
        if (sbg)  setSidebarBgColor(sbg);
        if (stxt) setSidebarInactiveColor(stxt);
        if (sact) setSidebarActiveColor(sact);
        if (bbg)  setBodyBgColor(bbg);
        if (btxt) setBodyTextColor(btxt);
        if (nbg)  setNavbarBgColor(nbg);
        if (ntxt) setNavbarTextColor(ntxt);
        if (logoUrl) setLogo(logoUrl);

        applyTheme({ primary: p, button: b, buttonText: btc, text: t,
          sidebarBg: sbg, sidebarInactive: stxt, sidebarActive: sact,
          bodyBg: bbg, bodyText: btxt,
          navbarBg: nbg, navbarText: ntxt });
      }
    } catch (error) {
      console.error("Error loading theme settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    applyTheme({
      primary: primaryHex,
      button: buttonColor,
      buttonText: buttonTextColor,
      text: textColor,
      sidebarBg: sidebarBgColor,
      sidebarInactive: sidebarInactiveColor,
      sidebarActive: sidebarActiveColor,
      bodyBg: bodyBgColor,
      bodyText: bodyTextColor,
      navbarBg: navbarBgColor,
      navbarText: navbarTextColor,
    });
  }, [primaryHex, buttonColor, buttonTextColor, textColor, sidebarBgColor, sidebarInactiveColor, sidebarActiveColor, bodyBgColor, bodyTextColor, navbarBgColor, navbarTextColor]);

  const setPrimaryColor = (color: string) => {
    setPrimaryColorState(color);
    setPrimaryHexState(color.startsWith("#") ? color : hslToHex(color));
  };

  const setPrimaryHex = (hex: string) => {
    setPrimaryHexState(hex);
    setPrimaryColorState(hexToHSL(hex));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <ThemeContext.Provider value={{
      primaryColor,
      primaryHex,
      buttonColor,
      buttonTextColor,
      setButtonTextColor,
      textColor,
      sidebarBgColor,
      sidebarInactiveColor,
      sidebarActiveColor,
      bodyBgColor,
      setPrimaryColor,
      setPrimaryHex,
      setButtonColor,
      setTextColor,
      setSidebarBgColor,
      setSidebarInactiveColor,
      setSidebarActiveColor,
      setBodyBgColor,
      bodyTextColor,
      setBodyTextColor,
      navbarBgColor,
      navbarTextColor,
      setNavbarBgColor,
      setNavbarTextColor,
      logo,
      setLogo,
      isLoading,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
