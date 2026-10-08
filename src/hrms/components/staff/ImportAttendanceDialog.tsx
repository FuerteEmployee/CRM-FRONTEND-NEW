import { useRef, useState, type DragEvent } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, Loader2, WifiOff } from "lucide-react";
import { Button } from "@/hrms/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/hrms/components/ui/dialog";
import { toast } from "@/hrms/components/ui/use-toast";
import { cn } from "@/hrms/lib/utils";
import { attendanceService, type AttendanceImportRow, type AttendanceImportResult } from "@/hrms/services/attendanceService";

/* Import offline attendance — for days the punch app/kiosk couldn't be used
 * (Wi-Fi down, power cut…) and attendance was kept on a register instead.
 * Rows are saved as Admin Entries, same as the per-row "Correct" dialog. */

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const HEADER_ALIASES: Record<keyof Omit<AttendanceImportRow, "rowNumber">, string[]> = {
  employee: ["employeecode", "empcode", "code", "employeecodeemail", "employee", "employeename", "name", "staff", "email", "mobile", "mobileno"],
  date: ["date", "attendancedate", "day"],
  punchIn: ["punchin", "in", "intime", "checkin", "timein"],
  punchOut: ["punchout", "out", "outtime", "checkout", "timeout"],
  lunchIn: ["lunchin", "lunchstart", "breakin", "breakstart"],
  lunchOut: ["lunchout", "lunchend", "breakout", "breakend"],
  status: ["status", "daystatus", "attendance"],
  note: ["note", "notes", "remark", "remarks", "reason"],
};

const pad = (n: number) => String(n).padStart(2, "0");

// Excel stores dates as day serials (1 = 1900-01-01, with the 1900 leap-year bug).
function serialToYmd(serial: number) {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Excel serial, "dd/mm/yyyy", "dd-mm-yyyy", "yyyy-mm-dd" → "yyyy-mm-dd" ("" if invalid). */
function parseDate(v: unknown): string {
  if (typeof v === "number" && v > 0) return serialToYmd(v);
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/); // Indian format: day first
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    const ymd = `${y}-${pad(+m[2])}-${pad(+m[1])}`;
    const d = new Date(`${ymd}T00:00:00`);
    return !isNaN(d.getTime()) && d.getDate() === +m[1] ? ymd : "";
  }
  return "";
}

