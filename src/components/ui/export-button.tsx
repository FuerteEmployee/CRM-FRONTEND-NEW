import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface ExportButtonProps {
  data: any[];
  filename: string;
  columns?: { header: string; key: string | ((row: any) => string | number) }[];
}

export function ExportButton({ data, filename, columns }: ExportButtonProps) {
  const handleExport = () => {
    if (!data || data.length === 0) {
      toast.error("No data available to export");
      return;
    }

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
            // Safely resolve nested paths like "customer.company"
            const value = c.key.split('.').reduce((obj, k) => (obj || {})[k], item);
            return String(value ?? "");
          })
        );
      } else {
        // Auto-generate columns from the first object keys
        headers = Object.keys(data[0]).filter(k => k !== '_id' && k !== '__v');
        rows = data.map(item => headers.map(k => String(item[k] ?? "")));
      }

      // Format CSV
      const csvData = [headers.join(","), ...rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${data.length} records successfully!`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate export file");
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 font-bold uppercase tracking-wider text-xs">
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  );
}
