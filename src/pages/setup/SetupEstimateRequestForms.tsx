import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, FileText } from "lucide-react";
import { estimateService } from "@/api/services/estimate.service";
import { TableActions } from "@/components/TableActions";
import { ExportButton } from "@/components/ui/export-button";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/dateFormat";
import { usePermissions } from "@/hooks/usePermissions";

export default function SetupEstimateRequestForms() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("10");

  const { data: forms = [], isLoading } = useQuery<any[]>({
    queryKey: ["estimate-request-forms"],
    queryFn: () => estimateService.getEstimateRequestForms().then((res: any) => res.data || res),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => estimateService.deleteEstimateRequestForm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estimate-request-forms"] });
      toast({ title: "Deleted", description: "Form deleted successfully.", className: "bg-green-600 text-white font-bold rounded-2xl" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to delete form.", variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    return forms.filter((f: any) => (f.name || "").toLowerCase().includes(search.toLowerCase()));
  }, [forms, search]);

  const pageData = filtered.slice(0, itemsPerPage === "All" ? filtered.length : parseInt(itemsPerPage));

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Estimate Request Forms</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Build and manage customer-facing estimate request forms
              </p>
            </div>
          </div>
          {can("Estimate Request", "Create") && (
            <Button
              className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest"
              onClick={() => navigate("/admin/setup/estimate-request/form-fields/new")}
            >
              <Plus className="h-4 w-4" />
              New Form
            </Button>
          )}
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-muted/10 p-4 rounded-2xl border border-border/50">
          <div className="flex items-center gap-3">
            <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
              <SelectTrigger className="h-9 w-[80px] bg-background border-none shadow-sm rounded-lg text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["10", "25", "50", "100", "All"].map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ExportButton
              data={filtered}
              filename="estimate_request_forms"
              columns={[
                { header: "ID", key: (f) => f._id },
                { header: "Form Name", key: "name" },
                { header: "Total Submissions", key: (f) => f.totalSubmissions ?? 0 },
                { header: "Created", key: (f) => f.createdAt ? formatDate(f.createdAt) : "-" },
              ]}
            />
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9 h-9 bg-background border-none shadow-sm rounded-lg text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
              <tr>
                {["ID", "Form Name", "Total Submissions", "Created", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="p-4"><Skeleton className="h-10 w-full" /></td>
                  </tr>
                ))
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                    No estimate request forms found.
                  </td>
                </tr>
              ) : (
                pageData.map((form: any, index: number) => (
                  <tr key={form._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{index + 1}</td>
                    <td className="px-6 py-4">
                      <button
                        className="font-bold text-primary hover:underline cursor-pointer text-left"
                        onClick={() => navigate(`/admin/setup/estimate-request/forms/${form._id}/preview`)}
                      >
                        {form.name}
                      </button>
                    </td>
                    <td className="px-6 py-4 font-bold text-foreground">{form.totalSubmissions ?? 0}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {form.createdAt ? formatDate(form.createdAt) : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <TableActions
                        onView={() => navigate(`/admin/setup/estimate-request/forms/${form._id}/preview`)}
                        onEdit={can("Estimate Request", "Edit") ? () => navigate(`/admin/setup/estimate-request/form-fields/${form._id}`) : undefined}
                        onDelete={can("Estimate Request", "Delete") ? () => deleteMutation.mutate(form._id) : undefined}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-4">
          <p className="text-xs font-bold text-muted-foreground italic">
            Showing 1 to {pageData.length} of {filtered.length} entries
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
