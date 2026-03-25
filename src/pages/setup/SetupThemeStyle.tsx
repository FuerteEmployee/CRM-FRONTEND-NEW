import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Palette } from "lucide-react";

const colorOptions = [
  "#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
];

export default function SetupThemeStyle() {
  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-2xl">
        <div>
          <h1 className="text-xl font-bold">Theme Style</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Customize the look and feel of your CRM.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Brand Colors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    className="h-8 w-8 rounded-full border-2 border-transparent hover:border-foreground/40 transition-all"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Custom Color (HEX)</Label>
              <Input placeholder="#4f46e5" className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label>Logo URL</Label>
              <Input placeholder="https://example.com/logo.png" />
            </div>
            <Button size="sm">Save Theme</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
