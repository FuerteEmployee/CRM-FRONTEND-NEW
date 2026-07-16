import { useEffect, useState } from "react";
import { Button } from "@/hrms/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/hrms/components/ui/dialog";
import { toast } from "@/hrms/components/ui/use-toast";
import {
  Trash2, Star, Pencil, Loader2, LayoutTemplate, PlusCircle,
  Palette, Upload,
} from "lucide-react";
import {
  salaryTemplateService, SalaryTemplate, CanvasElement,
} from "@/hrms/services/salaryTemplateService";
import SalaryTemplateCanvasEditor from "./SalaryTemplateCanvasEditor";

// ─── Image-to-Template Helpers ────────────────────────────────────────────────

async function extractDominantColor(src: string): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 300 / img.naturalWidth);
        canvas.width = Math.max(1, Math.floor(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.floor(img.naturalHeight * scale * 0.25));
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve("#4F46E5"); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const buckets: Record<string, number> = {};
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue;
          if (r > 225 && g > 225 && b > 225) continue;
          if (r < 25 && g < 25 && b < 25) continue;
          const qr = Math.round(r / 16) * 16;
          const qg = Math.round(g / 16) * 16;
          const qb = Math.round(b / 16) * 16;
          const key = `${qr},${qg},${qb}`;
          buckets[key] = (buckets[key] || 0) + 1;
        }
        let best = "79,70,229";
        let max = 0;
        for (const [k, v] of Object.entries(buckets)) {
          if (v > max) { max = v; best = k; }
        }
        const [r, g, b] = best.split(",").map(Number);
        const h = (n: number) => n.toString(16).padStart(2, "0");
        resolve(`#${h(r)}${h(g)}${h(b)}`);
      } catch { resolve("#4F46E5"); }
    };
    img.onerror = () => resolve("#4F46E5");
    img.src = src;
  });
}

async function buildElementsFromImage(src: string): Promise<CanvasElement[]> {
  const headerColor = await extractDominantColor(src);
  const uid = () => `imp_${Math.random().toString(36).slice(2, 10)}`;
  const M = 32;
  const CW = 794;
  const W = CW - M * 2;           // 730
  const HW = Math.floor((W - 20) / 2); // ~355

  const el = (
    partial: Omit<CanvasElement, "elId" | "zIndex" | "locked"> & { z: number }
  ): CanvasElement => {
    const { z, ...rest } = partial;
    return { elId: uid(), zIndex: z, locked: false, ...rest };
  };

  return [
    el({
      z: 1, type: "companyHeader", x: 0, y: 0, width: CW, height: 108,
      extraData: { companyName: "Company Name", companyAddress: "Address · Phone · Email" },
      style: {
        backgroundColor: headerColor, color: "#ffffff", fontSize: 18, fontWeight: "bold",
        paddingTop: 20, paddingLeft: 36, paddingRight: 36, paddingBottom: 20
      },
    }),
    el({
      z: 2, type: "divider", x: M, y: 116, width: W, height: 2,
      style: { backgroundColor: "#e2e8f0" },
    }),
    el({
      z: 3, type: "infoGrid", x: M, y: 128, width: W, height: 132,
      extraData: {},
      style: {
        backgroundColor: "#f8fafc", borderColor: "#e2e8f0", borderWidth: 1,
        borderRadius: 10, paddingTop: 14, paddingLeft: 16, paddingRight: 16, paddingBottom: 14
      },
    }),
    el({
      z: 4, type: "divider", x: M, y: 270, width: W, height: 2,
      style: { backgroundColor: "#e2e8f0" },
    }),
    el({
      z: 5, type: "earningsTable", x: M, y: 282, width: HW, height: 200,
      extraData: {},
      style: {
        backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderWidth: 1,
        borderRadius: 8, paddingTop: 10, paddingLeft: 10, paddingRight: 10, paddingBottom: 10
      },
    }),
    el({
      z: 6, type: "deductionsTable", x: M + HW + 20, y: 282, width: HW, height: 200,
      extraData: {},
      style: {
        backgroundColor: "#fff8f8", borderColor: "#fecaca", borderWidth: 1,
        borderRadius: 8, paddingTop: 10, paddingLeft: 10, paddingRight: 10, paddingBottom: 10
      },
    }),
    el({
      z: 7, type: "divider", x: M, y: 494, width: W, height: 2,
      style: { backgroundColor: "#e2e8f0" },
    }),
    el({
      z: 8, type: "netPayBar", x: M, y: 506, width: W, height: 72,
      extraData: { subtitle: "Gross {{grossSalary}} − Deductions {{totalDeductions}}" },
      style: {
        backgroundColor: `${headerColor}18`, borderColor: headerColor, borderWidth: 1.5,
        borderRadius: 12, paddingTop: 16, paddingLeft: 20, paddingRight: 20, paddingBottom: 16,
        color: headerColor
      },
    }),
    el({
      z: 9, type: "divider", x: M, y: 590, width: W, height: 2,
      style: { backgroundColor: "#e2e8f0" },
    }),
    el({
      z: 10, type: "attendanceGrid", x: M, y: 602, width: W, height: 100,
      extraData: {},
      style: {
        backgroundColor: "#f8fafc", borderRadius: 8,
        paddingTop: 12, paddingLeft: 12, paddingRight: 12, paddingBottom: 12
      },
    }),
    el({
      z: 11, type: "divider", x: M, y: 712, width: W, height: 2,
      style: { backgroundColor: "#e2e8f0" },
    }),
    el({
      z: 12, type: "bankGrid", x: M, y: 724, width: W, height: 96,
      extraData: {},
      style: {
        backgroundColor: "#f8fafc", borderRadius: 8,
        paddingTop: 12, paddingLeft: 12, paddingRight: 12, paddingBottom: 12
      },
    }),
    el({
      z: 13, type: "signatureLine", x: M, y: 840, width: W, height: 60,
      style: { borderColor: "#cbd5e1" },
    }),
    el({
      z: 14, type: "text", x: M, y: 916, width: W, height: 22,
      content: "This is a computer generated salary slip and does not require a signature.",
      style: { fontSize: 9, color: "#94a3b8", textAlign: "center" },
    }),
  ];
}

