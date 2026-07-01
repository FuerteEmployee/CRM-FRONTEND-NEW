import React, { useState } from "react";
import { DataTablePage } from "@/components/shared/DataTablePage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leadService } from "@/api/services/lead.service";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Zap } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

interface LeadSource {
  _id: string;
  name: string;
  totalLeads?: number;
}

export default function SetupLeadsSources() {
  const [isOpen, setIsOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkNames, setBulkNames] = useState("");
  const [currentSource, setCurrentSource] = useState<LeadSource | null>(null);
  const [formData, setFormData] = useState({ name: "" });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const { data: sources = [], isLoading } = useQuery<LeadSource[]>({
    queryKey: ["lead-sources"],
    queryFn: leadService.getSources,
  });


  const bulkCreateMutation = useMutation({
    mutationFn: (items: string[]) => leadService.bulkCreateSource({ items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-sources"] });
      toast({ title: "Success", description: "Bulk create successful" });
      setIsBulkModalOpen(false);
      setBulkNames("");
    },
    onError: () => toast({ title: "Error", variant: "destructive", description: "Failed to bulk create" }),
  });
  const createMutation = useMutation({
    mutationFn: (data: any) => leadService.createSource(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-sources"] });
      toast({
        title: "Success",
        description: "Lead source created successfully",
      });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      leadService.updateSource(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-sources"] });
      toast({
        title: "Success",
        description: "Lead source updated successfully",
      });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => leadService.deleteSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-sources"] });
      toast({
        title: "Success",
        description: "Lead source deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (items: LeadSource[]) => {
      await Promise.all(items.map((item) => leadService.deleteSource(item._id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-sources"] });
      toast({ title: "Deleted", description: "Selected items deleted successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleAdd = () => {
    setCurrentSource(null);
    setFormData({ name: "" });
    setIsOpen(true);
  };

  const handleEdit = (source: LeadSource) => {
    setCurrentSource(source);
    setFormData({ name: source.name });
    setIsOpen(true);
  };

  const handleDelete = (source: LeadSource) => {
    if (window.confirm("Are you sure you want to delete this lead source?")) {
      deleteMutation.mutate(source._id);
    }
  };

  const handleSave = () => {
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Source Name is required",
        variant: "destructive",
      });
      return;
    }

    if (currentSource) {
      updateMutation.mutate({ id: currentSource._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };


  const handleBulkSave = () => {
    if (!bulkNames.trim()) {
      toast({ title: "Error", variant: "destructive", description: "Please enter at least one item" });
      return;
    }
    const names = bulkNames.split(/[\n,]+/).map(n => n.trim()).filter(n => n);
    if (names.length === 0) return;
    bulkCreateMutation.mutate(names);
  };
  return (
    <>
      <DataTablePage
        title="Lead Sources"
        subtitle="Manage the sources from which leads are generated."
        toolbarActions={
          can("Leads", "Create") && (
            <Button
              variant="outline"
              onClick={() => {
                setBulkNames("");
                setIsBulkModalOpen(true);
              }}
              className="flex items-center gap-2 h-11 px-6 rounded-xl border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all duration-200 font-black text-[10px] uppercase tracking-widest"
            >
              <Zap className="h-4 w-4" />
              Bulk Actions
            </Button>
          )
        }
        addLabel="New Source"
        onAdd={can("Leads", "Create") ? handleAdd : undefined}
        onEdit={can("Leads", "Edit") ? handleEdit : undefined}
        onDelete={can("Leads", "Delete") ? handleDelete : undefined}
        enableBulkActions={true}
        onBulkDelete={(items) => bulkDeleteMutation.mutate(items as LeadSource[])}
        columns={[
          {
            key: "name",
            label: "Source Name",
            render: (row: LeadSource) => (
              <div>
                <div className="font-bold text-foreground">{row.name}</div>
                <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                  Total Leads: {row.totalLeads || 0}
                </div>
              </div>
            ),
          },
        ]}
        data={sources}
        isLoading={isLoading}
        idField="_id"
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <DialogHeader className="px-6 py-4 border-b bg-gray-50/50">
              <DialogTitle className="text-xl font-bold text-foreground">
                {currentSource ? "Edit Source" : "New Source"}
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                  <span className="text-red-500">*</span> Source Name
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter source name..."
                  className="h-11 border-slate-200 focus:ring-primary/20 transition-all rounded-lg"
                  disabled={
                    currentSource
                      ? !can("Leads", "Edit")
                      : !can("Leads", "Create")
                  }
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-4 bg-gray-50/50 border-t gap-3 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="px-6 h-10 border-slate-200 hover:bg-slate-100 text-foreground font-semibold rounded-lg transition-all"
              >
                Close
              </Button>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  (currentSource
                    ? !can("Leads", "Edit")
                    : !can("Leads", "Create"))
                }
                className="px-8 h-10 bg-[#1e293b] hover:bg-[#334155] font-bold rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    
      {/* Bulk Create Modal */}
      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              Bulk Create Lead Sources
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                <span className="text-red-500 mr-1">*</span>Item Names (comma or newline separated)
              </label>
              <textarea
                value={bulkNames}
                onChange={(e) => setBulkNames(e.target.value)}
                className="w-full min-h-[120px] p-3 border border-gray-300 rounded-md focus:ring-1 focus:ring-primary focus:outline-none text-gray-800"
                placeholder="Item A, Item B\nItem C"
                disabled={!can("Leads", "Create")}
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsBulkModalOpen(false)}
              className="bg-white border-gray-300 text-foreground hover:bg-gray-100 px-6 h-10 font-medium"
            >
              Close
            </Button>
            <Button
              onClick={handleBulkSave}
              className="px-8 h-10 font-medium"
              disabled={
                bulkCreateMutation.isPending || !can("Leads", "Create")
              }
            >
              {bulkCreateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
