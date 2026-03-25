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

export default function SetupSupportDepartments() {
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const createMutation = useMutation({
    mutationFn: (data: any) => supportService.createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-departments"] });
      toast.success("Department created successfully");
      closeModal();
    },
    onError: () => toast.error("Failed to create department"),
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

  return (
    <>
      <DataTablePage
        title="Departments"
        subtitle="Manage and organize your support categories and IMAP settings"
        addLabel="New Department"
        onAdd={() => openModal()}
        onRefresh={() =>
          queryClient.invalidateQueries({ queryKey: ["support-departments"] })
        }
        isLoading={isLoading}
        data={departments}
        onEdit={(dept) => openModal(dept)}
        onDelete={(dept) => {
          if (confirm("Are you sure you want to delete this department?")) {
            deleteMutation.mutate(dept._id);
          }
        }}
        columns={[
          {
            key: "name",
            label: "Name",
            className: "font-medium text-[#1a2b3c] uppercase",
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
            <DialogTitle className="text-xl font-bold text-[#1e293b]">
              {editingId ? "Edit Department" : "New Department"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
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
                  className="text-sm font-medium text-slate-600 cursor-pointer"
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
                <h3 className="text-base font-bold text-[#1e293b]">
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
                    className="text-sm font-medium text-slate-600 cursor-pointer"
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

          <DialogFooter className="px-6 py-5 bg-slate-50/50 border-t gap-3 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              className="px-6 h-11 border-slate-200 hover:bg-white hover:border-slate-300 text-slate-600 font-semibold rounded-xl transition-all shadow-sm"
            >
              Close
            </Button>
            <Button
              onClick={handleSave}
              className="px-8 h-11 bg-[#1a2b3c] hover:bg-[#2c3e50] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] min-w-[100px]"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
