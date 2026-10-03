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
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty, TablePagination } from "@/components/ui/table";

export default function SetupEstimateRequestForms() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);

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

  const formPageSize = itemsPerPage === "All" ? (filtered.length || 1) : parseInt(itemsPerPage);
  const totalFormPages = Math.max(1, Math.ceil(filtered.length / formPageSize));
  const safeFormPage = Math.min(currentPage, totalFormPages);
  const pageData = itemsPerPage === "All" ? filtered : filtered.slice((safeFormPage - 1) * formPageSize, safeFormPage * formPageSize);

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
            <Select value={itemsPerPage} onValueChange={(v) => { setItemsPerPage(v); setCurrentPage(1); }}>
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
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                {["ID", "Form Name", "Total Submissions", "Created", "Actions"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : pageData.length === 0 ? (
                <TableEmpty colSpan={5}>No estimate request forms found.</TableEmpty>
              ) : (
                pageData.map((form: any, index: number) => (
                  <TableRow key={form._id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <button
                        className="font-bold text-primary hover:underline cursor-pointer text-left"
                        onClick={() => navigate(`/admin/setup/estimate-request/forms/${form._id}/preview`)}
                      >
                        {form.name}
                      </button>
                    </TableCell>
                    <TableCell><span className="font-bold">{form.totalSubmissions ?? 0}</span></TableCell>
                    <TableCell className="text-muted-foreground">
                      {form.createdAt ? formatDate(form.createdAt) : "-"}
                    </TableCell>
                    <TableCell>
                      <TableActions
                        onView={() => navigate(`/admin/setup/estimate-request/forms/${form._id}/preview`)}
                        onEdit={can("Estimate Request", "Edit") ? () => navigate(`/admin/setup/estimate-request/form-fields/${form._id}`) : undefined}
                        onDelete={can("Estimate Request", "Delete") ? () => deleteMutation.mutate(form._id) : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination page={safeFormPage} pageSize={formPageSize} total={filtered.length} onPageChange={setCurrentPage} />
        </TableContainer>

      </div>
    </DashboardLayout>
  );
}
