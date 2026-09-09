import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2 } from "lucide-react";

import { whatsappService } from "@/api/services/whatsapp.service";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Connection {
  _id: string;
  phone_number_id: string;
  waba_id: string;
  display_phone_number?: string;
  access_token_masked: string;
  is_live: boolean;
  last_synced?: string;
}

export function ConnectAccountPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ phone_number_id: "", waba_id: "", access_token: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["whatsapp-integrations"],
    queryFn: () => whatsappService.getIntegrations(),
  });
  const connections: Connection[] = data?.connections || [];

  const connectMutation = useMutation({
    mutationFn: () => whatsappService.connect(form),
    onSuccess: () => {
      toast({ title: "WhatsApp number connected" });
      setOpen(false);
      setForm({ phone_number_id: "", waba_id: "", access_token: "" });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-integrations"] });
    },
    onError: (err: any) => toast({ title: "Connection failed", description: err.message, variant: "destructive" }),
  });

  const liveModeMutation = useMutation({
    mutationFn: ({ id, isLive }: { id: string; isLive: boolean }) => whatsappService.setLiveMode(id, isLive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-integrations"] });
    },
    onError: (err: any) => toast({ title: "Failed to update", description: err.message, variant: "destructive" }),
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => whatsappService.disconnect(id),
    onSuccess: () => {
      toast({ title: "Number disconnected" });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-integrations"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Connect a WhatsApp Business Cloud API number to send and receive messages for this account.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Connect Number</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect WhatsApp Number</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Phone Number ID</Label>
                <Input
                  value={form.phone_number_id}
                  onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })}
                  placeholder="From Meta Business Manager"
                />
              </div>
              <div>
                <Label>WhatsApp Business Account ID (WABA)</Label>
                <Input value={form.waba_id} onChange={(e) => setForm({ ...form, waba_id: e.target.value })} />
              </div>
              <div>
                <Label>Access Token</Label>
                <Input
                  type="password"
                  value={form.access_token}
                  onChange={(e) => setForm({ ...form, access_token: e.target.value })}
                  placeholder="Permanent system-user token"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending || !form.phone_number_id || !form.waba_id || !form.access_token}
              >
                {connectMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Connect
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : connections.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No WhatsApp number connected yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {connections.map((c) => (
            <Card key={c._id}>
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{c.display_phone_number || c.phone_number_id}</div>
                  <div className="text-xs text-muted-foreground">
                    Token {c.access_token_masked} · WABA {c.waba_id}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={c.is_live ? "default" : "secondary"}>
                    {c.is_live ? "Live" : "Safe mode"}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Live sends</span>
                    <Switch
                      checked={c.is_live}
                      onCheckedChange={(checked) => liveModeMutation.mutate({ id: c._id, isLive: checked })}
                    />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => disconnectMutation.mutate(c._id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
