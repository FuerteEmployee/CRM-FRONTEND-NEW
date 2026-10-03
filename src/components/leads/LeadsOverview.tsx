import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users, MessageCircle, BadgeCheck, UserCheck, Bell, AlertTriangle, Flame, CalendarRange, Stethoscope, Wallet, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { leadService } from "@/api/services/lead.service";
import { useCurrency } from "@/context/CurrencyContext";

export interface LeadsOverviewData {
  features: string[];
  leads: { total: number; today: number; month: number; whatsapp: number; confirmed: number; converted: number; conversionRate: number };
  // null when the company doesn't have that feature enabled
  reminders: null | { today: number; overdue: number; upcoming: number; confirmedPending: number };
  spend: null | {
    today: number; month: number; total: number; leadsToday: number; leadsMonth: number;
    costPerLeadToday: number | null; costPerLeadMonth: number | null; roiMonth: number | null;
  };
  treatment: null | {
    total: number; count: number; today: number; todayCount: number; month: number; monthCount: number;
    whatsapp: number; whatsappCount: number;
    bySource: { name: string; amount: number; count: number }[];
    byCampaign: { name: string; amount: number; count: number }[];
  };
  pipeline: { missing: string[]; canSetup: boolean };
}

export const LEADS_OVERVIEW_KEY = ["leads", "overview"];

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon: ReactNode;
  tone: string;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}

