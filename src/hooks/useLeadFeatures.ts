import { useQuery } from "@tanstack/react-query";
import { leadService } from "@/api/services/lead.service";
import { usePermissions } from "@/hooks/usePermissions";

export type LeadFeatureKey = "whatsapp_leads" | "marketing_spend" | "patient_conversion" | "lead_followups";

// Leads add-ons the super admin enabled for this company. The overview
// endpoint is the source of truth (fresh after a super-admin change); the
// cached user.tenant is only a fallback while it loads.
export function useLeadFeatures() {
  const { user } = usePermissions();
  const { data } = useQuery<any>({
    queryKey: ["leads", "overview"],
    queryFn: leadService.getOverview,
    staleTime: 30 * 1000,
  });
  const list: string[] = Array.isArray(data?.features)
    ? data.features
    : Array.isArray((user as any)?.tenant?.enabled_features)
      ? (user as any).tenant.enabled_features
      : [];
  const has = (key: LeadFeatureKey) => list.includes(key);
  return { has, any: list.length > 0, list };
}
