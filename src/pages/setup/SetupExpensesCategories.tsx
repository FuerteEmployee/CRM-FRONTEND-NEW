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
import { Textarea } from "@/components/ui/textarea";
import { usePermissions } from "@/hooks/usePermissions";

interface ExpenseCategory {
  _id: string;
  name: string;
  description: string;
}

export default function SetupExpensesCategories() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentCategory, setCurrentCategory] =
    useState<ExpenseCategory | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  const { data: categories = [], isLoading } = useQuery<ExpenseCategory[]>({
    queryKey: ["expense-categories"],
    queryFn: financeService.getExpenseCategories,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => financeService.createExpenseCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      toast({
        title: "Success",
        description: "Expense category created successfully",
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
      financeService.updateExpenseCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      toast({
        title: "Success",
        description: "Expense category updated successfully",
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
    mutationFn: (id: string) => financeService.deleteExpenseCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
      toast({
        title: "Success",
        description: "Expense category deleted successfully",
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
    setCurrentCategory(null);
    setFormData({ name: "", description: "" });
    setIsOpen(true);
  };

  const handleEdit = (category: ExpenseCategory) => {
    setCurrentCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
    });
    setIsOpen(true);
  };

  const handleDelete = (category: ExpenseCategory) => {
    if (
      window.confirm("Are you sure you want to delete this expense category?")
    ) {
      deleteMutation.mutate(category._id);
    }
  };

  const handleSave = () => {
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Category Name is required",
        variant: "destructive",
      });
      return;
    }

    if (currentCategory) {
      updateMutation.mutate({ id: currentCategory._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <>
      <DataTablePage
        title="Expense Categories"
        subtitle="Manage the categories available for categorizing your expenses."
        addLabel="New Category"
        onAdd={can("Expenses", "Create") ? handleAdd : undefined}
        onEdit={can("Expenses", "Edit") ? handleEdit : undefined}
        onDelete={can("Expenses", "Delete") ? handleDelete : undefined}
        columns={[
          { key: "name", label: "Name" },
          { key: "description", label: "Description" },
        ]}
        data={categories}
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
                {currentCategory ? "Edit Category" : "New Category"}
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                  <span className="text-red-500">*</span> Category Name
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Category Name"
                  className="h-11 border-slate-200 focus:ring-primary/20 transition-all rounded-lg"
                  disabled={
                    currentCategory
                      ? !can("Expenses", "Edit")
                      : !can("Expenses", "Create")
                  }
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[13px] font-bold text-slate-700 flex items-center gap-1">
                  Category Description
                </Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Category Description"
                  className="min-h-[100px] border-slate-200 focus:ring-primary/20 transition-all rounded-lg resize-none"
                  disabled={
                    currentCategory
                      ? !can("Expenses", "Edit")
                      : !can("Expenses", "Create")
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
                  (currentCategory
                    ? !can("Expenses", "Edit")
                    : !can("Expenses", "Create"))
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
