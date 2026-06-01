import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useSettings } from "@/context/SettingsContext";
import { settingsService } from "@/api/services/settings.service";
import { useToast } from "@/hooks/use-toast";

export default function SetupLeadsWebToLead() {
  const { getSetting, refreshSettings } = useSettings();
  const { toast } = useToast();
  
  const [redirectUrl, setRedirectUrl] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setRedirectUrl(getSetting("web_to_lead_url", ""));
    setSuccessMessage(getSetting("web_to_lead_success_message", ""));
  }, [getSetting]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await settingsService.updateSettings({
        settings: [
          { name: "web_to_lead_url", value: redirectUrl },
          { name: "web_to_lead_success_message", value: successMessage },
        ],
      });
      await refreshSettings();
      toast({ title: "Success", description: "Web to Lead settings updated" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-2xl">
        <div>
          <h1 className="text-xl font-bold">Web to Lead</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate an embed code for your website to capture leads.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Form Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Redirect URL (after submission)</Label>
              <Input 
                value={redirectUrl} 
                onChange={(e) => setRedirectUrl(e.target.value)} 
                placeholder="https://example.com/thank-you" 
              />
            </div>
            <div className="space-y-1.5">
              <Label>Success Message</Label>
              <Textarea 
                value={successMessage}
                onChange={(e) => setSuccessMessage(e.target.value)}
                placeholder="Thank you! We will get back to you shortly." 
              />
            </div>
            <Button onClick={handleSave} disabled={isSaving} size="sm">
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
