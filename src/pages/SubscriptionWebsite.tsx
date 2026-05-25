import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Globe } from "lucide-react";

const SubscriptionWebsite = () => {
  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">Website Subscriptions</h1>
            <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest mt-1">
              Manage website subscription plans
            </p>
          </div>
        </div>

        <Card className="border-none shadow-2xl shadow-primary/5 rounded-[2.5rem] bg-background/60 backdrop-blur-xl overflow-hidden">
          <CardContent className="p-20 flex flex-col items-center justify-center">
            <div className="p-6 bg-primary/10 rounded-full mb-6">
              <Globe className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-2xl font-black mb-2">Coming Soon</h2>
            <p className="text-muted-foreground font-bold uppercase tracking-widest">
              Website subscriptions management is under development
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SubscriptionWebsite;
