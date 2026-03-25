import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Database,
  Shield,
  Bell,
  Megaphone,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { utilityService } from "@/api/services/utility.service";
import { formatDate } from "@/lib/dateFormat";
import { Skeleton } from "@/components/ui/skeleton";

const Utilities = () => {
  const { data: announcements = [], isLoading: isLoadingAnnouncements } =
    useQuery({
      queryKey: ["announcements"],
      queryFn: utilityService.getAnnouncements,
    });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Utilities</h1>
          <p className="text-muted-foreground">System tools and utilities</p>
        </div>

        <Tabs defaultValue="announcements" className="space-y-4">
          <TabsList>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="data">Data Management</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          </TabsList>

          <TabsContent value="announcements" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {isLoadingAnnouncements ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                       <Skeleton className="h-5 w-1/3" />
                    </CardHeader>
                    <CardContent>
                       <Skeleton className="h-4 w-full mb-1" />
                       <Skeleton className="h-4 w-2/3" />
                    </CardContent>
                  </Card>
                ))
              ) : announcements.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No active announcements found.
                  </CardContent>
                </Card>
              ) : (
                announcements.map((ann: any) => (
                  <Card key={ann._id}>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-primary" />
                        {ann.name || ann.subject}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground">
                        {ann.dateadded ? formatDate(ann.dateadded) : "-"}
                      </span>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {ann.message || ann.description}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Download className="h-4 w-4 text-primary" />
                    Export Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Export your data in various formats
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      CSV
                    </Button>
                    <Button variant="outline" size="sm">
                      Excel
                    </Button>
                    <Button variant="outline" size="sm">
                      PDF
                    </Button>
                    <Button variant="outline" size="sm">
                      JSON
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Upload className="h-4 w-4 text-primary" />
                    Import Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Import data from external sources
                  </p>
                  <Input type="file" className="text-sm" />
                  <Button size="sm">Upload & Import</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    Database Backup
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Create and manage database backups
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last backup: Mar 6, 2026 at 2:00 AM
                  </p>
                  <Button size="sm">Create Backup</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-destructive" />
                    Clear Cache
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Clear application cache and temporary data
                  </p>
                  <Button size="sm" variant="destructive">
                    Clear All Cache
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    label: "Email notifications",
                    desc: "Receive updates via email",
                  },
                  {
                    label: "Push notifications",
                    desc: "Browser push notifications",
                  },
                  {
                    label: "Task reminders",
                    desc: "Get reminded about upcoming tasks",
                  },
                  {
                    label: "Invoice alerts",
                    desc: "Notifications for invoice status changes",
                  },
                  {
                    label: "Team activity",
                    desc: "Updates when team members make changes",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <Label className="text-sm">{item.label}</Label>
                      <p className="text-xs text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-primary" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: "Database", status: "Healthy" },
                    { label: "API Server", status: "Healthy" },
                    { label: "File Storage", status: "Healthy" },
                    { label: "Email Service", status: "Warning" },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{s.label}</span>
                      <span
                        className={
                          s.status === "Healthy"
                            ? "text-success"
                            : "text-warning"
                        }
                      >
                        {s.status}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Security Log
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { event: "Login from new device", time: "2 hours ago" },
                    { event: "Password changed", time: "3 days ago" },
                    { event: "API key regenerated", time: "1 week ago" },
                    { event: "2FA enabled", time: "2 weeks ago" },
                  ].map((log) => (
                    <div
                      key={log.event}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>{log.event}</span>
                      <span className="text-muted-foreground text-xs">
                        {log.time}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Utilities;
