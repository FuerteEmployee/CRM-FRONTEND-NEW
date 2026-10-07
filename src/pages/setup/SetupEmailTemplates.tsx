import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsService } from "@/api/services/settings.service";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { Loader2, Search, Mail, Plus } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

// Fixed section order matching the reference layout — any template whose
// module isn't in this list still shows, just appended alphabetically after.
const MODULE_ORDER = [
  "Tickets", "Estimates", "Contracts", "Invoices", "Subscriptions",
  "Credit Note", "Tasks", "Customers", "Proposals", "Projects",
  "Staff Members", "Leads", "Estimate Request", "Notifications",
  "General Data Protection Regulation (GDPR)",
];

export default function SetupEmailTemplates() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", subject: "", message: "", module: MODULE_ORDER[0] });
  const [search, setSearch] = useState("");

  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const { toast } = useToast();
  const canWrite = editingId ? can("Email Templates", "Edit") : can("Email Templates", "Create");

  const { data: templates = [], isLoading } = useQuery<any[]>({
    queryKey: ["email-templates"],
    queryFn: async () => {
      try {
        const response = await settingsService.getEmailTemplates();
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error fetching email templates:", error);
        return [];
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => settingsService.createEmailTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({ title: "Success", description: "Template created successfully" });
      closeModal();
    },
    onError: (err: any) => toast({ title: "Error", description: err?.response?.data?.message || "Failed to create template", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => settingsService.updateEmailTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({ title: "Success", description: "Template updated successfully" });
      closeModal();
    },
    onError: (err: any) => toast({ title: "Error", description: err?.response?.data?.message || "Failed to update template", variant: "destructive" }),
  });

  // Used for both the single per-row toggle and the bulk Enable All/Disable
  // All action (fired once per template in the section, in parallel).
  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => settingsService.updateEmailTemplate(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-templates"] }),
    onError: () => toast({ title: "Error", description: "Failed to update template status", variant: "destructive" }),
  });

  const openModal = (template?: any) => {
    if (template) {
      setEditingId(template._id);
      setFormData({
        name: template.name || "",
        subject: template.subject || "",
        message: template.message || "",
        module: template.module || MODULE_ORDER[0],
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", subject: "", message: "", module: MODULE_ORDER[0] });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!formData.name || !formData.subject || !formData.message || !formData.module) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter((t: any) => (t.name || "").toLowerCase().includes(q) || (t.subject || "").toLowerCase().includes(q));
  }, [templates, search]);

  const sections = useMemo(() => {
    const groups = new Map<string, any[]>();
    filtered.forEach((t: any) => {
      const mod = t.module || "Other";
      if (!groups.has(mod)) groups.set(mod, []);
      groups.get(mod)!.push(t);
    });
    const known = MODULE_ORDER.filter((m) => groups.has(m));
    const unknown = [...groups.keys()].filter((m) => !MODULE_ORDER.includes(m)).sort();
    return [...known, ...unknown].map((mod) => ({ module: mod, items: groups.get(mod)! }));
  }, [filtered]);

  const bulkToggleSection = (items: any[], active: boolean) => {
    items.forEach((t) => toggleMutation.mutate({ id: t._id, active }));
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Email Templates</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Manage transactional emails sent to customers and staff
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9 h-9 bg-background shadow-sm rounded-lg text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {can("Email Templates", "Create") && (
              <Button onClick={() => openModal()} className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-9 uppercase text-xs tracking-widest">
                <Plus className="h-4 w-4" /> Add Template
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground italic">Loading templates...</p>
        ) : sections.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-12">No email templates found.</p>
        ) : (
          <div className="space-y-5">
            {sections.map(({ module, items }) => (
              <Card key={module} className="rounded-lg shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-3 bg-muted/40 border-b border-border/50">
                  <h3 className="text-sm font-black text-foreground">{module}</h3>
                  {can("Email Templates", "Edit") && (
                    <div className="flex items-center gap-3 text-xs font-bold">
                      <button className="text-primary hover:underline" onClick={() => bulkToggleSection(items, true)}>
                        Enable All
                      </button>
                      <span className="text-muted-foreground">|</span>
                      <button className="text-primary hover:underline" onClick={() => bulkToggleSection(items, false)}>
                        Disable All
                      </button>
                    </div>
                  )}
                </div>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Template Name</TableHead>
                        <TableHead className="w-24" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((t: any) => (
                        <TableRow key={t._id}>
                          <TableCell>
                            <button
                              className={`font-medium hover:underline text-left ${t.active === false ? "text-muted-foreground line-through" : "text-primary"}`}
                              onClick={() => navigate(`/admin/setup/email-templates/${t._id}`)}
                            >
                              {t.name}
                            </button>
                          </TableCell>
                          <TableCell className="text-right">
                            {can("Email Templates", "Edit") && (
                              <button
                                className="text-primary hover:underline text-xs font-bold"
                                onClick={() => toggleMutation.mutate({ id: t._id, active: t.active === false })}
                              >
                                {t.active === false ? "Enable" : "Disable"}
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              {editingId ? "Edit Template" : "Add Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Section
              </label>
              <Select value={formData.module} onValueChange={(v) => setFormData({ ...formData, module: v })} disabled={!canWrite}>
                <SelectTrigger className="h-10 border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {MODULE_ORDER.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Template Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-10 border-gray-300 focus:ring-1 focus:ring-primary text-gray-800"
                placeholder="e.g. Invoice Sent"
                disabled={!canWrite}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Subject
              </label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="h-10 border-gray-300 focus:ring-1 focus:ring-primary text-gray-800"
                placeholder="e.g. Your Invoice #{number}"
                disabled={!canWrite}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Message Body
              </label>
              <Textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="min-h-[150px] border-gray-300 focus:ring-1 focus:ring-primary text-gray-800"
                placeholder="Enter email template body..."
                disabled={!canWrite}
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={closeModal} className="bg-white border-gray-300 text-foreground hover:bg-gray-100 px-6 h-10 font-medium">
              Close
            </Button>
            <Button onClick={handleSave} className="px-8 h-10 font-medium text-white" disabled={createMutation.isPending || updateMutation.isPending || !canWrite}>
              {createMutation.isPending || updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
