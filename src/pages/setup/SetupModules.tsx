import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, UploadCloud, Trash2, Package } from "lucide-react";
import { moduleService } from "@/api/services/module.service";
import { ExportButton } from "@/components/ui/export-button";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty, TablePagination } from "@/components/ui/table";

export default function SetupModules() {
  const { toast } = useToast();
  const { isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: modules = [], isLoading } = useQuery<any[]>({
    queryKey: ["modules"],
    queryFn: () => moduleService.getModules().then((r: any) => r.data || r),
  });

  const installMutation = useMutation({
    mutationFn: (file: File) => moduleService.installModule(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      toast({ title: "Module Installed", description: "The module has been installed successfully.", className: "bg-green-600 text-white font-bold rounded-2xl" });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err: any) => {
      toast({ title: "Install Failed", description: err?.response?.data?.message || err.message || "Failed to install module.", variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ slug, active, core }: { slug: string; active: boolean; core: boolean }) =>
      moduleService.toggleModule(slug, active, core),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      toast({ title: "Updated", description: "Module status updated.", className: "bg-green-600 text-white font-bold rounded-2xl" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to update module.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => moduleService.deleteModule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      toast({ title: "Uninstalled", description: "Module removed successfully.", className: "bg-green-600 text-white font-bold rounded-2xl" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message || "Failed to uninstall module.", variant: "destructive" }),
  });

  const handleInstall = () => {
    if (!selectedFile) {
      toast({ title: "No File Selected", description: "Choose a .zip module file first.", variant: "destructive" });
      return;
    }
    installMutation.mutate(selectedFile);
  };

  const filtered = useMemo(() => {
    return modules.filter((m: any) =>
      (m.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (m.description || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [modules, search]);

  const modulePageSize = itemsPerPage === "All" ? (filtered.length || 1) : parseInt(itemsPerPage);
  const totalModulePages = Math.max(1, Math.ceil(filtered.length / modulePageSize));
  const safeModulePage = Math.min(currentPage, totalModulePages);
  const pageData = itemsPerPage === "All" ? filtered : filtered.slice((safeModulePage - 1) * modulePageSize, safeModulePage * modulePageSize);
  const canManage = isAdmin;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Modules</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Enable, disable, and install feature modules
            </p>
          </div>
        </div>

        {/* Upload Module */}
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-black text-foreground">Upload Module</h3>
              <p className="text-xs text-muted-foreground mt-1">
                If you have a module in a .zip format, you may install it by uploading it here.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-medium border border-dashed border-border rounded-xl px-4 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
                <UploadCloud className="h-4 w-4 text-primary" />
                {selectedFile ? selectedFile.name : "Choose .zip file"}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,application/zip"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </label>
              <Button
                onClick={handleInstall}
                disabled={installMutation.isPending || !selectedFile || !canManage}
                className="rounded-xl font-black uppercase text-xs tracking-widest"
              >
                {installMutation.isPending ? "Installing..." : "Install"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table controls */}
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
              filename="modules"
              columns={[
                { header: "Module", key: "name" },
                { header: "Description", key: (m) => m.description || "-" },
                { header: "Version", key: (m) => m.version || "-" },
                { header: "Status", key: (m) => (m.active ? "Active" : "Disabled") },
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

        {/* Modules Table */}
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                {["Module", "Description", "Status", "Actions"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                ))
              ) : pageData.length === 0 ? (
                <TableEmpty colSpan={4}>No modules found.</TableEmpty>
              ) : (
                pageData.map((m: any) => (
                  <TableRow key={m._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{m.name}</span>
                        {m.core && (
                          <Badge variant="outline" className="text-[9px] font-black uppercase">Core</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-md">{m.description || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!m.active}
                          disabled={!canManage || toggleMutation.isPending}
                          onCheckedChange={(checked) => toggleMutation.mutate({ slug: m.slug, active: checked, core: !!m.core })}
                        />
                        <span className="text-xs font-bold text-muted-foreground">{m.active ? "Active" : "Disabled"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {!m.core && canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                          onClick={() => {
                            if (confirm(`Uninstall "${m.name}"? This cannot be undone.`)) deleteMutation.mutate(m._id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination page={safeModulePage} pageSize={modulePageSize} total={filtered.length} onPageChange={setCurrentPage} />
        </TableContainer>

      </div>
    </DashboardLayout>
  );
}
