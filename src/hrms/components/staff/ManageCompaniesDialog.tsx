import { useState } from "react";
import { Button } from "@/hrms/components/ui/button";
import { Input } from "@/hrms/components/ui/input";
import { Badge } from "@/hrms/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/hrms/components/ui/dialog";
import { Plus, Pencil, Trash2, Check, X, Building2 } from "lucide-react";
import { managingCompanyService, type ManagingCompany } from "@/hrms/services/managingCompanyService";
import { toast } from "@/hrms/hooks/use-toast";
import { useConfirm } from "@/hrms/contexts/ConfirmContext";

interface ManageCompaniesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: ManagingCompany[];
  /** Called after any create/rename/delete so the parent can refresh its list */
  onChanged: () => void;
}

export function ManageCompaniesDialog({
  open,
  onOpenChange,
  companies,
  onChanged,
}: ManageCompaniesDialogProps) {
  const confirm = useConfirm();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await managingCompanyService.create({ name, active: true });
      setNewName("");
      onChanged();
      toast({ title: "Added", description: `"${name}" created` });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to add company", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    setBusy(true);
    try {
      await managingCompanyService.update(id, { name });
      setEditingId(null);
      onChanged();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to rename", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (c: ManagingCompany) => {
    const ok = await confirm({
      title: `Delete "${c.name}"?`,
      description:
        "Only possible while no employee or settlement record references it — the server will refuse otherwise.",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await managingCompanyService.remove(c._id || c.id || "");
      onChanged();
      toast({ title: "Deleted", description: `"${c.name}" removed` });
    } catch (e: any) {
      toast({ title: "Cannot delete", description: e?.message || "Failed to delete", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-primary" /> Managing Companies
          </DialogTitle>
          <DialogDescription>
            Add, rename or delete the external companies (LG, Samsung, …)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          {/* Add row */}
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New company name"
              className="h-9 rounded-lg text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              className="h-9 gap-1 rounded-lg shrink-0"
              onClick={handleAdd}
              disabled={busy || !newName.trim()}
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
          {/* Company list */}
          <div className="divide-y rounded-xl border border-slate-200 max-h-64 overflow-y-auto">
            {companies.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground text-center">
                No companies yet — add one above.
              </p>
            ) : (
              companies.map((c) => {
                const id = c._id || c.id || "";
                return (
                  <div key={id} className="flex items-center gap-2 px-3 py-2">
                    {editingId === id ? (
                      <>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-7 text-sm rounded-md flex-1"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleRename(id);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-emerald-600"
                          onClick={() => handleRename(id)}
                          disabled={busy || !editName.trim()}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-slate-400"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm font-medium truncate">{c.name}</span>
                        {!c.active && (
                          <Badge variant="secondary" className="text-[9px]">Inactive</Badge>
                        )}
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-slate-500"
                          onClick={() => {
                            setEditingId(id);
                            setEditName(c.name);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-rose-500 hover:bg-rose-50"
                          onClick={() => handleDelete(c)}
                          disabled={busy}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
