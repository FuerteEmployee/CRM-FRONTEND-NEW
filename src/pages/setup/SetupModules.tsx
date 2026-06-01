import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/context/SettingsContext";
import { settingsService } from "@/api/services/settings.service";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const modules = [
  { key: "subscriptions", label: "Subscriptions" },
  { key: "expenses", label: "Expenses" },
  { key: "contracts", label: "Contracts" },
  { key: "projects", label: "Projects" },
  { key: "tasks", label: "Tasks" },
  { key: "timeTracking", label: "Time Tracking" },
  { key: "support", label: "Support" },
  { key: "leads", label: "Leads" },
  { key: "estimateRequest", label: "Estimate Request" },
  { key: "knowledgeBase", label: "Knowledge Base" },
  { key: "media", label: "Media" },
  { key: "goals", label: "Goals" },
];

export default function SetupModules() {
  const { getSetting, refreshSettings } = useSettings();
  const { toast } = useToast();
  const [moduleStates, setModuleStates] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const states: Record<string, boolean> = {};
    modules.forEach((m) => {
      states[`module_${m.key}`] = getSetting(`module_${m.key}`, true); // Enabled by default
    });
    setModuleStates(states);
  }, [getSetting]);

  const handleToggle = (key: string, checked: boolean) => {
    setModuleStates((prev) => ({ ...prev, [`module_${key}`]: checked }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const payload = Object.entries(moduleStates).map(([name, value]) => ({
        name,
        value: value ? "true" : "false",
      }));
      
      await settingsService.updateSettings({ settings: payload });
      await refreshSettings();
      toast({ title: "Success", description: "Modules settings updated" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-2xl">
        <div>
          <h1 className="text-xl font-bold">Modules</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Enable or disable features across your CRM.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Feature Modules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {modules.map((m) => (
              <div key={m.key} className="flex items-center justify-between">
                <Label className="text-sm">{m.label}</Label>
                <Switch 
                  checked={moduleStates[`module_${m.key}`] ?? true} 
                  onCheckedChange={(checked) => handleToggle(m.key, checked)}
                />
              </div>
            ))}
            <Button onClick={handleSave} disabled={isSaving} size="sm" className="mt-2">
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
