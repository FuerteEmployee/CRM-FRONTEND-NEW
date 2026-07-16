import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/hrms/components/ui/card";
import { Button } from "@/hrms/components/ui/button";
import { Input } from "@/hrms/components/ui/input";
import { Badge } from "@/hrms/components/ui/badge";
import { Skeleton } from "@/hrms/components/ui/skeleton";
import { Plus, Edit2, Power } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/hrms/components/ui/dialog";
import { managingCompanyService, type ManagingCompany } from "@/hrms/services/managingCompanyService";
import { toast } from "@/hrms/components/ui/use-toast";
import { useConfirm } from "@/hrms/contexts/ConfirmContext";
import { cn } from "@/hrms/lib/utils";

const ManagingCompaniesPage = () => {
  const confirm = useConfirm();
  const [companies, setCompanies] = useState<ManagingCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", active: true });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setIsLoading(true);
    try {
      const data = await managingCompanyService.list();
      setCompanies(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load companies", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (company?: ManagingCompany) => {
    if (company) {
      setEditingId(company._id || company.id || null);
      setFormData({ name: company.name, active: company.active });
    } else {
      setEditingId(null);
      setFormData({ name: "", active: true });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Company name is required", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        await managingCompanyService.update(editingId, formData);
        toast({ title: "Success", description: "Company updated" });
      } else {
        await managingCompanyService.create(formData);
        toast({ title: "Success", description: "Company created" });
      }
      setIsDialogOpen(false);
      await loadCompanies();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Operation failed",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    const ok = await confirm({
      title: "Deactivate this company?",
      description:
        "It will no longer be selectable for new employees. Existing assignments and settlement history are unaffected.",
      confirmText: "Deactivate",
      variant: "warning",
    });
    if (!ok) return;

    try {
      await managingCompanyService.deactivate(id);
      toast({ title: "Success", description: "Company deactivated" });
      await loadCompanies();
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to deactivate", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Managing Companies</h1>
          <p className="text-sm text-muted-foreground">Configure external companies (LG, Samsung, etc.)</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="h-4 w-4" /> Add Company
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Companies List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No companies yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Name</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-right py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {companies.map((company) => (
                    <tr key={company._id || company.id} className="hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{company.name}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={company.active ? "default" : "secondary"}
                          className={company.active ? "bg-emerald-100 text-emerald-700" : ""}
                        >
                          {company.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(company)}
                          className="gap-1"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Edit
                        </Button>
                        {company.active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDeactivate(company._id || company.id || "")
                            }
                            className="gap-1 text-amber-600 hover:bg-amber-50"
                          >
                            <Power className="h-3.5 w-3.5" /> Deactivate
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Company" : "Add Company"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">
                Company Name
              </label>
              <Input
                placeholder="e.g. LG, Samsung"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-lg"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-lg"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-lg"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManagingCompaniesPage;
