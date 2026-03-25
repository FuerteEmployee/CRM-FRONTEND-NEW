import React, { useState } from "react";
import { DataTablePage } from "@/components/shared/DataTablePage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeService } from "@/api/services/finance.service";
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
import { Loader2, Check, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface PaymentMode {
  _id: string;
  name: string;
  description: string;
  active: boolean;
  show_on_pdf: boolean;
  selected_by_default: boolean;
  invoices_only: boolean;
  expenses_only: boolean;
}

export default function SetupPaymentModes() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState<PaymentMode | null>(null);
  const [formData, setFormData] = useState<Omit<PaymentMode, "_id">>({
    name: "",
    description: "",
    active: true,
    show_on_pdf: false,
    selected_by_default: false,
    invoices_only: false,
    expenses_only: false,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: modes = [], isLoading } = useQuery<PaymentMode[]>({
    queryKey: ["payment-modes"],
    queryFn: financeService.getPaymentModes,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => financeService.createPaymentMode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-modes"] });
      toast({ title: "Success", description: "Payment mode created successfully" });
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
      financeService.updatePaymentMode(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-modes"] });
      toast({ title: "Success", description: "Payment mode updated successfully" });
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
    mutationFn: (id: string) => financeService.deletePaymentMode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-modes"] });
      toast({ title: "Success", description: "Payment mode deleted successfully" });
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
    setCurrentMode(null);
    setFormData({
      name: "",
      description: "",
      active: true,
      show_on_pdf: false,
      selected_by_default: false,
      invoices_only: false,
      expenses_only: false,
    });
    setIsOpen(true);
  };

  const handleEdit = (mode: PaymentMode) => {
    setCurrentMode(mode);
    setFormData({
      name: mode.name,
      description: mode.description || "",
      active: mode.active,
      show_on_pdf: mode.show_on_pdf,
      selected_by_default: mode.selected_by_default,
      invoices_only: mode.invoices_only,
      expenses_only: mode.expenses_only,
    });
    setIsOpen(true);
  };

  const handleDelete = (mode: PaymentMode) => {
    if (window.confirm("Are you sure you want to delete this payment mode?")) {
      deleteMutation.mutate(mode._id);
    }
  };

  const handleSave = () => {
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Payment Mode Name is required",
        variant: "destructive",
      });
      return;
    }

    if (currentMode) {
      updateMutation.mutate({ id: currentMode._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <>
      <DataTablePage
        title="Payment Modes"
        subtitle="Manage the offline payment modes available for invoices and expenses."
        addLabel="Add New Payment Mode"
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        columns={[
          { key: "name", label: "Payment Mode Name" },
          { key: "description", label: "Bank Accounts / Description" },
          { 
            key: "active", 
            label: "Active",
            render: (row: PaymentMode) => (
              <div className="flex items-center">
                <Switch 
                  checked={row.active}
                  onCheckedChange={(checked) => {
                    updateMutation.mutate({ 
                      id: row._id, 
                      data: { ...row, active: checked } 
                    });
                  }}
                  disabled={updateMutation.isPending}
                />
              </div>
            )
          },
        ]}
        data={modes}
        isLoading={isLoading}
        idField="_id"
      >
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-6">
          <p className="text-sm text-blue-800 font-medium">
            Note: Payment modes listed below are offline modes. Payment gateways can be configured in Setup-&gt; Settings-&gt;Payment Gateways
          </p>
        </div>
      </DataTablePage>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-0 shadow-2xl">
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <DialogHeader className="px-6 py-4 border-b bg-gray-50/50">
              <DialogTitle className="text-xl font-bold text-[#1e293b]">
                {currentMode ? "Edit Payment Mode" : "Add New Payment Mode"}
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                  <span className="text-red-500">*</span> Payment Mode Name
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Payment Mode Name"
                  className="h-11 border-slate-200 focus:ring-primary/20 transition-all rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                  Bank Accounts / Description
                </Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Bank Accounts / Description"
                  className="min-h-[100px] border-slate-200 focus:ring-primary/20 transition-all rounded-lg resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                  <Checkbox 
                    id="active" 
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: !!checked })}
                  />
                  <Label htmlFor="active" className="text-xs font-bold text-slate-700 cursor-pointer">Active</Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                  <Checkbox 
                    id="show_on_pdf" 
                    checked={formData.show_on_pdf}
                    onCheckedChange={(checked) => setFormData({ ...formData, show_on_pdf: !!checked })}
                  />
                  <Label htmlFor="show_on_pdf" className="text-xs font-bold text-slate-700 cursor-pointer text-wrap leading-tight">
                    Show Bank Accounts / Description on Invoice PDF
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                  <Checkbox 
                    id="selected_by_default" 
                    checked={formData.selected_by_default}
                    onCheckedChange={(checked) => setFormData({ ...formData, selected_by_default: !!checked })}
                  />
                  <Label htmlFor="selected_by_default" className="text-xs font-bold text-slate-700 cursor-pointer">Selected by default on invoice</Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                  <Checkbox 
                    id="invoices_only" 
                    checked={formData.invoices_only}
                    onCheckedChange={(checked) => setFormData({ ...formData, invoices_only: !!checked })}
                  />
                  <Label htmlFor="invoices_only" className="text-xs font-bold text-slate-700 cursor-pointer">Invoices Only</Label>
                </div>

                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                  <Checkbox 
                    id="expenses_only" 
                    checked={formData.expenses_only}
                    onCheckedChange={(checked) => setFormData({ ...formData, expenses_only: !!checked })}
                  />
                  <Label htmlFor="expenses_only" className="text-xs font-bold text-slate-700 cursor-pointer">Expenses Only</Label>
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-4 bg-gray-50/50 border-t gap-3 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="px-6 h-10 border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold rounded-lg transition-all"
              >
                Close
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-8 h-10 bg-[#1e293b] hover:bg-[#334155] text-white font-bold rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
