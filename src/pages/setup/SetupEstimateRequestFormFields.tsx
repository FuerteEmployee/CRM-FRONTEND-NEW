import React from "react";
import { DataTablePage } from "@/components/shared/DataTablePage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { estimateService } from "@/api/services/estimate.service";
import { toast } from "sonner";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

export default function SetupEstimateRequestFormFields() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = usePermissions();

  // Queries
  const { data: forms = [], isLoading } = useQuery<any[]>({
    queryKey: ["estimate-request-forms"],
    queryFn: async () => {
      const response = await estimateService.getEstimateRequestForms();
      return Array.isArray(response) ? response : [];
    },
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => estimateService.deleteEstimateRequestForm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate-request-forms"] });
      toast.success("Form deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete form");
    },
  });

  const handleAdd = () => {
    navigate("/admin/setup/estimate-request/form-fields/new");
  };

  const handleEdit = (form: any) => {
    navigate(`/admin/setup/estimate-request/form-fields/${form._id}`);
  };

  const handleDelete = (form: any) => {
    if (window.confirm("Are you sure you want to delete this form?")) {
      deleteMutation.mutate(form._id);
    }
  };

  const handleView = (form: any) => {
    window.open(`/forms/quote/${form._id}?styled=1`, "_blank");
  };

  return (
    <>
      <DataTablePage
        title="Estimate Forms"
        subtitle="Generate an embed code for your website to capture estimate requests."
        addLabel="New Form"
        onAdd={can("Estimate Request", "Create") ? handleAdd : undefined}
        renderCustomActions={(item) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
            onClick={() => handleView(item)}
            title="View Form"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        onEdit={can("Estimate Request", "Edit") ? handleEdit : undefined}
        onDelete={can("Estimate Request", "Delete") ? handleDelete : undefined}
        columns={[
          {
            key: "name",
            label: "Form Name",
            className: "font-semibold text-slate-900 w-[400px]",
            render: (row) => (
              <button
                onClick={() =>
                  can("Estimate Request", "Edit") ? handleEdit(row) : undefined
                }
                className={`transition-colors text-left ${can("Estimate Request", "Edit") ? "hover:text-blue-600 font-semibold" : "cursor-default font-semibold text-slate-700"}`}
                disabled={!can("Estimate Request", "Edit")}
              >
                {row.name}
              </button>
            ),
          },
          {
            key: "submissions",
            label: "Submissions",
            className: "w-[150px] text-center",
            render: () => (
              <span className="text-foreground font-medium">0</span>
            ),
          },
          {
            key: "createdAt",
            label: "Created",
            className: "w-[150px] text-muted-foreground",
            render: (row) => {
              const date = new Date(row.createdAt);
              return (
                <span className="text-xs">
                  {formatDistanceToNow(date, { addSuffix: true })}
                </span>
              );
            },
          },
        ]}
        data={forms}
        isLoading={isLoading}
        idField="_id"
      />
    </>
  );
}
