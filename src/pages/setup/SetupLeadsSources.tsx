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
import { Loader2 } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

interface LeadSource {
  _id: string;
  name: string;
  totalLeads?: number;
}

export default function SetupLeadsSources() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSource, setCurrentSource] = useState<LeadSource | null>(null);
  const [formData, setFormData] = useState({ name: "" });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const { data: sources = [], isLoading } = useQuery<LeadSource[]>({
    queryKey: ["lead-sources"],
    queryFn: leadService.getSources,
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

  return (
    <>
      <DataTablePage
        title="Lead Sources"
        subtitle="Manage the sources from which leads are generated."
        addLabel="New Source"
        onAdd={can("Leads", "Create") ? handleAdd : undefined}
        onEdit={can("Leads", "Edit") ? handleEdit : undefined}
        onDelete={can("Leads", "Delete") ? handleDelete : undefined}
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
    </>
  );
}
