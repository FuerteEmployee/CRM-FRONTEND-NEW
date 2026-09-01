import { Button } from "@/components/ui/button";
import { Download, ChevronDown, FileSpreadsheet, FileJson, FileType, Printer } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CellType = "string" | "number" | "date";
type CellValue = string | number | Date | null;

interface ExportColumn {
  header: string;
  key: string | ((row: any) => string | number);
  // "number"/"date" keep the cell as a real Excel number/date cell instead
  // of text, so SUM/AutoFilter/date-sort work on the exported file. Default
  // "string" preserves the original pre-formatted-text behavior.
  type?: CellType;
}

interface ExportButtonProps {
  // A plain array works as before. Pages that only keep the current page of
  // a paginated table in memory can instead pass a loader that fetches the
  // full matching set on demand, only when the user actually exports.
  data: any[] | (() => Promise<any[]>);
  filename: string;
  columns?: ExportColumn[];
}

// Raw (untyped-to-string) value for a column — a real number/Date when the
// column says so, otherwise whatever the key/path lookup returns.
const resolveRawValue = (item: any, col: ExportColumn): CellValue => {
  const raw = typeof col.key === "function"
    ? col.key(item)
    : col.key.split(".").reduce((obj: any, k) => (obj || {})[k], item);

  if (raw === undefined || raw === null || raw === "") return col.type === "number" ? 0 : null;

  if (col.type === "number") {
    const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  if (col.type === "date") {
    const d = raw instanceof Date ? raw : new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
  return raw;
};

const cellToDisplayString = (val: CellValue): string => {
  if (val === null || val === undefined) return "";
  if (val instanceof Date) {
    const day = String(val.getUTCDate()).padStart(2, "0");
    const month = String(val.getUTCMonth() + 1).padStart(2, "0");
    return `${day}-${month}-${val.getUTCFullYear()}`;
  }
  return String(val);
};

const buildRows = (
  data: any[],
  columns?: ExportButtonProps["columns"],
): { headers: string[]; rows: CellValue[][] } => {
  if (columns && columns.length > 0) {
    return {
      headers: columns.map(c => c.header),
      rows: data.map(item => columns.map(c => resolveRawValue(item, c))),
    };
  }
  const headers = Object.keys(data[0]).filter(k => k !== "_id" && k !== "__v");
  return { headers, rows: data.map(item => headers.map(k => item[k] ?? null)) };
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export function ExportButton({ data, filename, columns }: ExportButtonProps) {
  const dated = `${filename}_${new Date().toISOString().split("T")[0]}`;

  const handleExport = async (type: "xlsx" | "csv" | "pdf" | "print") => {
    if (type === "print") {
      window.print();
      return;
    }
    if (type === "pdf") {
      toast.info("Select 'Save as PDF' in the print dialog");
      window.print();
      return;
    }

    let resolved: any[];
    try {
      resolved = typeof data === "function" ? await data() : data;
    } catch (error) {
      console.error(error);
      toast.error("Failed to load data to export");
      return;
    }

    if (!resolved || resolved.length === 0) {
      toast.error("No data available to export");
      return;
    }

    try {
      if (type === "csv") {
        const { headers, rows } = buildRows(resolved, columns);
        const csv = [
          headers.join(","),
          ...rows.map(r => r.map(v => `"${cellToDisplayString(v).replace(/"/g, '""')}"`).join(",")),
        ].join("\n");
        // UTF-8 BOM so Excel opens it correctly
        downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }), `${dated}.csv`);
        toast.success(`Exported ${resolved.length} records as CSV`);

      } else {
        const { headers, rows } = buildRows(resolved, columns);
        const wsData = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `${dated}.xlsx`);
        toast.success(`Exported ${resolved.length} records as Excel`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate export file");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 px-3 sm:h-11 sm:px-6 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest">
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export</span>
          <ChevronDown className="hidden sm:inline h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 rounded-xl border-border/50 shadow-xl">
        <DropdownMenuItem onClick={() => handleExport("xlsx")} className="gap-3 cursor-pointer p-3 font-bold text-xs">
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          <span>Excel</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-3 cursor-pointer p-3 font-bold text-xs">
          <FileJson className="h-4 w-4 text-blue-600" />
          <span>CSV</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-3 cursor-pointer p-3 font-bold text-xs">
          <FileType className="h-4 w-4 text-red-600" />
          <span>PDF</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("print")} className="gap-3 cursor-pointer p-3 font-bold text-xs">
          <Printer className="h-4 w-4 text-gray-600" />
          <span>Print</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
