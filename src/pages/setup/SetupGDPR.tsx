import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function SetupGDPR() {
  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-2xl">
        <div>
          <h1 className="text-xl font-bold">GDPR</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure data protection and privacy settings.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">GDPR Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable GDPR Features</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show Cookie Consent Banner</Label>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label>Allow Data Export Requests</Label>
              <Switch defaultChecked />
            </div>
            <div className="space-y-1.5">
              <Label>Privacy Policy Text</Label>
              <Textarea rows={5} placeholder="Paste or write your privacy policy here..." />
            </div>
            <Button size="sm">Save Settings</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
