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
      }
    } catch (error) {
      console.error("Error loading theme settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Deliberately does not apply these colors to document.documentElement: HRMS is embedded in the
  // main CRM and shares its layout/sidebar, which already gets its theme from the CRM's own
  // Setup > Theme Style settings (src/context/ThemeContext.tsx + lib/themeUtils.ts). Writing here too
  // fought over the same global CSS variables, so HRMS pages flashed a different sidebar color than
  // the rest of the app. These values still back the Settings > Appearance form below for HRMS's own
  // saved preferences, but no longer take over the shared page.

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
