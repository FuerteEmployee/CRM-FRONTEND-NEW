import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { settingsService } from "@/api/services/settings.service";
import { useToast } from "@/hooks/use-toast";

export default function SetupLeadsEmailIntegration() {
  const { getSetting, refreshSettings } = useSettings();
  const { toast } = useToast();

  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [imapUsername, setImapUsername] = useState("");
  const [imapPassword, setImapPassword] = useState("");
  const [enableSsl, setEnableSsl] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setImapHost(getSetting("lead_email_imap_host", ""));
    setImapPort(getSetting("lead_email_imap_port", "993"));
    setImapUsername(getSetting("lead_email_imap_username", ""));
    setImapPassword(getSetting("lead_email_imap_password", ""));
    setEnableSsl(getSetting("lead_email_imap_ssl", "true") === "true");
  }, [getSetting]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await settingsService.updateSettings({
        settings: [
          { name: "lead_email_imap_host", value: imapHost },
          { name: "lead_email_imap_port", value: imapPort },
          { name: "lead_email_imap_username", value: imapUsername },
          { name: "lead_email_imap_password", value: imapPassword },
          { name: "lead_email_imap_ssl", value: String(enableSsl) },
        ],
      });
      await refreshSettings();
      toast({ title: "Success", description: "Lead email integration settings saved successfully" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to save configuration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-2xl">
        <div>
          <h1 className="text-xl font-bold">Email Integration</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Automatically create leads from incoming emails.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Mail className="h-4 w-4" />
              IMAP Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>IMAP Host</Label>
                <Input
                  value={imapHost}
                  onChange={(e) => setImapHost(e.target.value)}
                  placeholder="imap.example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Port</Label>
                <Input
                  value={imapPort}
                  onChange={(e) => setImapPort(e.target.value)}
                  placeholder="993"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input
                  value={imapUsername}
                  onChange={(e) => setImapUsername(e.target.value)}
                  placeholder="leads@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={imapPassword}
                  onChange={(e) => setImapPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Switch checked={enableSsl} onCheckedChange={setEnableSsl} />
              <Label>Enable SSL</Label>
            </div>
            <div className="pt-2">
              <Button onClick={handleSave} disabled={isSaving} size="sm">
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Save Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
