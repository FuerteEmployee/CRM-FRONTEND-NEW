import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Building, MapPin } from "lucide-react";

const Profile = () => (
  <DashboardLayout>
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">JD</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">John Doe</h2>
              <p className="text-sm text-muted-foreground">Admin • Joined Jan 2025</p>
            </div>
          </div>
          <Separator className="mb-6" />
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>First Name</Label><Input defaultValue="John" /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input defaultValue="Doe" /></div>
            </div>
            <div className="space-y-2"><Label>Email</Label><Input defaultValue="john@company.com" type="email" /></div>
            <div className="space-y-2"><Label>Phone</Label><Input defaultValue="+1 555-0100" type="tel" /></div>
            <div className="space-y-2"><Label>Company</Label><Input defaultValue="CRMPro Inc" /></div>
            <div className="space-y-2"><Label>Location</Label><Input defaultValue="San Francisco, CA" /></div>
            <Button className="w-fit">Save Changes</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </DashboardLayout>
);

export default Profile;