/** Excel time fraction, "9:30", "09:30 AM", "7:30pm", "19:30:00" → "HH:mm" ("" if blank, null if invalid). */
function parseTime(v: unknown): string | null {
  if (v === "" || v == null) return "";
  if (typeof v === "number") {
    const mins = Math.round((v % 1) * 1440);
    return `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`;
  }
  const s = String(v).trim().toLowerCase();
  if (!s || s === "-" || s === "--:--") return "";
  const m = s.match(/^(\d{1,2})[:.](\d{2})(?::\d{2})?\s*(am|pm)?$/);
  if (!m) return null;
  let h = +m[1];
  const min = +m[2];
  if (m[3]) {
    if (h < 1 || h > 12) return null;
    if (m[3] === "pm" && h !== 12) h += 12;
    if (m[3] === "am" && h === 12) h = 0;
  }
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

function parseStatus(v: unknown): AttendanceImportRow["status"] | null {
  const s = norm(v);
  if (!s) return undefined;
  if (["fullday", "full", "present", "p", "fd"].includes(s)) return "Full Day";
  if (["halfday", "half", "hd", "h"].includes(s)) return "Half Day";
  if (["absent", "a", "ab"].includes(s)) return "Absent";
  return null;
}

export function ImportAttendanceDialog({ onImported }: { onImported?: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AttendanceImportResult | null>(null);

  const close = (o: boolean) => {
    if (loading) return;
    setOpen(o);
    if (!o) setResult(null);
  };

  const downloadSample = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Employee Code", "Date", "Punch In", "Lunch In", "Lunch Out", "Punch Out", "Status", "Note"],
      ["EMP001", "08/10/2026", "09:30", "13:30", "14:00", "18:30", "", "Wi-Fi down — register entry"],
      ["ravi@example.com", "08/10/2026", "10:00 AM", "", "", "02:00 PM", "", "Power cut"],
      ["EMP003", "08/10/2026", "", "", "", "", "Full Day", "Kiosk offline"],
      ["EMP004", "08/10/2026", "", "", "", "", "Absent", ""],
    ]);
    ws["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 10 }, { wch: 30 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, "Offline_Attendance_Sample.xlsx");
  };

  const handleFile = (file: File | undefined) => {
    if (!file || loading) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      toast({ title: "Unsupported file", description: "Use .xlsx, .xls, or .csv", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      let rows: AttendanceImportRow[] = [];
      const parseErrors: AttendanceImportResult["results"] = [];
      try {
        // raw: keep CSV text as-is so "08/10/2026" isn't US-parsed as Aug 10.
        const wb = XLSX.read(e.target?.result, { type: "array", raw: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: true, blankrows: false });

        // Header row = first row (within the top 10) that has an employee + date column.
        let headerIdx = -1;
        let cols: Partial<Record<keyof typeof HEADER_ALIASES, number>> = {};
        for (let i = 0; i < Math.min(10, data.length) && headerIdx < 0; i++) {
          const found: typeof cols = {};
          (data[i] || []).forEach((cell, c) => {
            const n = norm(cell);
            (Object.keys(HEADER_ALIASES) as (keyof typeof HEADER_ALIASES)[]).forEach((k) => {
              if (found[k] === undefined && HEADER_ALIASES[k].includes(n)) found[k] = c;
            });
          });
          if (found.employee !== undefined && found.date !== undefined) { headerIdx = i; cols = found; }
        }
        if (headerIdx < 0) {
          toast({ title: "Columns not found", description: "The sheet needs at least an \"Employee Code\" and a \"Date\" column. Download the sample to see the format.", variant: "destructive" });
          return;
        }

        const get = (row: unknown[], k: keyof typeof HEADER_ALIASES) => (cols[k] !== undefined ? row[cols[k]!] : "");
        data.slice(headerIdx + 1).forEach((row, i) => {
          const rowNumber = headerIdx + i + 2;
          const employee = String(get(row, "employee") ?? "").trim();
          if (!employee && !String(get(row, "date") ?? "").trim()) return; // blank line
          const date = parseDate(get(row, "date"));
          const punchIn = parseTime(get(row, "punchIn"));
          const punchOut = parseTime(get(row, "punchOut"));
          const lunchIn = parseTime(get(row, "lunchIn"));
          const lunchOut = parseTime(get(row, "lunchOut"));
          const status = parseStatus(get(row, "status"));
          const fail = (error: string) => parseErrors.push({ row: rowNumber, employee, date: String(get(row, "date") ?? ""), ok: false, error });
          if (!employee) return fail("Employee is blank");
          if (!date) return fail("Invalid date — use DD/MM/YYYY");
          if (punchIn === null) return fail("Invalid Punch In time — use HH:mm or 9:30 AM");
          if (punchOut === null) return fail("Invalid Punch Out time — use HH:mm or 6:30 PM");
          if (lunchIn === null) return fail("Invalid Lunch In time — use HH:mm or 1:30 PM");
          if (lunchOut === null) return fail("Invalid Lunch Out time — use HH:mm or 2:00 PM");
          if (!!lunchIn !== !!lunchOut) return fail("Enter both Lunch In and Lunch Out, or leave both blank");
          if (status === null) return fail("Status must be Full Day, Half Day or Absent");
          if (!punchIn && !punchOut && !status) return fail("Enter Punch In/Out times or a Status");
          rows.push({
            rowNumber, employee, date,
            ...(punchIn && { punchIn }),
            ...(punchOut && { punchOut }),
            ...(lunchIn && { lunchIn }),
            ...(lunchOut && { lunchOut }),
            ...(status && { status }),
            ...(String(get(row, "note") ?? "").trim() && { note: String(get(row, "note")).trim() }),
          });
        });
      } catch {
        toast({ title: "Error", description: "Failed to read the file", variant: "destructive" });
        return;
      }

      if (!rows.length && !parseErrors.length) {
        toast({ title: "Empty file", description: "No attendance rows found.", variant: "destructive" });
        return;
      }

      setLoading(true);
      try {
        const res = rows.length ? await attendanceService.importAttendance(rows) : { total: 0, success: 0, failed: 0, results: [] };
        const results = [...parseErrors, ...res.results].sort((a, b) => a.row - b.row);
        const failed = results.filter((r) => !r.ok).length;
        setResult({ total: results.length, success: res.success, failed, results });
        if (res.success) onImported?.();
      } catch (err: any) {
        toast({ title: "Import failed", description: err?.message || "Server error", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const failedRows = result?.results.filter((r) => !r.ok) ?? [];

  return (
    <>
      <input ref={fileRef} type="file" hidden accept=".xlsx,.xls,.csv" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
      <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs font-semibold bg-white" onClick={() => setOpen(true)}>
        <Upload className="h-3.5 w-3.5 text-indigo-600" /> Import
      </Button>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-w-xl w-full max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Import Attendance</DialogTitle>
          </DialogHeader>

          {result ? (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <div><p className="text-2xl font-bold text-emerald-700">{result.success}</p><p className="text-[11px] font-semibold uppercase text-slate-500">Imported</p></div>
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 flex items-center gap-3">
                  <XCircle className="h-6 w-6 text-rose-600" />
                  <div><p className="text-2xl font-bold text-rose-700">{result.failed}</p><p className="text-[11px] font-semibold uppercase text-slate-500">Failed</p></div>
                </div>
              </div>
              {failedRows.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <p className="text-xs font-bold text-slate-700 mb-2">Rows not imported — fix them in the sheet and import again</p>
                  <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                    {failedRows.map((r, i) => (
                      <div key={i} className="text-[11px] flex items-start gap-1.5">
                        <span className="shrink-0 rounded bg-rose-100 px-1.5 py-0.5 font-bold text-rose-700">Row {r.row}</span>
                        <span className="text-slate-600"><b>{r.employee || "—"}</b>{r.date && ` · ${r.date}`} — <span className="text-rose-600">{r.error}</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setResult(null)}>Import another file</Button>
                <Button className="flex-1" onClick={() => close(false)}>Done</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div
                onClick={() => !loading && fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); if (!loading) setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={onDrop}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group",
                  isDragging ? "border-primary bg-primary/10 scale-[1.01]" : "border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10",
                  loading && "cursor-wait opacity-80"
                )}
              >
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                  {loading ? <Loader2 className="h-7 w-7 text-primary animate-spin" /> : <FileSpreadsheet className="h-7 w-7 text-primary" />}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">
                    {loading ? "Importing attendance..." : isDragging ? "Drop the file to upload" : "Drag & drop your file here, or click to choose"}
                  </p>
                  <p className="text-xs text-slate-500">Supports .xlsx, .xls, and .csv formats</p>
                </div>
                <Button type="button" disabled={loading} className="mt-2 rounded-xl font-bold gap-2 px-6 h-10 text-xs shadow-md">
                  <Upload className="h-4 w-4" /> {loading ? "Importing..." : "Choose File"}
                </Button>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11.5px] text-slate-500 space-y-1.5">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <WifiOff className="h-3.5 w-3.5 text-amber-600" /> Offline attendance
                </p>
                <p>
                  Use this when staff couldn't punch in the app — Wi-Fi down, power cut, kiosk offline — and attendance
                  was kept on a register. Each row is saved as an <b>Admin Entry</b>; hours, Full/Half Day, late and
                  overtime are calculated from the employee's shift just like a normal punch.
                </p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li><b>Employee Code</b> — code, email or mobile (exact name also works if unique)</li>
                  <li><b>Date</b> — DD/MM/YYYY · <b>Punch In / Out</b> — 09:30 or 6:30 PM</li>
                  <li><b>Lunch In / Out</b> — optional; fill both or leave both blank</li>
                  <li>No times? Put <b>Status</b>: Full Day, Half Day or Absent</li>
                  <li>An existing record for that day is overwritten</li>
                </ul>
              </div>

              <Button type="button" variant="outline" size="sm" className="w-full rounded-xl font-bold gap-2 text-xs" onClick={downloadSample}>
                <Download className="h-3.5 w-3.5" /> Download Sample File
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
