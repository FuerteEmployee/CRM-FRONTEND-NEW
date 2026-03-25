import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ExternalLink } from "lucide-react";

const articles = [
  { title: "Getting Started with CRMPro", category: "Basics" },
  { title: "How to Create Invoices", category: "Finance" },
  { title: "Setting Up Support Tickets", category: "Support" },
  { title: "Managing Leads", category: "Leads" },
  { title: "Configuring Email Templates", category: "Email" },
  { title: "User Roles & Permissions", category: "Security" },
];

export default function SetupHelp() {
  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold">Help</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Browse documentation and support articles.
          </p>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search help articles..." />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <Card key={a.title} className="hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader className="pb-2">
                <p className="text-xs text-primary font-medium">{a.category}</p>
                <CardTitle className="text-sm font-medium flex items-center justify-between gap-2">
                  {a.title}
                  <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Click to read the full article in our documentation.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
