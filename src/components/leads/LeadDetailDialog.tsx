import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { User, FileText, CheckSquare, Paperclip, Bell, StickyNote, Activity } from "lucide-react";
import { LeadProfileTab } from "./tabs/LeadProfileTab";
import { LeadProposalsTab } from "./tabs/LeadProposalsTab";
import { LeadTasksTab } from "./tabs/LeadTasksTab";
import { LeadAttachmentsTab } from "./tabs/LeadAttachmentsTab";
import { LeadRemindersTab } from "./tabs/LeadRemindersTab";
import { LeadNotesTab } from "./tabs/LeadNotesTab";
import { LeadActivityLogTab } from "./tabs/LeadActivityLogTab";

const TABS = [
  { value: "profile", label: "Profile", icon: User },
  { value: "proposals", label: "Proposals", icon: FileText },
  { value: "tasks", label: "Tasks", icon: CheckSquare },
  { value: "attachments", label: "Attachments", icon: Paperclip },
  { value: "reminders", label: "Reminders", icon: Bell },
  { value: "notes", label: "Notes", icon: StickyNote },
  { value: "activity", label: "Activity Log", icon: Activity },
] as const;

interface LeadDetailDialogProps {
  lead: any;
  customFieldDefs: any[];
  onEditClick: () => void;
}

export function LeadDetailDialog({ lead, customFieldDefs, onEditClick }: LeadDetailDialogProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "profile";

  const setActiveTab = (tab: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("leadView", lead._id);
        next.set("tab", tab);
        return next;
      },
      { replace: true },
    );
  };

  if (!lead) return null;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-slate-100/70 p-1.5 rounded-2xl">
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="rounded-xl gap-1.5 text-xs font-bold data-[state=active]:shadow-md"
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="profile" className="mt-6">
        <LeadProfileTab lead={lead} customFieldDefs={customFieldDefs} onEditClick={onEditClick} />
      </TabsContent>
      <TabsContent value="proposals" className="mt-6">
        <LeadProposalsTab lead={lead} />
      </TabsContent>
      <TabsContent value="tasks" className="mt-6">
        <LeadTasksTab lead={lead} />
      </TabsContent>
      <TabsContent value="attachments" className="mt-6">
        <LeadAttachmentsTab lead={lead} />
      </TabsContent>
      <TabsContent value="reminders" className="mt-6">
        <LeadRemindersTab lead={lead} />
      </TabsContent>
      <TabsContent value="notes" className="mt-6">
        <LeadNotesTab lead={lead} />
      </TabsContent>
      <TabsContent value="activity" className="mt-6">
        <LeadActivityLogTab lead={lead} />
      </TabsContent>
    </Tabs>
  );
}
