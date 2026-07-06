import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { toast } from "sonner";

interface ImportButtonProps {
  onData: (rows: Record<string, any>[]) => void;
  loading?: boolean;
  label?: string;
}

export function ImportButton({ onData, loading, label = "Import" }: ImportButtonProps) {
  const fileRef = useRef<HTMLInputElement>(null);

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
        onClick={() => fileRef.current?.click()}
        className="h-11 px-6 rounded-xl gap-2 font-black uppercase text-[10px] tracking-widest"
      >
        <Upload className="h-3.5 w-3.5" />
        {loading ? "Importing..." : label}
      </Button>
    </>
  );
}
