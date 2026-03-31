import React, { useState } from "react";
import { DataTablePage } from "@/components/shared/DataTablePage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { spamService } from "@/api/services/spam.service";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/usePermissions";

interface SpamFilter {
  _id: string;
  type: "sender" | "subject" | "phrase";
  value: string;
  active: boolean;
}

export default function SetupSpamFilters() {
  const [activeTab, setActiveTab] = useState<string>("sender");
  const [isOpen, setIsOpen] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<SpamFilter | null>(null);
  const [formData, setFormData] = useState<{
    type: "sender" | "subject" | "phrase";
    value: string;
  }>({
    type: "sender",
    value: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const { data: allFilters = [], isLoading } = useQuery<SpamFilter[]>({
    queryKey: ["spam-filters"],
    queryFn: spamService.getAll,
  });

  const filteredData = allFilters.filter((f) => f.type === activeTab);

  const createMutation = useMutation({
    mutationFn: (data: any) => spamService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spam-filters"] });
      toast({ title: "Success", description: "Filter added successfully" });
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
      spamService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spam-filters"] });
      toast({ title: "Success", description: "Filter updated successfully" });
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
    mutationFn: (id: string) => spamService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spam-filters"] });
      toast({ title: "Success", description: "Filter removed successfully" });
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
    setCurrentFilter(null);
    setFormData({ type: activeTab as any, value: "" });
    setIsOpen(true);
  };

  const handleEdit = (filter: SpamFilter) => {
    setCurrentFilter(filter);
    setFormData({ type: filter.type, value: filter.value });
    setIsOpen(true);
  };

  const handleDelete = (filter: SpamFilter) => {
    if (window.confirm("Are you sure you want to remove this filter?")) {
      deleteMutation.mutate(filter._id);
    }
  };

  const handleSave = () => {
    if (!formData.value) {
      toast({
        title: "Error",
        description: "Content is required",
        variant: "destructive",
      });
      return;
    }

    if (currentFilter) {
      updateMutation.mutate({ id: currentFilter._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <>
      <DataTablePage
        title="Spam Filters"
        subtitle="Block unwanted emails from creating tickets."
        addLabel="Add Spam Filter"
        onAdd={can("Support", "Create") ? handleAdd : undefined}
        onEdit={can("Support", "Edit") ? handleEdit : undefined}
        onDelete={can("Support", "Delete") ? handleDelete : undefined}
        columns={[{ key: "value", label: "Content" }]}
        data={filteredData}
        isLoading={isLoading}
        idField="_id"
        showIdColumn={false}
      >
        <div className="bg-muted/50 p-1 rounded-lg w-fit">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="bg-transparent h-9 p-0 gap-1">
              <TabsTrigger
                value="sender"
                className="rounded-md px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
              >
                Blocked Senders
              </TabsTrigger>
              <TabsTrigger
                value="subject"
                className="rounded-md px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
              >
                Blocked Subjects
              </TabsTrigger>
              <TabsTrigger
                value="phrase"
                className="rounded-md px-4 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm"
              >
                Blocked Phrases
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </DataTablePage>

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
                {currentFilter ? "Edit Spam Filter" : "Add Spam Filter"}
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                  <span className="text-red-500">*</span> Type
                </Label>
                <Select
                  value={formData.type}
                  onValueChange={(val: any) =>
                    setFormData({ ...formData, type: val })
                  }
                >
                  <SelectTrigger className="h-11 border-slate-200 focus:ring-primary/20 transition-all rounded-lg">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sender">Sender</SelectItem>
                    <SelectItem value="subject">Subject</SelectItem>
                    <SelectItem value="phrase">Phrase</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                  <span className="text-red-500">*</span> Content
                </Label>
                <Textarea
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value })
                  }
                  placeholder="Enter email address, subject or phrase to block..."
                  className="min-h-[120px] border-slate-200 focus:ring-primary/20 transition-all rounded-lg resize-none p-3"
                  disabled={
                    currentFilter
                      ? !can("Support", "Edit")
                      : !can("Support", "Create")
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
                  (currentFilter
                    ? !can("Support", "Edit")
                    : !can("Support", "Create"))
                }
                className="px-8 h-10 bg-[#1e293b] hover:bg-[#334155] text-white font-bold rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
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
