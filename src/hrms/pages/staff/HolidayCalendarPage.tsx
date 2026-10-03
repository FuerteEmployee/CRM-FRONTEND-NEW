import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/hrms/components/ui/card";
import { Badge } from "@/hrms/components/ui/badge";
import { Button } from "@/hrms/components/ui/button";
import { Input } from "@/hrms/components/ui/input";
import { Label } from "@/hrms/components/ui/label";
import { Textarea } from "@/hrms/components/ui/textarea";
import { Checkbox } from "@/hrms/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/hrms/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/hrms/components/ui/select";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { DataTable } from "@/hrms/components/common/DataTable";
import { useConfirm } from "@/hrms/contexts/ConfirmContext";
import { toast } from "@/hrms/components/ui/use-toast";
import { holidayService, type Holiday, type HolidayInput } from "@/hrms/services/holidayService";
import { hrmsbranchService, type HRMSBranch } from "@/hrms/services/hrmsbranchService";
import { usePermission } from "@/hrms/hooks/usePermission";

const TYPE_OPTIONS: Holiday["type"][] = ["Festival", "National", "Regional", "Company"];

// Full literal class strings — Tailwind can't see dynamically-built names.
const TYPE_BADGE: Record<string, string> = {
  Festival: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  National: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  Regional: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  Company: "bg-amber-100 text-amber-700 hover:bg-amber-100",
};

const emptyForm: HolidayInput = {
  name: "",
  date: "",
  endDate: "",
  type: "Festival",
  branchIds: [],
  description: "",
};

/** Inclusive day count of a holiday range; 1 for single-day. */
const rangeDays = (h: { date: string; endDate?: string }) => {
  if (!h.endDate || h.endDate <= h.date) return 1;
  const ms = new Date(`${h.endDate}T00:00:00`).getTime() - new Date(`${h.date}T00:00:00`).getTime();
  return Math.round(ms / 86400000) + 1;
};

