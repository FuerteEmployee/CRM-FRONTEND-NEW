import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Mail } from "lucide-react";

export default function SetupLeadsEmailIntegration() {
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>IMAP Host</Label>
                <Input placeholder="imap.example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Port</Label>
                <Input placeholder="993" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input placeholder="leads@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch />
              <Label>Enable SSL</Label>
            </div>
            <Button size="sm">Save Configuration</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
