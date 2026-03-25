import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { recentActivities } from "@/data/mockData";

const allActivities = [
  ...recentActivities,
  { id: 7, user: "John Doe", action: "logged in", target: "", time: "5 hours ago", avatar: "JD" },
  { id: 8, user: "Sarah Chen", action: "deleted task", target: "Old Migration Script", time: "6 hours ago", avatar: "SC" },
  { id: 9, user: "Mike Johnson", action: "changed role of", target: "Lisa Park to Manager", time: "1 day ago", avatar: "MJ" },
  { id: 10, user: "Emily Davis", action: "exported report", target: "Q1 Revenue Summary", time: "1 day ago", avatar: "ED" },
  { id: 11, user: "Alex Turner", action: "deployed", target: "v2.3.1 to production", time: "2 days ago", avatar: "AT" },
  { id: 12, user: "Tom Wilson", action: "archived project", target: "Legacy CRM", time: "2 days ago", avatar: "TW" },
];

const ActivityLogs = () => (
  <DashboardLayout>
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Activity Log</h1>
        <p className="text-muted-foreground">Complete history of system actions</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {allActivities.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">{a.avatar}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{a.user}</span>{" "}
                    <span className="text-muted-foreground">{a.action}</span>{" "}
                    {a.target && <span className="font-medium">{a.target}</span>}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{a.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  </DashboardLayout>
);

export default ActivityLogs;