const HolidayCalendarPage = () => {
  const confirm = useConfirm();
  // View is open to everyone (employees need it on their attendance page);
  // only admins can create/edit/delete, matching the backend's requireAdmin gate.
  const { isAdmin } = usePermission();

  const [year, setYear] = useState(new Date().getFullYear());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [branches, setBranches] = useState<HRMSBranch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HolidayInput>(emptyForm);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [holidayList, branchesRes] = await Promise.all([
        holidayService.getAll({ year }),
        hrmsbranchService.getAll({ status: "Active" }),
      ]);
      setHolidays(holidayList);
      if (branchesRes.success) setBranches(branchesRes.data);
    } catch {
      toast({ title: "Failed to load holidays", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm, date: `${year}-01-01` });
    setDialogOpen(true);
  };

  const openEdit = (h: Holiday) => {
    setEditingId(h._id);
    setForm({
      name: h.name,
      date: h.date,
      endDate: h.endDate && h.endDate > h.date ? h.endDate : "",
      type: h.type,
      branchIds: (h.branchIds || []).map((b) => (typeof b === "string" ? b : b._id)),
      description: h.description || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.date) {
      toast({ title: "Name and date are required", variant: "destructive" });
      return;
    }
    if (form.endDate && form.endDate < form.date) {
      toast({ title: "End date cannot be before the start date", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      if (editingId) {
        await holidayService.update(editingId, form);
        toast({ title: "Holiday updated" });
      } else {
        await holidayService.create(form);
        toast({ title: "Holiday added" });
      }
      setDialogOpen(false);
      load();
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (h: Holiday) => {
    const ok = await confirm({
      title: "Delete Holiday",
      description: `"${h.name}" (${h.date}) will be removed. Payroll generated afterwards will no longer count it as a paid day.`,
      variant: "danger",
    });
    if (!ok) return;
    try {
      await holidayService.remove(h._id);
      setHolidays((prev) => prev.filter((x) => x._id !== h._id));
      toast({ title: "Holiday deleted" });
    } catch (error: any) {
      toast({ title: "Delete failed", description: error?.message, variant: "destructive" });
    }
  };

  const toggleBranch = (branchId: string) => {
    setForm((f) => ({
      ...f,
      branchIds: f.branchIds.includes(branchId)
        ? f.branchIds.filter((id) => id !== branchId)
        : [...f.branchIds, branchId],
    }));
  };

  const fmtDate = (d: string) => {
    try {
      return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const weekday = (d: string) => {
    try {
      return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });
    } catch {
      return "";
    }
  };

  const todayStr = new Date().toLocaleDateString("en-CA");

  return (
    <div className="min-h-screen bg-slate-50/50 space-y-4 p-4">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Holiday Calendar</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Declare festival &amp; public holidays — paid days off, no punch-in required
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Year selector */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-600"
              onClick={() => setYear((y) => y - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-bold text-slate-700 px-3 uppercase tracking-wider min-w-[60px] text-center">
              {year}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-slate-100 text-slate-600"
              onClick={() => setYear((y) => y + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {isAdmin && (
            <Button
              className="gradient-primary text-white rounded-xl flex items-center gap-2 font-medium"
              onClick={openAdd}
            >
              <Plus className="h-4 w-4" />
              Add Holiday
            </Button>
          )}
        </div>
      </div>

      <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden [&>.space-y-4>div]:rounded-none [&>.space-y-4>div]:border-0 [&>.space-y-4>div]:shadow-none">
        <CardHeader className="py-4 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-700 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Holidays in {year}
            <span className="text-xs font-medium text-slate-400">({holidays.length})</span>
          </CardTitle>
        </CardHeader>
        <DataTable
          data={holidays}
          isLoading={isLoading}
          emptyMessage={`No holidays declared for ${year} yet`}
          columns={[
            {
              header: "Date",
              accessorKey: (row: Holiday) => {
                const days = rangeDays(row);
                return (
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      {days > 1 ? `${fmtDate(row.date)} – ${fmtDate(row.endDate!)}` : fmtDate(row.date)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {days > 1
                        ? `${weekday(row.date)} – ${weekday(row.endDate!)} • ${days} days`
                        : weekday(row.date)}
                    </p>
                  </div>
                );
              },
            },
            {
              header: "Holiday",
              accessorKey: (row: Holiday) => (
                <div className="flex items-center gap-2">
                  <PartyPopper
                    className={`h-4 w-4 shrink-0 ${
                      row.date >= todayStr ? "text-primary" : "text-slate-300"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{row.name}</p>
                    {row.description && (
                      <p className="text-[10px] text-slate-400 max-w-[260px] truncate">
                        {row.description}
                      </p>
                    )}
                  </div>
                </div>
              ),
            },
            {
              header: "Type",
              accessorKey: (row: Holiday) => (
                <Badge
                  className={`text-[10px] font-semibold border-0 pointer-events-none ${
                    TYPE_BADGE[row.type] || TYPE_BADGE.Festival
                  }`}
                >
                  {row.type}
                </Badge>
              ),
            },
            {
              header: "Applies To",
              accessorKey: (row: Holiday) => {
                const names = (row.branchIds || [])
                  .map((b) => (typeof b === "string" ? null : b.name))
                  .filter(Boolean);
                return (
                  <span className="text-xs font-medium text-slate-600">
                    {names.length === 0 ? "All branches" : names.join(", ")}
                  </span>
                );
              },
            },
            ...(isAdmin
              ? [
                  {
                    header: "",
                    id: "actions",
                    accessorKey: (row: Holiday) => (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-primary hover:bg-primary/10"
                          title="Edit Holiday"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50"
                          title="Delete Holiday"
                          onClick={() => handleDelete(row)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <PartyPopper className="h-5 w-5 text-primary" />
              {editingId ? "Edit Holiday" : "Add Holiday"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="holiday-name" className="text-xs font-semibold text-slate-600">
                Holiday Name *
              </Label>
              <Input
                id="holiday-name"
                placeholder="e.g. Diwali, Independence Day"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="holiday-date" className="text-xs font-semibold text-slate-600">
                  Start Date *
                </Label>
                <Input
                  id="holiday-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="holiday-end-date" className="text-xs font-semibold text-slate-600">
                  End Date
                </Label>
                <Input
                  id="holiday-end-date"
                  type="date"
                  min={form.date || undefined}
                  value={form.endDate || ""}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
                <p className="text-[10px] text-slate-400">
                  Leave empty for a single day. Set it for multi-day festivals (e.g. 3-day Diwali).
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as Holiday["type"] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Applies To</Label>
              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.branchIds.length === 0}
                    onCheckedChange={() => setForm((f) => ({ ...f, branchIds: [] }))}
                  />
                  <span className="text-xs font-semibold text-slate-700">
                    All branches (company-wide)
                  </span>
                </label>
                {branches.length > 0 && (
                  <div className="pt-1 border-t border-slate-100 space-y-1.5 max-h-36 overflow-y-auto">
                    {branches.map((b) => {
                      const id = (b.id || b._id)!;
                      return (
                        <label key={id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={form.branchIds.includes(id)}
                            onCheckedChange={() => toggleBranch(id)}
                          />
                          <span className="text-xs font-medium text-slate-600">{b.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                Leave all unchecked to apply the holiday to every branch.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="holiday-desc" className="text-xs font-semibold text-slate-600">
                Description (optional)
              </Label>
              <Textarea
                id="holiday-desc"
                rows={2}
                placeholder="Notes shown to staff"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              className="gradient-primary text-white rounded-xl flex items-center gap-2"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving && <RefreshCw className="h-4 w-4 animate-spin" />}
              {editingId ? "Save Changes" : "Add Holiday"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HolidayCalendarPage;
