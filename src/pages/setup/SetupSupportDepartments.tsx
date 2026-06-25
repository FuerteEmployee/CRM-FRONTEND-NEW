import { useState } from "react";
import { DataTablePage } from "@/components/shared/DataTablePage";
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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HelpCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supportService } from "@/api/services/support.service";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { Loader2, Zap } from "lucide-react";

export default function SetupSupportDepartments() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkNames, setBulkNames] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    hide_from_client: false,
    imap_host: "",
    imap_username: "",
    imap_password: "",
    imap_encryption: "none",
    folder: "",
    google_calendar_id: "",
    delete_after_import: false,
  });

  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ["support-departments"],
    queryFn: async () => {
      try {
        const response = await supportService.getDepartments();
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error fetching departments:", error);
        return [];
      }
    },
  });



  const bulkCreateMutation = useMutation({
    mutationFn: (items: string[]) => supportService.bulkCreateDepartment({ items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-departments"] });
      toast.success("Bulk create successful");
      setIsBulkModalOpen(false);
      setBulkNames("");
    },
    onError: () => toast.error("Failed to bulk create"),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => supportService.createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-departments"] });
      toast.success("Department created successfully");
      closeModal();
    },
    onError: () => toast.error("Failed to create department")
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      supportService.updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-departments"] });
      toast.success("Department updated successfully");
      closeModal();
    },
    onError: () => toast.error("Failed to update department"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supportService.deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-departments"] });
      toast.success("Department deleted successfully");
    },
    onError: () => toast.error("Failed to delete department"),
  });

  const openModal = (dept?: any) => {
    if (dept) {
      setEditingId(dept._id);
      setFormData({
        name: dept.name || "",
        email: dept.email || "",
        hide_from_client: dept.hide_from_client || false,
        imap_host: dept.imap_host || "",
        imap_username: dept.imap_username || "",
        imap_password: dept.imap_password || "",
        imap_encryption: dept.imap_encryption || "none",
        folder: dept.folder || "",
        google_calendar_id: dept.google_calendar_id || "",
        delete_after_import: dept.delete_after_import || false,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        email: "",
        hide_from_client: false,
        imap_host: "",
        imap_username: "",
        imap_password: "",
        imap_encryption: "none",
        folder: "",
        google_calendar_id: "",
        delete_after_import: false,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!formData.name) {
      toast.error("Department name is required");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleBulkSave = () => {
    if (!bulkNames.trim()) {
      toast.error("Please enter at least one item");
      return;
    }
    const names = bulkNames.split(/[\n,]+/).map(n => n.trim()).filter(n => n);
    if (names.length === 0) return;
    bulkCreateMutation.mutate(names);
  };


  return (
    <>
      <DataTablePage
        title="Departments"
        subtitle="Manage and organize your support categories and IMAP settings"
        toolbarActions={
          can("Support", "Create") && (
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
        addLabel="New Department"
        onAdd={can("Support", "Create") ? () => openModal() : undefined}
        onRefresh={() =>
          queryClient.invalidateQueries({ queryKey: ["support-departments"] })
        }
        isLoading={isLoading}
        data={departments}
        onEdit={can("Support", "Edit") ? (dept) => openModal(dept) : undefined}
        onDelete={
          can("Support", "Delete")
            ? (dept) => {
                if (
                  confirm("Are you sure you want to delete this department?")
                ) {
                  deleteMutation.mutate(dept._id);
                }
              }
            : undefined
        }
        columns={[
          {
            key: "name",
            label: "Name",
            className: "font-medium text-foreground uppercase",
          },
          { key: "email", label: "Department Email" },
          {
            key: "google_calendar_id",
            label: "Google Calendar ID",
            render: (dept) => (
              <span className="text-muted-foreground text-sm">
                {dept.google_calendar_id || "-"}
              </span>
            ),
          },
        ]}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
          <DialogHeader className="px-6 py-5 border-b bg-slate-50/50">
            <DialogTitle className="text-xl font-bold text-foreground">
              {editingId ? "Edit Department" : "New Department"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                  <span className="text-red-500">*</span> Department Name
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Software Support"
                  className="h-11 border-slate-200 focus:ring-primary/20 transition-all rounded-xl text-base"
                  disabled={
                    editingId
                      ? !can("Support", "Edit")
                      : !can("Support", "Create")
                  }
                />
              </div>

              <div className="flex items-center gap-2 py-1">
                <Checkbox
                  id="hide"
                  checked={formData.hide_from_client}
                  onCheckedChange={(v) =>
                    setFormData({ ...formData, hide_from_client: !!v })
                  }
                />
                <Label
                  htmlFor="hide"
                  className="text-sm font-medium text-foreground cursor-pointer"
                >
                  Hide from client?
                </Label>
              </div>

              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-700">
                  Department Email
                </Label>
                <Input
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="support@example.com"
                  className="h-11 border-slate-200 focus:ring-primary/20 transition-all rounded-xl text-base"
                />
              </div>
            </div>

            {/* IMAP Config */}
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-base font-bold text-foreground">
                  Email to ticket configuration
                </h3>
                <HelpCircle className="h-4 w-4 text-slate-400" />
              </div>

              <div className="space-y-5 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-2">
                  <Label className="text-[13px] font-bold text-slate-700">
                    IMAP Username
                  </Label>
                  <Input
                    value={formData.imap_username}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        imap_username: e.target.value,
                      })
                    }
                    className="h-11 border-slate-200 bg-white focus:ring-primary/20 transition-all rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] font-bold text-slate-700">
                    IMAP Host
                  </Label>
                  <Input
                    value={formData.imap_host}
                    onChange={(e) =>
                      setFormData({ ...formData, imap_host: e.target.value })
                    }
                    placeholder="imap.yourserver.com"
                    className="h-11 border-slate-200 bg-white focus:ring-primary/20 transition-all rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px] font-bold text-slate-700">
                    Password
                  </Label>
                  <Input
                    type="password"
                    value={formData.imap_password}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        imap_password: e.target.value,
                      })
                    }
                    className="h-11 border-slate-200 bg-white focus:ring-primary/20 transition-all rounded-xl"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-[13px] font-bold text-slate-700">
                    Encryption
                  </Label>
                  <RadioGroup
                    value={formData.imap_encryption}
                    onValueChange={(v) =>
                      setFormData({ ...formData, imap_encryption: v })
                    }
                    className="flex flex-wrap items-center gap-4 pt-1"
                  >
                    <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                      <RadioGroupItem value="tls" id="tls" />
                      <Label
                        htmlFor="tls"
                        className="text-sm font-medium cursor-pointer"
                      >
                        TLS
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                      <RadioGroupItem value="ssl" id="ssl" />
                      <Label
                        htmlFor="ssl"
                        className="text-sm font-medium cursor-pointer"
                      >
                        SSL
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                      <RadioGroupItem value="none" id="none" />
                      <Label
                        htmlFor="none"
                        className="text-sm font-medium cursor-pointer"
                      >
                        No Encryption
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[13px] font-bold text-slate-700">
                      Folder
                    </Label>
                    <button
                      type="button"
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1 pr-1"
                    >
                      Retrieve Folders
                    </button>
                  </div>
                  <Select
                    value={formData.folder}
                    onValueChange={(v) =>
                      setFormData({ ...formData, folder: v })
                    }
                  >
                    <SelectTrigger className="h-11 border-slate-200 bg-white rounded-xl">
                      <SelectValue placeholder="Nothing selected" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INBOX">INBOX</SelectItem>
                      <SelectItem value="Sent">Sent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="delete"
                    checked={formData.delete_after_import}
                    onCheckedChange={(v) =>
                      setFormData({ ...formData, delete_after_import: !!v })
                    }
                  />
                  <Label
                    htmlFor="delete"
                    className="text-sm font-medium text-foreground cursor-pointer"
                  >
                    Delete mail after import?
                  </Label>
                </div>

                <Button
                  variant="outline"
                  type="button"
                  className="w-full text-xs font-bold border-slate-200 hover:bg-white hover:border-slate-300 rounded-xl py-5 shadow-sm"
                >
                  Test IMAP Connection
                </Button>
              </div>
            </div>

            {/* Google Calendar */}
            <div className="space-y-2">
              <Label className="text-[13px] font-bold text-slate-700">
                Google Calendar ID
              </Label>
              <Input
                value={formData.google_calendar_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    google_calendar_id: e.target.value,
                  })
                }
                className="h-11 border-slate-200 focus:ring-primary/20 transition-all rounded-xl"
                placeholder="Calendar ID..."
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 bg-slate-50/50 border-t flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              className="px-6 h-10 border-slate-200 hover:bg-white hover:border-slate-300 text-foreground font-semibold rounded-xl transition-all shadow-sm"
            >
              Close
            </Button>
            <Button
              onClick={() => handleSave(true)}
              className="px-8 h-10 font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] min-w-[100px]"
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                (editingId
                  ? !can("Support", "Edit")
                  : !can("Support", "Create"))
              }
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    
      {/* Bulk Create Modal */}
      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-xl">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold text-gray-800">
              Bulk Create Departments
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
                disabled={!can("Support", "Create")}
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsBulkModalOpen(false)}
              className="bg-white border-gray-300 text-foreground hover:bg-gray-100 px-6 h-10 font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkSave}
              className="px-8 h-10 font-medium"
              disabled={
                bulkCreateMutation.isPending || !can("Support", "Create")
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
