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

const STATUS_STYLES: Record<string, string> = {
  Draft: "bg-slate-50 text-slate-600 border-slate-200",
  Scheduled: "bg-blue-50 text-blue-600 border-blue-200",
  InProgress: "bg-amber-50 text-amber-600 border-amber-200",
  Completed: "bg-emerald-50 text-emerald-600 border-emerald-200",
  Failed: "bg-red-50 text-red-600 border-red-200",
  Cancelled: "bg-slate-50 text-slate-500 border-slate-200",
};

function CampaignsTab() {
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

  const stopMutation = useMutation({
    mutationFn: (id: string) => whatsappCampaignService.stopCampaign(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whatsapp-campaigns"] }),
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
          <Card><CardContent className="py-4"><div className="text-2xl font-semibold">{funnel.sent + funnel.delivered + funnel.read + funnel.failed}</div><div className="text-xs text-muted-foreground">Total Sent</div></CardContent></Card>
          <Card><CardContent className="py-4"><div className="text-2xl font-semibold">{funnel.delivered + funnel.read}</div><div className="text-xs text-muted-foreground">Delivered ({funnel.deliveredRate}%)</div></CardContent></Card>
          <Card><CardContent className="py-4"><div className="text-2xl font-semibold">{funnel.read}</div><div className="text-xs text-muted-foreground">Read ({funnel.readRate}%)</div></CardContent></Card>
          <Card><CardContent className="py-4"><div className="text-2xl font-semibold text-red-600">{funnel.failed}</div><div className="text-xs text-muted-foreground">Failed</div></CardContent></Card>
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
                    {c.template_id} · Sent {c.sent_count || 0}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={STATUS_STYLES[c.status]}>{c.status}</Badge>
                  {c.status === "InProgress" ? (
                    <Button variant="outline" size="sm" onClick={() => stopMutation.mutate(c._id)}>
                      <Square className="h-3.5 w-3.5 mr-1" /> Stop
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => triggerMutation.mutate(c._id)}>
                      <Play className="h-3.5 w-3.5 mr-1" /> Trigger
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

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-emerald-600" /> WhatsApp Marketing
          </h1>
          <p className="text-sm text-muted-foreground">Campaigns, conversations and delivery tracking over WhatsApp Business Cloud API.</p>
        </div>

        <Tabs defaultValue="campaigns">
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

          <TabsContent value="campaigns"><CampaignsTab /></TabsContent>
          <TabsContent value="templates"><TemplatesPanel /></TabsContent>
          <TabsContent value="inbox"><WhatsAppChat onUnreadChange={setUnreadCount} /></TabsContent>
          <TabsContent value="logs"><WhatsAppLogs /></TabsContent>
          <TabsContent value="conditions"><TemplateConditionsPanel /></TabsContent>
          <TabsContent value="connect"><ConnectAccountPanel /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default WhatsAppMarketing;