// ─── Element type emoji map ───────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  companyHeader: "Header", infoGrid: "Emp. Info", earningsTable: "Earnings",
  deductionsTable: "Deductions", netPayBar: "Net Pay", attendanceGrid: "Attendance",
  leaveTable: "Leave", bankGrid: "Bank", text: "Text", heading: "Heading",
  dynamicField: "Field", image: "Image", rect: "Shape", divider: "Divider",
  circle: "Circle", badge: "Badge", star: "Star", signatureLine: "Signature",
  watermark: "Watermark", qrPlaceholder: "QR Code",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SalaryTemplateBuilder() {
  const [templates, setTemplates] = useState<SalaryTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<SalaryTemplate | null>(null);
  const [canvasTarget, setCanvasTarget] = useState<SalaryTemplate | null>(null);
  const [showCanvas, setShowCanvas] = useState(false);
  const [importedElements, setImportedElements] = useState<CanvasElement[]>([]);
  const [importedCanvasBg, setImportedCanvasBg] = useState<string | undefined>(undefined);
  const [isImporting, setIsImporting] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await salaryTemplateService.getAll();
      setTemplates(data);
    } catch {
      toast({ title: "Failed to load templates", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const clearImport = () => { setImportedElements([]); setImportedCanvasBg(undefined); };
  const openNew = () => { setCanvasTarget(null); clearImport(); setShowCanvas(true); };
  const openEdit = (t: SalaryTemplate) => { setCanvasTarget(t); clearImport(); setShowCanvas(true); };

  const handleImportImage = async (file: File) => {
    setIsImporting(true);
    let src = "";
    try {
      src = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      // Try AI analysis first
      try {
        const result = await salaryTemplateService.analyzeSlipImage(src);
        setImportedElements(result.elements);
        setImportedCanvasBg(result.canvasBg);
      } catch (aiErr: any) {
        // Fall back to local color-based generation
        toast({
          title: "AI unavailable — using smart layout",
          description: aiErr?.response?.data?.message || "Add GEMINI_API_KEY to backend .env for AI-powered import",
        });
        const elements = await buildElementsFromImage(src);
        setImportedElements(elements);
        setImportedCanvasBg(undefined);
      }

      setCanvasTarget(null);
      setShowCanvas(true);
    } catch {
      toast({ title: "Failed to read image", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaved = (saved: SalaryTemplate) => {
    setTemplates(prev =>
      canvasTarget ? prev.map(t => (t._id === saved._id ? saved : t)) : [saved, ...prev]
    );
    setShowCanvas(false);
  };

  const handleSetDefault = async (t: SalaryTemplate) => {
    try {
      const updated = await salaryTemplateService.update(t._id, { isDefault: true });
      setTemplates(prev =>
        prev.map(tmpl => tmpl._id === t._id ? updated : { ...tmpl, isDefault: false })
      );
      toast({ title: `"${t.name}" set as default template` });
    } catch (err: any) {
      toast({ title: err.message || "Failed to set default", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await salaryTemplateService.remove(deleteTarget._id);
      setTemplates(prev => prev.filter(t => t._id !== deleteTarget._id));
      toast({ title: "Template deleted" });
    } catch (err: any) {
      toast({ title: err.message || "Delete failed", variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  if (showCanvas) {
    return (
      <SalaryTemplateCanvasEditor
        template={canvasTarget}
        initialElements={importedElements.length ? importedElements : undefined}
        initialCanvasBg={importedCanvasBg}
        onBack={() => { setShowCanvas(false); clearImport(); }}
        onSaved={saved => { clearImport(); handleSaved(saved); }}
      />
    );
  }

  const canvasCount = templates.filter(t => t.elements?.length).length;
  const defaultTemplate = templates.find(t => t.isDefault);

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl gradient-primary p-5 text-white shadow-md">
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute bottom-0 right-20 h-20 w-20 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <LayoutTemplate className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Salary Slip Templates</h1>
              <p className="text-xs text-white/70">Drag-and-drop canvas designer · {templates.length} template{templates.length !== 1 ? "s" : ""}{canvasCount > 0 ? ` · ${canvasCount} canvas` : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <label className={isImporting ? "cursor-not-allowed opacity-60" : "cursor-pointer"}>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                disabled={isImporting}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleImportImage(file);
                  e.target.value = "";
                }}
              />
              <div className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white font-semibold rounded-lg px-3 h-9 text-sm transition-all cursor-pointer">
                {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {isImporting ? "Analyzing…" : "AI Import"}
              </div>
            </label>
            <Button
              onClick={openNew}
              className="bg-white text-primary hover:bg-white/90 font-bold shadow rounded-lg px-4 h-9 text-sm"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              New Template
            </Button>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 w-8">#</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3">Template Name</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 hidden md:table-cell">Sections</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-4 py-3 hidden sm:table-cell">Status</th>
              <th className="text-right text-xs font-semibold text-slate-500 px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-14 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading templates…</span>
                  </div>
                </td>
              </tr>
            ) : templates.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-14 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
                      <LayoutTemplate className="h-5 w-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-600">No templates yet</p>
                      <p className="text-xs text-slate-400 mt-0.5">Create your first salary slip template or import an existing one</p>
                    </div>
                    <Button className="gradient-primary text-white rounded-lg font-semibold px-5 h-8 text-xs shadow mt-1" onClick={openNew}>
                      <PlusCircle className="h-3 w-3 mr-1.5" /> Create Template
                    </Button>
                  </div>
                </td>
              </tr>
            ) : null}
            {templates.map((t, idx) => {
              const elementTypes = [...new Set((t.elements || []).map(e => e.type))];
              const headerColor =
                t.elements?.find(e => e.type === "companyHeader")?.style.backgroundColor ||
                t.headerColor || "#4F46E5";
              const isCanvas = !!(t.elements?.length);

              return (
                <tr key={t._id} className="hover:bg-slate-50 transition-colors">
                  {/* # */}
                  <td className="px-4 py-3 text-xs text-slate-400 font-medium">{idx + 1}</td>

                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-7 w-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm"
                        style={{ background: headerColor }}
                      >
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate text-sm leading-tight">{t.name}</p>
                        {t.companyName && (
                          <p className="text-xs text-slate-400 truncate">{t.companyName}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Sections */}
                  <td className="px-4 py-3 hidden md:table-cell">
                    {elementTypes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {elementTypes.slice(0, 5).map(type => (
                          <span key={type} className="text-[10px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                            {TYPE_LABELS[type] || type}
                          </span>
                        ))}
                        {elementTypes.length > 5 && (
                          <span className="text-[10px] font-medium bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">
                            +{elementTypes.length - 5}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      {t.isDefault && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" /> Default
                        </span>
                      )}
                      {isCanvas && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-primary/5 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                          <Palette className="h-2.5 w-2.5" /> Canvas
                        </span>
                      )}
                      {!t.isDefault && !isCanvas && (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        className="gradient-primary text-white h-7 px-3 rounded-lg text-xs font-semibold shadow-none"
                        onClick={() => openEdit(t)}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      {!t.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 rounded-lg text-xs font-medium border-slate-200 text-slate-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200"
                          onClick={() => handleSetDefault(t)}
                          title="Set as default"
                        >
                          <Star className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                        onClick={() => setDeleteTarget(t)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Delete Confirmation ── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-sm rounded-2xl p-6 border-0 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4 border border-red-100">
              <Trash2 className="h-7 w-7 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Delete Template?</h3>
            <p className="text-xs text-slate-400 px-2 mb-1 leading-relaxed">
              <strong className="text-slate-700">"{deleteTarget?.name}"</strong> will be permanently
              deleted and all its canvas elements will be lost.
            </p>
            <p className="text-xs text-red-400 font-medium mb-5">This action cannot be undone.</p>
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                className="flex-1 rounded-xl text-slate-600 text-sm h-10 border-slate-200 font-medium"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm h-10 border-0 font-semibold shadow-md"
                onClick={handleDelete}
              >
                Delete Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
