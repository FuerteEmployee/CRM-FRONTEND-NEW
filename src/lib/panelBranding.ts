// Branding of the Super Admin panel itself (name, logo, favicon), set on
// Super Admin → Settings. Separate from companyName / compLogoLight / favicon,
// which are the default branding companies on the shared server inherit.
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { resolveImageUrl } from "@/lib/resolveImageUrl";

export type PanelBranding = { panelName: string; panelLogo: string; panelFavicon: string };

export const DEFAULT_PANEL_BRANDING: PanelBranding = { panelName: "Fuerte CRM", panelLogo: "", panelFavicon: "" };
export const PANEL_BRANDING_QUERY_KEY = ["panel-branding"];

export const usePanelBranding = () => {
  const { data } = useQuery<PanelBranding>({
    queryKey: PANEL_BRANDING_QUERY_KEY,
    queryFn: async () => ({ ...DEFAULT_PANEL_BRANDING, ...((await apiClient.get("/settings/panel-branding")) as any) }),
    staleTime: 5 * 60 * 1000,
  });
  return data || DEFAULT_PANEL_BRANDING;
};

/**
 * Puts the panel name in the browser tab and the panel favicon on the page.
 * `deps` lets the caller re-apply after the company settings effect (which
 * also writes the title/favicon) has run.
 */
export const useApplyPanelBranding = (branding: PanelBranding, deps: unknown[] = [], enabled = true) => {
  useEffect(() => {
    if (!enabled) return;
    document.title = `${branding.panelName} · Super Admin`;
    if (branding.panelFavicon) {
      const href = resolveImageUrl(branding.panelFavicon);
      const link: HTMLLinkElement = document.querySelector("link[rel*='icon']") || document.createElement("link");
      link.rel = "shortcut icon";
      link.type = href.endsWith(".svg") ? "image/svg+xml" : href.endsWith(".png") ? "image/png" : "image/x-icon";
      link.href = href;
      if (!link.parentNode) document.head.appendChild(link);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, branding.panelName, branding.panelFavicon, ...deps]);
};
