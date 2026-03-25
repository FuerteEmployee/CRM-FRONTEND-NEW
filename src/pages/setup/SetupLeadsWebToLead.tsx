import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Globe } from "lucide-react";

export default function SetupLeadsWebToLead() {
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
              <Input placeholder="https://example.com/thank-you" />
            </div>
            <div className="space-y-1.5">
              <Label>Success Message</Label>
              <Textarea placeholder="Thank you! We will get back to you shortly." />
            </div>
            <Button size="sm">Generate Embed Code</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
