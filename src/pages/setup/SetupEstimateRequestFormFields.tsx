import React from "react";
import { DataTablePage } from "@/components/shared/DataTablePage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { salesService } from "@/api/services/sales.service";
import { toast } from "sonner";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";

export default function SetupEstimateRequestFormFields() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Queries
  const { data: forms = [], isLoading } = useQuery<any[]>({
    queryKey: ["estimate-request-forms"],
    queryFn: async () => {
      const response = await salesService.getEstimateRequestForms();
      return Array.isArray(response) ? response : [];
    },
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: (id: string) => salesService.deleteEstimateRequestForm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate-request-forms"] });
      toast.success("Form deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete form");
    },
  });

  const handleAdd = () => {
    navigate("/setup/estimate-request/form-fields/new");
  };

  const handleEdit = (form: any) => {
    navigate(`/setup/estimate-request/form-fields/${form._id}`);
  };

  const handleDelete = (form: any) => {
    if (window.confirm("Are you sure you want to delete this form?")) {
      deleteMutation.mutate(form._id);
    }
  };

  const handleView = (form: any) => {
    window.open(`/forms/quote/${form._id}`, "_blank");
  };

  return (
    <>
      <DataTablePage
        title="Estimate Forms"
        subtitle="Generate an embed code for your website to capture estimate requests."
        addLabel="New Form"
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
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
        columns={[
          {
            key: "name",
            label: "Form Name",
            className: "font-bold text-[#1a2b3c] w-[400px]",
            render: (row) => (
              <button
                onClick={() => handleEdit(row)}
                className="hover:text-blue-600 transition-colors text-left"
              >
                {row.name}
              </button>
            ),
          },
          {
            key: "submissions",
            label: "Total Submissions",
            className: "w-[150px] text-center",
            render: () => "0",
          },
          {
            key: "createdAt",
            label: "Created",
            className: "w-[150px] text-slate-500",
            render: (row) => {
              const date = new Date(row.createdAt);
              const daysDiff = differenceInDays(new Date(), date);
              if (daysDiff < 7) {
                return formatDistanceToNow(date, { addSuffix: true });
              }
              return format(date, "yyyy-MM-dd HH:mm");
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
