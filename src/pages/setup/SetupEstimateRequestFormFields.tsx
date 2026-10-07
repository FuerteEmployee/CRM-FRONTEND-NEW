import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { estimateService } from "@/api/services/estimate.service";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  ExternalLink,
  ClipboardList,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from "@/components/ui/table";

export default function SetupEstimateRequestFormFields() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ["estimate-request-forms"],
    queryFn: () => estimateService.getEstimateRequestForms(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => estimateService.deleteEstimateRequestForm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate-request-forms"] });
      toast.success("Form deleted successfully");
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this form?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Estimate Request Forms</h1>
            <p className="text-slate-500">Manage your public estimate request forms</p>
          </div>
          <Button onClick={() => navigate("new")} className="gap-2">
            <Plus className="h-4 w-4" />
            New Form
          </Button>
        </div>

        <TableContainer>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : forms.length === 0 ? (
                  <TableEmpty colSpan={3}>No forms found. Create your first form to get started.</TableEmpty>
                ) : (
                  forms.map((form: any) => (
                    <TableRow key={form._id}>
                      <TableCell><span className="font-medium">{form.name}</span></TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          {form.status?.name || "Active"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => navigate(form._id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(form._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
        </TableContainer>
      </div>
    </DashboardLayout>
  );
}
