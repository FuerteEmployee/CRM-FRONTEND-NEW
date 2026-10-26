import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Loader2, Code2, Copy, Check } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { settingsService } from "@/api/services/settings.service";
import { useToast } from "@/hooks/use-toast";

export default function SetupLeadsWebToLead() {
  const { getSetting, refreshSettings } = useSettings();
  const { toast } = useToast();

  const [redirectUrl, setRedirectUrl] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const sampleEmbedCode = `<!-- Web to Lead Form -->
<form action="${window.location.origin}/api/public/website-leads/YOUR_FORM_KEY" method="POST">
  <input type="text" name="name" placeholder="Full Name" required />
  <input type="email" name="email" placeholder="Email Address" required />
  <input type="tel" name="phone" placeholder="Phone Number" />
  <input type="text" name="city" placeholder="City" />
  <button type="submit">Submit Inquiry</button>
</form>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(sampleEmbedCode);
    setCopied(true);
    toast({ title: "Copied!", description: "Embed code copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-xl font-bold">Web to Lead</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure form redirects and generate an embed code for your website to capture leads.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Form Settings
            </CardTitle>
            <CardDescription className="text-xs">
              Manage behavior after a visitor submits your website lead form.
            </CardDescription>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                HTML Embed Code Snippet
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Paste this code into any HTML page or landing page to capture leads directly into your CRM.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyCode} className="h-8 gap-1.5 text-xs">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy Code"}
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto">
              <code>{sampleEmbedCode}</code>
            </pre>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
