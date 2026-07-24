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

interface ExportButtonProps {
  data: any[];
  filename: string;
  columns?: { header: string; key: string | ((row: any) => string | number) }[];
}

const buildRows = (
  data: any[],
  columns?: ExportButtonProps["columns"],
): { headers: string[]; rows: string[][] } => {
  if (columns && columns.length > 0) {
    return {
      headers: columns.map(c => c.header),
      rows: data.map(item =>
        columns.map(c => {
          if (typeof c.key === "function") return String(c.key(item));
          const value = c.key.split(".").reduce((obj: any, k) => (obj || {})[k], item);
          return String(value ?? "");
        }),
      ),
    };
  }
  const headers = Object.keys(data[0]).filter(k => k !== "_id" && k !== "__v");
  return { headers, rows: data.map(item => headers.map(k => String(item[k] ?? ""))) };
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

  const handleExport = (type: "xlsx" | "csv" | "pdf" | "print") => {
    if (!data || data.length === 0) {
      toast.error("No data available to export");
      return;
    }

    try {
      if (type === "csv") {
        const { headers, rows } = buildRows(data, columns);
        const csv = [
          headers.join(","),
          ...rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(",")),
        ].join("\n");
        // UTF-8 BOM so Excel opens it correctly
        downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }), `${dated}.csv`);
        toast.success(`Exported ${data.length} records as CSV`);

      } else if (type === "xlsx") {
        const { headers, rows } = buildRows(data, columns);
        const wsData = [headers, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, `${dated}.xlsx`);
        toast.success(`Exported ${data.length} records as Excel`);

      } else if (type === "print") {
        window.print();

      } else if (type === "pdf") {
        toast.info("Select 'Save as PDF' in the print dialog");
        window.print();
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate export file");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-11 px-6 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest">
          <Download className="h-3.5 w-3.5" />
          Export
          <ChevronDown className="h-3 w-3 opacity-50" />
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
