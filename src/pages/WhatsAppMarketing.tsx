import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Play, Square, Edit2, Trash2, MessageCircle } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { whatsappCampaignService } from "@/api/services/whatsappCampaign.service";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { ConnectAccountPanel } from "@/components/whatsapp/ConnectAccountPanel";
import { TemplatesPanel } from "@/components/whatsapp/TemplatesPanel";
import { CampaignForm } from "@/components/whatsapp/CampaignForm";
import { TemplateConditionsPanel } from "@/components/whatsapp/TemplateConditionsPanel";
import { WhatsAppChat } from "@/components/whatsapp/WhatsAppChat";
import { WhatsAppLogs } from "@/components/whatsapp/WhatsAppLogs";

const AUDIENCE_LABELS: Record<string, string> = {
  leads: "Leads (filter)",
  selected_leads: "Picked leads",
  customers: "Customers",
  upload: "Uploaded sheet",
};

const STATUS_STYLES: Record<string, string> = {
  Draft: "bg-slate-50 text-slate-600 border-slate-200",
  Scheduled: "bg-blue-50 text-blue-600 border-blue-200",
  InProgress: "bg-amber-50 text-amber-600 border-amber-200",
  Completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
  Failed: "bg-red-50 text-red-600 border-red-200",
  Cancelled: "bg-slate-50 text-slate-500 border-slate-200",
};

