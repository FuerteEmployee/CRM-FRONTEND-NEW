import { Button } from "@/components/ui/button";
import { Download, ChevronDown, FileSpreadsheet, FileJson, FileType, Printer } from "lucide-react";
import { toast } from "sonner";
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

export function ExportButton({ data, filename, columns }: ExportButtonProps) {
  const handleExport = (type: "xlsx" | "csv" | "pdf" | "print") => {
    if (!data || data.length === 0) {
      toast.error("No data available to export");
      return;
    }

    if (type === "csv" || type === "xlsx") {
      try {
        let headers: string[] = [];
        let rows: string[][] = [];

        if (columns && columns.length > 0) {
          headers = columns.map(c => c.header);
          rows = data.map(item => 
            columns.map(c => {
              if (typeof c.key === 'function') {
                return String(c.key(item));
              }
              const value = c.key.split('.').reduce((obj, k) => (obj || {})[k], item);
              return String(value ?? "");
            })
          );
        } else {
          headers = Object.keys(data[0]).filter(k => k !== '_id' && k !== '__v');
          rows = data.map(item => headers.map(k => String(item[k] ?? "")));
        }

        const csvData = [headers.join(","), ...rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(","))].join("\n");
        const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.${type}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast.success(`Exported ${data.length} records successfully as ${type.toUpperCase()}!`);
      } catch (error) {
        console.error(error);
        toast.error("Failed to generate export file");
      }
    } else if (type === "print") {
      window.print();
    } else if (type === "pdf") {
      toast.info("Ready to save - choose Save as PDF in print options");
      window.print();
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
