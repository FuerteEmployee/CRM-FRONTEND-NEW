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
import { Loader2 } from "lucide-react";

interface Tax {
  _id: string;
  name: string;
  taxrate: number;
}

export default function SetupTaxRates() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTax, setCurrentTax] = useState<Tax | null>(null);
  const [formData, setFormData] = useState({ name: "", taxrate: 0 });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: taxes = [], isLoading } = useQuery<Tax[]>({
    queryKey: ["taxes"],
    queryFn: financeService.getTaxes,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => financeService.createTax(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxes"] });
      toast({ title: "Success", description: "Tax rate created successfully" });
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
      financeService.updateTax(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxes"] });
      toast({ title: "Success", description: "Tax rate updated successfully" });
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
    mutationFn: (id: string) => financeService.deleteTax(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["taxes"] });
      toast({ title: "Success", description: "Tax rate deleted successfully" });
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
    setCurrentTax(null);
    setFormData({ name: "", taxrate: 0 });
    setIsOpen(true);
  };

  const handleEdit = (tax: Tax) => {
    setCurrentTax(tax);
    setFormData({ name: tax.name, taxrate: tax.taxrate });
    setIsOpen(true);
  };

  const handleDelete = (tax: Tax) => {
    if (window.confirm("Are you sure you want to delete this tax rate?")) {
      deleteMutation.mutate(tax._id);
    }
  };

  const handleSave = () => {
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Tax Name is required",
        variant: "destructive",
      });
      return;
    }

    if (currentTax) {
      updateMutation.mutate({ id: currentTax._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <>
      <DataTablePage
        title="Tax Rates"
        subtitle="Manage the tax rates available for invoices and expenses."
        addLabel="Add New Tax"
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        columns={[
          { key: "name", label: "Tax Name" },
          { key: "taxrate", label: "Rate (percent)" },
        ]}
        data={taxes}
        isLoading={isLoading}
        idField="_id"
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 shadow-2xl">
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <DialogHeader className="px-6 py-4 border-b bg-gray-50/50">
              <DialogTitle className="text-xl font-bold text-[#1e293b]">
                {currentTax ? "Edit Tax" : "Add New Tax"}
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                  <span className="text-red-500">*</span> Tax Name
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter tax name..."
                  className="h-11 border-slate-200 focus:ring-primary/20 transition-all rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                  Tax Rate (percent)
                </Label>
                <Input
                  type="number"
                  value={formData.taxrate}
                  onChange={(e) => setFormData({ ...formData, taxrate: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="h-11 border-slate-200 focus:ring-primary/20 transition-all rounded-lg"
                />
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