// Clicking a stat card opens Sent Messages filtered to that status.
function CampaignsTab({ onOpenLogs }: { onOpenLogs: (status: string) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: analyticsData } = useQuery({
    queryKey: ["whatsapp-analytics"],
    queryFn: () => whatsappCampaignService.getAnalytics(),
  });
  const funnel = analyticsData?.data?.funnel;

  const { data: campaignsData } = useQuery({
    queryKey: ["whatsapp-campaigns"],
    queryFn: () => whatsappCampaignService.getCampaigns(),
    refetchInterval: (query) => {
      const campaigns = query.state.data?.data || [];
      return campaigns.some((c: any) => c.status === "InProgress") ? 3000 : false;
    },
  });
  const campaigns = campaignsData?.data || [];

  const triggerMutation = useMutation({
    mutationFn: (id: string) => whatsappCampaignService.triggerCampaign(id),
    onSuccess: () => {
      toast({ title: "Campaign triggered" });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-campaigns"] });
    },
    onError: (err: any) => toast({ title: "Trigger failed", description: err.message, variant: "destructive" }),
  });

  // Sends are real WhatsApp messages, so always show who will get them first.
  const confirmAndTrigger = async (c: any) => {
    let count: number | null = null;
    try {
      const preview = await whatsappCampaignService.previewAudience({
        templateId: c.template_id,
        audienceSource: c.audience_source,
        targetAudience: c.target_audience,
        leadStatusIds: c.lead_status_ids,
        leadSourceIds: c.lead_source_ids,
        leadIds: c.lead_ids,
        customerIds: c.customer_ids,
        recipients: c.recipients,
      });
      count = preview?.count ?? null;
    } catch {
      count = null;
    }
    const who = count === null ? "its audience" : `${count} ${count === 1 ? "person" : "people"}`;
    if (count === 0) {
      toast({ title: "Nobody to send to", description: "This campaign's audience has no valid numbers.", variant: "destructive" });
      return;
    }
    if (window.confirm(`Send "${c.name}" to ${who} now?`)) triggerMutation.mutate(c._id);
  };

  const stopMutation = useMutation({
    mutationFn: (id: string) => whatsappCampaignService.stopCampaign(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp-campaigns"] }),
  });

  const resetMutation = useMutation({
    mutationFn: (id: string) => whatsappCampaignService.resetCampaign(id),
    onSuccess: () => {
      toast({ title: "Campaign reset", description: "You can edit or trigger it again." });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-campaigns"] });
    },
    onError: (err: any) => toast({ title: "Reset failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => whatsappCampaignService.deleteCampaign(id),
    onSuccess: () => {
      toast({ title: "Campaign deleted" });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-campaigns"] });
    },
  });

  return (
    <div className="space-y-4">
      {funnel && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/40" title="Show all sent messages" onClick={() => onOpenLogs("all")}><CardContent className="py-4"><div className="text-2xl font-semibold">{funnel.sent + funnel.delivered + funnel.read + funnel.failed}</div><div className="text-xs text-muted-foreground">Total Sent</div></CardContent></Card>
          <Card className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/40" title="Show delivered messages" onClick={() => onOpenLogs("Delivered")}><CardContent className="py-4"><div className="text-2xl font-semibold">{funnel.delivered + funnel.read}</div><div className="text-xs text-muted-foreground">Delivered ({funnel.deliveredRate}%)</div></CardContent></Card>
          <Card className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/40" title="Show read messages" onClick={() => onOpenLogs("Read")}><CardContent className="py-4"><div className="text-2xl font-semibold">{funnel.read}</div><div className="text-xs text-muted-foreground">Read ({funnel.readRate}%)</div></CardContent></Card>
          <Card className="cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/40" title="Show failed messages and their reasons" onClick={() => onOpenLogs("Failed")}><CardContent className="py-4"><div className="text-2xl font-semibold text-red-600">{funnel.failed}</div><div className="text-xs text-muted-foreground">Failed</div></CardContent></Card>
        </div>
      )}

      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New Campaign
        </Button>
      </div>

      <div className="space-y-2">
        {campaigns.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No campaigns yet</CardContent></Card>
        ) : (
          campaigns.map((c: any) => (
            <Card key={c._id}>
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {c.name}
                    {c.recurring && <Badge variant="outline">Monthly</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.template_id} · {AUDIENCE_LABELS[c.audience_source] || "Leads"} · Sent {c.sent_count || 0}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={STATUS_STYLES[c.status]}>{c.status}</Badge>
                  {c.status === "InProgress" ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => stopMutation.mutate(c._id)}>
                        <Square className="h-3.5 w-3.5 mr-1" /> Stop
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Use only if this campaign is stuck (e.g. after a server restart)"
                        onClick={() => window.confirm("Reset this campaign? Use this only if it is stuck in InProgress.") && resetMutation.mutate(c._id)}
                      >
                        Reset
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" disabled={triggerMutation.isPending} onClick={() => confirmAndTrigger(c)}>
                      <Play className="h-3.5 w-3.5 mr-1" /> {c.status === "Completed" || c.status === "Cancelled" ? "Re-send" : "Trigger"}
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setFormOpen(true); }}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(c._id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <CampaignForm open={formOpen} onOpenChange={setFormOpen} campaign={editing} />
    </div>
  );
}

const WhatsAppMarketing = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [tab, setTab] = useState("campaigns");
  const [logsFilter, setLogsFilter] = useState({ status: "all", n: 0 });
  const openLogs = (status: string) => {
    setLogsFilter((f) => ({ status, n: f.n + 1 }));
    setTab("logs");
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-emerald-600" /> WhatsApp Marketing
          </h1>
          <p className="text-sm text-muted-foreground">Campaigns, conversations and delivery tracking over WhatsApp Business Cloud API.</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="inbox">
              Inbox {unreadCount > 0 && <Badge variant="destructive" className="ml-1.5">{unreadCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="logs">Sent Messages</TabsTrigger>
            <TabsTrigger value="conditions">Audience Rules</TabsTrigger>
            <TabsTrigger value="connect">Connect</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns"><CampaignsTab onOpenLogs={openLogs} /></TabsContent>
          <TabsContent value="templates"><TemplatesPanel /></TabsContent>
          <TabsContent value="inbox"><WhatsAppChat onUnreadChange={setUnreadCount} /></TabsContent>
          <TabsContent value="logs"><WhatsAppLogs key={logsFilter.n} initialStatus={logsFilter.status} /></TabsContent>
          <TabsContent value="conditions"><TemplateConditionsPanel /></TabsContent>
          <TabsContent value="connect"><ConnectAccountPanel /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default WhatsAppMarketing;
