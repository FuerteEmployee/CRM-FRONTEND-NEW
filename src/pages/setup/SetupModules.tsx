import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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
                <Switch defaultChecked />
              </div>
            ))}
            <Button size="sm" className="mt-2">Save Changes</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
