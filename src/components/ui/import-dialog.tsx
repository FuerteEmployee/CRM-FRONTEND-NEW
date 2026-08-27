import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, Download, ChevronDown, ChevronRight } from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { toast } from "sonner";

export interface ImportColumn {
  key: string;
  sample: string | number;
  required?: boolean;
  core?: boolean;
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
}

export function ImportDialog({
  title,
  columns,
  onData,
  loading,
  triggerLabel = title,
  mappingNote,
  templateFilename = "sample_import.xlsx",
  sheetName = "Sample",
}: ImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [selected, setSelected] = useState<string[]>(
    columns.filter((c) => c.core !== false).map((c) => c.key)
  );

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
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, templateFilename);
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
          onData(rows);
          setOpen(false);
        } catch {
          toast.error("Failed to parse Excel file");
        }
      };
      reader.readAsBinaryString(file);
    } else if (ext === "csv") {
      Papa.parse<Record<string, any>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: ({ data, errors }) => {
          if (errors.length) { toast.error("CSV parse error: " + errors[0].message); return; }
          if (!data.length) { toast.error("CSV file is empty"); return; }
          onData(data);
          setOpen(false);
        },
        error: (err) => toast.error("Failed to read CSV: " + err.message),
      });
    } else {
      toast.error("Unsupported file type. Use .xlsx, .xls, or .csv");
    }
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
        className="h-9 px-3 sm:h-11 sm:px-6 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest"
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
              className="border-2 border-dashed border-primary/30 hover:border-primary/60 bg-primary/5 hover:bg-primary/10 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
            >
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">
                  {loading ? "Processing spreadsheet..." : "Click to choose Excel / CSV file"}
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

            {mappingNote && (
              <div className="rounded-xl bg-muted/40 border border-border/50 p-3 text-[11.5px] text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-1.5">
                  <span>✨</span> Automatic Column Mapping:
                </p>
                <p>{mappingNote}</p>
              </div>
            )}

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
                      {col.required && <span className="text-destructive"> *</span>}
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
    </>
  );
}
