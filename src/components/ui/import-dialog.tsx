import { useMemo, useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, Download, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { toast } from "sonner";

export interface ImportColumn {
  /** Header in the sample file, and the key the mapped value is put under on each row passed to onData. */
  key: string;
  sample: string | number;
  required?: boolean;
  core?: boolean;
  /** Other header names this column is auto-matched from in the mapping step ("Mobile", "No." → Phone). */
  aliases?: string[];
  /** Shown in the mapping step instead of the key. */
  label?: string;
}

interface ImportDialogProps {
  title: string;
  columns: ImportColumn[];
  onData: (rows: Record<string, any>[]) => void;
  loading?: boolean;
  triggerLabel?: string;
  mappingNote?: string;
  templateFilename?: string;
  sheetName?: string;
  /** Skip the column-mapping step and hand the rows over as soon as the file is read. */
  skipMapping?: boolean;
}

const SKIP = "__skip__";
// "Mobile No." → "mobileno", "E-mail" → "email"
const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9#]/g, "");

// Same two passes as the HRMS Staff Directory import: exact (key or alias)
// first for every column, then loose "contains" matches only for columns
// still unmapped, never reusing a sheet column.
const autoMap = (columns: ImportColumn[], headers: string[]) => {
  const mapping: Record<string, string> = {};
  const used = new Set<string>();
  columns.forEach((col) => {
    const names = [col.key, col.label, ...(col.aliases || [])].filter(Boolean).map(norm);
    const match = headers.find((h) => !used.has(h) && names.includes(norm(h)));
    if (match) { mapping[col.key] = match; used.add(match); }
  });
  columns.forEach((col) => {
    if (mapping[col.key]) return;
    const k = norm(col.key);
    const match = headers.find((h) => {
      const n = norm(h);
      return !used.has(h) && n.length > 2 && k.length > 2 && (n.includes(k) || k.includes(n));
    });
    if (match) { mapping[col.key] = match; used.add(match); }
  });
  return mapping;
};

export function ImportDialog({
  title,
  columns,
  onData,
  loading,
  triggerLabel = title,
  mappingNote,
  templateFilename = "sample_import.xlsx",
  sheetName = "Sample",
  skipMapping = false,
}: ImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selected, setSelected] = useState<string[]>(
    columns.filter((c) => c.core !== false).map((c) => c.key)
  );

  // Mapping step
  const [mappingOpen, setMappingOpen] = useState(false);
  const [pendingRows, setPendingRows] = useState<Record<string, any>[]>([]);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const coreColumns = columns.filter((c) => c.core !== false);
  const optionalColumns = columns.filter((c) => c.core === false);

  const toggleColumn = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]));
  };

  const handleDownloadSample = () => {
    if (selected.length === 0) {
      toast.error("Select at least one column to download.");
      return;
    }
    const picked = columns.filter((c) => selected.includes(c.key));
    const headers = picked.map((c) => c.key);
    const sampleRow = picked.map((c) => c.sample);
    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(12, h.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, templateFilename);
  };

  const startMapping = (rows: Record<string, any>[], headerList?: string[]) => {
    setOpen(false);
    if (skipMapping) { onData(rows); return; }
    // Every column any row has, in sheet order; "__EMPTY*" are blank header cells.
    const seen = new Set<string>();
    const headers: string[] = [];
    const add = (h: string) => {
      if (!h || h.startsWith("__EMPTY") || seen.has(h)) return;
      seen.add(h);
      headers.push(h);
    };
    (headerList || []).forEach(add);
    rows.forEach((r) => Object.keys(r).forEach(add));
    setPendingRows(rows);
    setSheetHeaders(headers);
    setMapping(autoMap(columns, headers));
    setMappingOpen(true);
  };

  const closeMapping = () => {
    setMappingOpen(false);
    setPendingRows([]);
    setSheetHeaders([]);
    setMapping({});
  };

  const mappedHeaders = useMemo(
    () => new Set(Object.values(mapping).filter((h) => h && h !== SKIP)),
    [mapping]
  );
  const unmappedHeaders = sheetHeaders.filter((h) => !mappedHeaders.has(h));
  const missingRequired = columns.filter((c) => c.required && (!mapping[c.key] || mapping[c.key] === SKIP));

  // Puts each mapped sheet column's value under the CRM column's key. The
  // original cells stay on the row too, so module code that also reads other
  // header spellings keeps working; a CRM column set to "Skip" is cleared.
  const completeImport = () => {
    const rows = pendingRows.map((r) => {
      const out: Record<string, any> = { ...r };
      columns.forEach((col) => {
        const h = mapping[col.key];
        if (!h || h === SKIP) {
          if (h === SKIP) delete out[col.key];
          return;
        }
        out[col.key] = r[h];
      });
      return out;
    });
    closeMapping();
    onData(rows);
  };

  const handleFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: "binary", cellDates: true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "", raw: false });
          if (!rows.length) { toast.error("Excel file is empty"); return; }
          const headerRow = (XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 })[0] || []).map((h) => String(h ?? ""));
          startMapping(rows, headerRow);
        } catch {
          toast.error("Failed to parse Excel file");
        }
      };
      reader.readAsBinaryString(file);
    } else if (ext === "csv") {
      Papa.parse<Record<string, any>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: ({ data, errors, meta }) => {
          // A one-column CSV has no delimiter to detect — Papa still parses it
          // fine, so that warning must not block the import.
          const realErrors = errors.filter((e) => e.type !== "Delimiter");
          if (realErrors.length) { toast.error("CSV parse error: " + realErrors[0].message); return; }
          if (!data.length) { toast.error("CSV file is empty"); return; }
          startMapping(data, meta.fields);
        },
        error: (err) => toast.error("Failed to read CSV: " + err.message),
      });
    } else {
      toast.error("Unsupported file type. Use .xlsx, .xls, or .csv");
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!loading) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (loading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={() => setOpen(true)}
        className="h-9 px-3 sm:h-11 sm:px-6 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest hover:bg-primary/5 hover:border-primary/40 hover:text-primary transition-all"
      >
        <Upload className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{loading ? "Importing..." : triggerLabel}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl w-full min-w-[340px] sm:min-w-[560px] min-h-[520px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group ${
                isDragging
                  ? "border-primary bg-primary/10 scale-[1.01]"
                  : "border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10"
              }`}
            >
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">
                  {loading
                    ? "Processing spreadsheet..."
                    : isDragging
                    ? "Drop the file to upload"
                    : "Drag & drop your file here, or click to choose"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports .xlsx, .xls, and .csv formats
                </p>
              </div>
              <Button
                type="button"
                disabled={loading}
                className="mt-2 rounded-xl font-bold gap-2 px-6 h-10 text-xs shadow-md"
              >
                <Upload className="h-4 w-4" />
                {loading ? "Importing..." : "Choose File"}
              </Button>
            </div>

            <div className="rounded-xl bg-muted/40 border border-border/50 p-3 text-[11.5px] text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <span>✨</span> Automatic Column Mapping:
              </p>
              <p>
                {mappingNote ||
                  "Your spreadsheet's columns are matched to the CRM fields automatically — you can review and change the mapping before importing."}
              </p>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-medium">
              <span className="text-red-600 font-bold text-sm leading-none">*</span>
              <span>Fields marked with <strong className="text-red-600 font-bold">*</strong> are strictly required to import.</span>
            </div>

            <div className="rounded-xl border border-border/50 p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">
                Select columns to include in sample file:
              </p>
              <div className="min-w-[280px] sm:min-w-[480px] w-full grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 pr-1">
                {coreColumns.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 text-xs cursor-pointer select-none"
                  >
                    <Checkbox
                      checked={selected.includes(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                    />
                    <span className="whitespace-nowrap">
                      {col.key}
                      {col.required && <span className="text-red-600 font-bold ml-0.5">*</span>}
                    </span>
                  </label>
                ))}
              </div>

              {optionalColumns.length > 0 && showMore && (
                <div className="min-w-[280px] sm:min-w-[480px] w-full grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 pr-1 pt-2 border-t border-border/50">
                  {optionalColumns.map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 text-xs cursor-pointer select-none"
                    >
                      <Checkbox
                        checked={selected.includes(col.key)}
                        onCheckedChange={() => toggleColumn(col.key)}
                      />
                      <span className="whitespace-nowrap">{col.key}</span>
                    </label>
                  ))}
                </div>
              )}

              {optionalColumns.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowMore((v) => !v)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                >
                  {showMore ? (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Hide optional fields
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-3 w-3" />
                      Show {optionalColumns.length} more optional fields
                    </>
                  )}
                </button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full rounded-xl font-bold gap-2 text-xs mt-1"
                onClick={handleDownloadSample}
              >
                <Download className="h-3.5 w-3.5" />
                Download Sample Data
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={mappingOpen} onOpenChange={(o) => (o ? setMappingOpen(true) : closeMapping())}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Import Field Mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground font-medium">
              Map your sheet's columns to the CRM fields. We've tried to auto-match them for you.
              <span className="ml-1 font-semibold text-foreground">{pendingRows.length} row(s) found.</span>
            </p>

            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 font-medium">
              <span className="text-red-600 font-bold text-sm leading-none">*</span>
              <span>Fields marked with <strong className="text-red-600 font-bold">*</strong> are required — rows without them are skipped.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[48vh] overflow-y-auto pr-2">
              {columns.map((col) => (
                <div key={col.key} className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center">
                    <span>{col.label || col.key}</span>
                    {col.required && <span className="text-red-600 font-bold text-xs ml-1" title="Required Field">*</span>}
                  </Label>
                  <Select
                    value={mapping[col.key] || SKIP}
                    onValueChange={(val) => setMapping((prev) => ({ ...prev, [col.key]: val }))}
                  >
                    <SelectTrigger className="h-10 rounded-md bg-muted/40 border-0">
                      <SelectValue placeholder="Skip Field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SKIP}>Skip Field</SelectItem>
                      {sheetHeaders.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {missingRequired.length > 0 && (
              <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Required field not mapped: <strong>{missingRequired.map((c) => c.label || c.key).join(", ")}</strong>. Pick the matching column from your sheet, or rows may be skipped.</span>
              </div>
            )}

            {unmappedHeaders.length > 0 && (
              <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>These columns of your sheet will NOT be imported: <strong>{unmappedHeaders.join(", ")}</strong></span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
              <Button variant="ghost" onClick={closeMapping} className="rounded-md font-semibold">Cancel</Button>
              <Button onClick={completeImport} disabled={loading} className="rounded-md font-semibold shadow-sm px-8">
                {loading ? "Importing..." : "Complete Import"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