function StatCard({ label, value, sub, icon, tone, active, onClick, title }: StatCardProps) {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={title}
      className={cn(
        "flex flex-col gap-2 p-4 rounded-xl text-left border transition-all duration-200 bg-slate-50/60 min-w-0",
        onClick && "hover:bg-white hover:border-slate-200 hover:shadow-sm cursor-pointer",
        active ? "border-primary bg-primary/5 ring-2 ring-primary/10" : "border-slate-100"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 truncate">{label}</p>
        <span className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", tone)}>{icon}</span>
      </div>
      <p className="text-2xl font-black text-slate-900 leading-none truncate">{value}</p>
      {sub && <p className="text-[11px] font-semibold text-slate-400 truncate">{sub}</p>}
    </Comp>
  );
}

function Section({ title, action, className, children }: { title: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

interface LeadsOverviewProps {
  active: { whatsapp: boolean; converted: boolean; confirmed: boolean; reminder: string };
  onShowAll: () => void;
  onToggleWhatsApp: () => void;
  onToggleConfirmed: () => void;
  onToggleConverted: () => void;
  onOpenFollowUps: (bucket: "today" | "overdue" | "upcoming") => void;
  onManageSpend: () => void;
}

export function LeadsOverview(props: LeadsOverviewProps) {
  const { active } = props;
  const queryClient = useQueryClient();
  const { formatAmount } = useCurrency();
  const money = (n: number | null | undefined) => formatAmount(Number(n) || 0, 0);

  const { data, isLoading, isError } = useQuery<LeadsOverviewData>({
    queryKey: LEADS_OVERVIEW_KEY,
    queryFn: leadService.getOverview,
    refetchInterval: 60 * 1000,
  });

  const setupMutation = useMutation({
    mutationFn: leadService.setupPipelineStatuses,
    onSuccess: (res: any) => {
      toast.success(res?.created?.length ? `Added: ${res.created.join(", ")}` : "Pipeline already complete");
      queryClient.invalidateQueries({ queryKey: ["lead-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || err?.message || "Failed to add statuses"),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Skeleton className="h-[188px] rounded-2xl lg:col-span-2" />
        <Skeleton className="h-[188px] rounded-2xl" />
        <Skeleton className="h-[188px] rounded-2xl lg:col-span-2" />
        <Skeleton className="h-[188px] rounded-2xl" />
      </div>
    );
  }
  if (isError || !data) return null;

  const { leads, reminders, spend, treatment, pipeline } = data;
  const noSpendYet = !!spend && !spend.total;
  const showWhatsApp = (data.features || []).includes("whatsapp_leads");

  const breakdown = treatment && (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 rounded-lg gap-1.5 text-[11px] font-bold text-slate-500">
          <Info className="h-3.5 w-3.5" /> By source
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] rounded-2xl p-4 space-y-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">By lead source</p>
          {treatment.bySource.length === 0 ? (
            <p className="text-xs text-slate-400">No conversions recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {treatment.bySource.map((s) => (
                <li key={s.name} className="flex justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-700 truncate">{s.name} <span className="text-slate-400">({s.count})</span></span>
                  <span className="font-black text-slate-900 shrink-0">{money(s.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {treatment.byCampaign.length > 0 && (
          <div className="pt-3 border-t border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">By campaign</p>
            <ul className="space-y-2">
              {treatment.byCampaign.map((s) => (
                <li key={s.name} className="flex justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-700 truncate">{s.name} <span className="text-slate-400">({s.count})</span></span>
                  <span className="font-black text-slate-900 shrink-0">{money(s.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-5">
      {pipeline.missing.length > 0 && pipeline.canSetup && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 px-5 py-4">
          <p className="text-xs font-bold text-violet-800">
            Recommended pipeline statuses missing: {pipeline.missing.join(", ")}. Existing similar statuses are reused, never duplicated.
          </p>
          <Button
            size="sm"
            disabled={setupMutation.isPending}
            onClick={() => setupMutation.mutate()}
            className="h-8 rounded-xl text-[10px] font-black uppercase tracking-widest shrink-0"
          >
            {setupMutation.isPending ? "Adding..." : "Add missing statuses"}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Section title="Leads pipeline" className={reminders ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className={cn("grid grid-cols-2 gap-3", showWhatsApp ? "md:grid-cols-4" : "md:grid-cols-3")}>
            <StatCard
              label="Total leads"
              value={leads.total}
              sub={`${leads.today} today · ${leads.month} this month`}
              icon={<Users className="h-4 w-4 text-slate-600" />}
              tone="bg-slate-100"
              onClick={props.onShowAll}
            />
            {showWhatsApp && (
              <StatCard
                label="WhatsApp leads"
                value={leads.whatsapp}
                sub="Click to filter"
                icon={<MessageCircle className="h-4 w-4 text-green-700" />}
                tone="bg-green-100"
                active={active.whatsapp}
                onClick={props.onToggleWhatsApp}
              />
            )}
            <StatCard
              label="Confirmed"
              value={leads.confirmed}
              sub={reminders ? `${reminders.confirmedPending} pending follow-up` : "Click to filter"}
              icon={<BadgeCheck className="h-4 w-4 text-violet-700" />}
              tone="bg-violet-100"
              active={active.confirmed}
              onClick={props.onToggleConfirmed}
            />
            <StatCard
              label="Converted patients"
              value={leads.converted}
              sub={`${leads.conversionRate}% conversion`}
              icon={<UserCheck className="h-4 w-4 text-emerald-700" />}
              tone="bg-emerald-100"
              active={active.converted}
              onClick={props.onToggleConverted}
            />
          </div>
        </Section>

        {reminders && (
        <Section title="Follow-ups">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Today"
              value={reminders.today}
              sub={`${reminders.upcoming} upcoming`}
              icon={<Bell className="h-4 w-4 text-blue-700" />}
              tone="bg-blue-100"
              active={active.reminder === "today"}
              onClick={() => props.onOpenFollowUps("today")}
            />
            <StatCard
              label="Overdue"
              value={<span className={reminders.overdue ? "text-red-600" : undefined}>{reminders.overdue}</span>}
              sub="Click to review"
              icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
              tone="bg-red-100"
              active={active.reminder === "overdue"}
              onClick={() => props.onOpenFollowUps("overdue")}
            />
          </div>
        </Section>
        )}

        {treatment && (
        <Section title="Treatment business" action={breakdown} className={spend ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className={cn("grid grid-cols-1 gap-3", showWhatsApp ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
            <StatCard
              label="Total treatment"
              value={money(treatment.total)}
              sub={`${treatment.count} converted patient${treatment.count === 1 ? "" : "s"}`}
              icon={<Wallet className="h-4 w-4 text-emerald-700" />}
              tone="bg-emerald-100"
            />
            <StatCard
              label="This month"
              value={money(treatment.month)}
              sub={`Today ${money(treatment.today)}${spend?.roiMonth != null ? ` · ${spend.roiMonth}x of spend` : ""}`}
              icon={<Stethoscope className="h-4 w-4 text-emerald-700" />}
              tone="bg-emerald-100"
            />
            {showWhatsApp && <StatCard
              label="From WhatsApp"
              value={money(treatment.whatsapp)}
              sub={`${treatment.whatsappCount} patient${treatment.whatsappCount === 1 ? "" : "s"}`}
              icon={<MessageCircle className="h-4 w-4 text-green-700" />}
              tone="bg-green-100"
            />}
          </div>
        </Section>
        )}

        {spend && (
          <Section
            title="Marketing spend"
            className={treatment ? undefined : "lg:col-span-3"}
            action={
              <Button variant="ghost" size="sm" onClick={props.onManageSpend} className="h-7 rounded-lg text-[11px] font-bold text-orange-600">
                {noSpendYet ? "+ Add spend" : "Manage"}
              </Button>
            }
          >
            {noSpendYet ? (
              <button
                type="button"
                onClick={props.onManageSpend}
                className="w-full rounded-xl border border-dashed border-orange-200 bg-orange-50/40 p-5 text-left space-y-1.5 hover:bg-orange-50 transition-colors"
              >
                <p className="flex items-center gap-2 text-sm font-black text-orange-700">
                  <Flame className="h-4 w-4" /> No ad spend recorded yet
                </p>
                <p className="text-[11px] font-semibold text-slate-500">
                  Add your daily ad spend to see burning amount and cost per lead ({spend.leadsMonth} leads this month).
                </p>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Today"
                  value={money(spend.today)}
                  sub={spend.costPerLeadToday != null ? `${money(spend.costPerLeadToday)} / lead` : `${spend.leadsToday} leads today`}
                  icon={<Flame className="h-4 w-4 text-orange-600" />}
                  tone="bg-orange-100"
                  onClick={props.onManageSpend}
                />
                <StatCard
                  label="This month"
                  value={money(spend.month)}
                  sub={spend.costPerLeadMonth != null ? `${money(spend.costPerLeadMonth)} / lead` : `${spend.leadsMonth} leads`}
                  icon={<CalendarRange className="h-4 w-4 text-orange-600" />}
                  tone="bg-orange-100"
                  onClick={props.onManageSpend}
                />
              </div>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}
