import React, { useState } from "react";
import { DataTablePage } from "@/components/shared/DataTablePage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/api/services/finance.service";
import { hrmsbranchService } from "@/hrms/services/hrmsbranchService";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermissions } from "@/hooks/usePermissions";
import { canAccessBankDetails } from "@/lib/bankDetailsAccess";

interface BankDetail {
  _id: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branch: any;
  active: boolean;
}

export default function SetupBankDetails() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentBankDetail, setCurrentBankDetail] = useState<BankDetail | null>(null);
  const [formData, setFormData] = useState<{
    bankName: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    branch: string;
    active: boolean;
  }>({
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    branch: "",
    active: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can, user } = usePermissions();
  const isPilot = canAccessBankDetails(user?.email);

  if (!isPilot) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-background rounded-3xl border border-border/50 my-8">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Feature Not Available</h2>
        <p className="text-sm text-slate-500 max-w-md">
          Bank Details setup is not available for this account.
        </p>
      </div>
    );
  }

  const { data: bankDetails = [], isLoading } = useQuery<BankDetail[]>({
    queryKey: ["bank-details"],
    queryFn: () => financeService.getBankDetails().then((res: any) => res.data || res),
  });

  const { data: hrmsBranches = [] } = useQuery({
    queryKey: ["hrms-branches-picker"],
    queryFn: async () => {
      const res = await hrmsbranchService.getAll();
      return res?.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => financeService.createBankDetail(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-details"] });
      toast({ title: "Success", description: "Bank detail created successfully" });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => financeService.updateBankDetail(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-details"] });
      toast({ title: "Success", description: "Bank detail updated successfully" });
      setIsOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeService.deleteBankDetail(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-details"] });
      toast({ title: "Success", description: "Bank detail removed successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to remove", variant: "destructive" });
    },
  });

  const handleAdd = () => {
    setCurrentBankDetail(null);
    setFormData({
      bankName: "",
      accountHolderName: "",
      accountNumber: "",
      ifscCode: "",
      branch: hrmsBranches[0]?._id || "",
      active: true,
    });
    setIsOpen(true);
  };

  const handleEdit = (item: BankDetail) => {
    setCurrentBankDetail(item);
    setFormData({
      bankName: item.bankName || "",
      accountHolderName: item.accountHolderName || "",
      accountNumber: item.accountNumber || "",
      ifscCode: item.ifscCode || "",
      branch: item.branch?._id || item.branch || "",
      active: item.active ?? true,
    });
    setIsOpen(true);
  };

  const handleDelete = (item: BankDetail) => {
    if (window.confirm("Are you sure you want to delete this bank detail record?")) {
      deleteMutation.mutate(item._id);
    }
  };

  const handleSave = () => {
    // branch is an ObjectId ref on the backend — sending "" instead of omitting
    // it would fail Mongoose's cast, even though the field itself isn't required.
    const payload = { ...formData, branch: formData.branch || undefined };

    if (currentBankDetail) {
      updateMutation.mutate({ id: currentBankDetail._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <>
      <DataTablePage
        title="Bank Details"
        subtitle="Manage company bank account details for invoicing and financial records."
        addLabel="Add New Bank Detail"
        onAdd={can("Settings", "Edit") ? handleAdd : undefined}
        onEdit={can("Settings", "Edit") ? handleEdit : undefined}
        onDelete={can("Settings", "Edit") ? handleDelete : undefined}
        columns={[
          { key: "bankName", label: "Bank Name" },
          { key: "accountHolderName", label: "Account Holder Name" },
          { key: "accountNumber", label: "Account Number" },
          { key: "ifscCode", label: "IFSC Code" },
          {
            key: "branch",
            label: "Branch",
            render: (row: BankDetail) => (
              <span className="font-semibold text-slate-700">
                {row.branch?.name || row.branch?.branchName || "-"}
              </span>
            ),
          },
          {
            key: "active",
            label: "Active",
            render: (row: BankDetail) => (
              <div className="flex items-center">
                <Switch
                  checked={row.active}
                  onCheckedChange={(checked) => {
                    updateMutation.mutate({
                      id: row._id,
                      data: {
                        bankName: row.bankName,
                        accountHolderName: row.accountHolderName,
                        accountNumber: row.accountNumber,
                        ifscCode: row.ifscCode,
                        branch: row.branch?._id || row.branch,
                        active: checked,
                      },
                    });
                  }}
                  disabled={updateMutation.isPending || !can("Settings", "Edit")}
                />
              </div>
            ),
          },
        ]}
        data={bankDetails}
        isLoading={isLoading}
        idField="_id"
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              {currentBankDetail ? "Edit Bank Detail" : "Add New Bank Detail"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Bank Name</Label>
              <Input
                placeholder="e.g. HDFC Bank"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Account Holder Name</Label>
              <Input
                placeholder="e.g. Acme Corporation Pvt Ltd"
                value={formData.accountHolderName}
                onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Account Number</Label>
              <Input
                placeholder="e.g. 50200012345678"
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">IFSC Code</Label>
              <Input
                placeholder="e.g. HDFC0001234"
                value={formData.ifscCode}
                onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Branch</Label>
              <Select
                value={formData.branch}
                onValueChange={(value) => setFormData({ ...formData, branch: value })}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Select HRMS Branch..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {hrmsBranches.map((b: any) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.name || b.branchName || b.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Active</Label>
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="rounded-xl font-bold"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {currentBankDetail ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
