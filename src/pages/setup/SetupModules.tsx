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

export default function SetupModules() {
  const { toast } = useToast();
  const { isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState("10");

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

  const pageData = filtered.slice(0, itemsPerPage === "All" ? filtered.length : parseInt(itemsPerPage));
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
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Modules Table */}
        <div className="rounded-3xl border border-border/50 overflow-hidden bg-background shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border/50">
              <tr>
                {["Module", "Description", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-4 font-black uppercase tracking-wider text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={4} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
                ))
              ) : pageData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                    No modules found.
                  </td>
                </tr>
              ) : (
                pageData.map((m: any) => (
                  <tr key={m._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{m.name}</span>
                        {m.core && (
                          <Badge variant="outline" className="text-[9px] font-black uppercase">Core</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground max-w-md">{m.description || "-"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!m.active}
                          disabled={!canManage || toggleMutation.isPending}
                          onCheckedChange={(checked) => toggleMutation.mutate({ slug: m.slug, active: checked, core: !!m.core })}
                        />
                        <span className="text-xs font-bold text-muted-foreground">{m.active ? "Active" : "Disabled"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs font-bold text-muted-foreground italic px-4">
          Showing 1 to {pageData.length} of {filtered.length} entries
        </p>
      </div>
    </DashboardLayout>
  );
}
