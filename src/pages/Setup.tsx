import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Building, Globe, Mail, Palette, Shield, Bell } from "lucide-react";

const Setup = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold">Setup</h1>
          <p className="text-muted-foreground">Configure your CRM settings</p>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" />General Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Application Name</Label><Input defaultValue="CRMPro" /></div>
                  <div className="space-y-2"><Label>Language</Label>
                    <Select defaultValue="en"><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="es">Spanish</SelectItem><SelectItem value="fr">French</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Timezone</Label>
                    <Select defaultValue="utc-8"><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="utc-8">PST (UTC-8)</SelectItem><SelectItem value="utc-5">EST (UTC-5)</SelectItem><SelectItem value="utc">UTC</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Date Format</Label>
                    <Select defaultValue="mdy"><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="mdy">MM/DD/YYYY</SelectItem><SelectItem value="dmy">DD/MM/YYYY</SelectItem><SelectItem value="ymd">YYYY-MM-DD</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Currency</Label>
                  <Select defaultValue="usd"><SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="usd">USD ($)</SelectItem><SelectItem value="eur">EUR (€)</SelectItem><SelectItem value="gbp">GBP (£)</SelectItem><SelectItem value="inr">INR (₹)</SelectItem></SelectContent>
                  </Select>
                </div>
                <Button>Save Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="company" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building className="h-4 w-4" />Company Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label>Company Name</Label><Input defaultValue="CRMPro Inc" /></div>
                <div className="space-y-2"><Label>Address</Label><Textarea defaultValue="123 Business Ave, San Francisco, CA 94102" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Phone</Label><Input defaultValue="+1 555-0100" /></div>
                  <div className="space-y-2"><Label>Website</Label><Input defaultValue="https://crmpro.com" /></div>
                </div>
                <div className="space-y-2"><Label>Tax ID</Label><Input defaultValue="XX-XXXXXXX" /></div>
                <Button>Update Company</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" />Email Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>SMTP Host</Label><Input placeholder="smtp.example.com" /></div>
                  <div className="space-y-2"><Label>SMTP Port</Label><Input placeholder="587" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Username</Label><Input placeholder="user@example.com" /></div>
                  <div className="space-y-2"><Label>Password</Label><Input type="password" placeholder="••••••••" /></div>
                </div>
                <div className="space-y-2"><Label>From Email</Label><Input defaultValue="noreply@crmpro.com" /></div>
                <div className="flex items-center gap-2"><Switch defaultChecked /><Label>Enable SSL/TLS</Label></div>
                <Button>Save Email Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />Security Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Two-Factor Authentication", desc: "Require 2FA for all users", checked: true },
                  { label: "Session Timeout", desc: "Auto-logout after inactivity", checked: true },
                  { label: "IP Whitelisting", desc: "Restrict access to specific IPs", checked: false },
                  { label: "Audit Logging", desc: "Log all user actions", checked: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div><Label>{item.label}</Label><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                    <Switch defaultChecked={item.checked} />
                  </div>
                ))}
                <Separator />
                <div className="space-y-2"><Label>Session Timeout (minutes)</Label><Input type="number" defaultValue="30" className="w-[120px]" /></div>
                <Button>Save Security Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" />Notification Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "New lead assigned", checked: true },
                  { label: "Invoice paid", checked: true },
                  { label: "Task overdue", checked: true },
                  { label: "New support ticket", checked: true },
                  { label: "Contract expiring", checked: false },
                  { label: "Weekly summary email", checked: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <Label>{item.label}</Label>
                    <Switch defaultChecked={item.checked} />
                  </div>
                ))}
                <Button>Save Notification Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Setup;
