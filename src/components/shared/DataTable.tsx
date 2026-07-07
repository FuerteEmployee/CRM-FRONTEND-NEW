import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import {
  FileDown,
  RotateCcw,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Mic,
  MicOff,
  CheckSquare,
  Zap,
  FileSpreadsheet,
  FileType,
  Printer
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";

export interface DataTableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T, index: number) => React.ReactNode;
  width?: string;
  className?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onRefresh?: () => void;
  searchPlaceholder?: string;
  idField?: keyof T | string;
  showIdColumn?: boolean;
  children?: React.ReactNode;
  renderCustomActions?: (item: T) => React.ReactNode;
  enableBulkActions?: boolean;
  onBulkDelete?: (items: T[]) => void;
  bulkActions?: { label: string; value: string; action: (items: T[]) => void }[];
  toolbarActions?: React.ReactNode;
  getExportData?: (data: T[]) => Record<string, any>[];
  exportFilename?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading,
  onEdit,
  onDelete,
  onRefresh,
  searchPlaceholder = "Search...",
  idField = "_id",
  showIdColumn = true,
  children,
  renderCustomActions,
  enableBulkActions = false,
  onBulkDelete,
  bulkActions,
  toolbarActions,
  getExportData,
  exportFilename,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [selectedItems, setSelectedItems] = useState<T[]>([]);
  const [pageSize, setPageSize] = useState("25");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "asc" | "desc" | null;
  }>({ key: null, direction: null });

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" | null = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = null;
    }
    setSortConfig({ key: direction ? key : null, direction });
  };

  const filteredData = data.filter((item) =>
    Object.values(item).some(
      (val) =>
        val && val.toString().toLowerCase().includes(search.toLowerCase()),
    ),
  );

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortConfig.key || !sortConfig.direction) return 0;

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (typeof aValue === "string") aValue = aValue.toLowerCase();
    if (typeof bValue === "string") bValue = bValue.toLowerCase();

    if (aValue < bValue) {
      return sortConfig.direction === "asc" ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === "asc" ? 1 : -1;
    }
    return 0;
  });

  const itemsPerPage = parseInt(pageSize);
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const safeCurrentPage = Math.min(currentPage, totalPages || 1);

  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = sortedData.slice(startIndex, endIndex);

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key)
      return (
        <ChevronsUpDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
      );
    return sortConfig.direction === "asc" ? (
      <ChevronUp className="h-4 w-4 text-primary" />
    ) : (
      <ChevronDown className="h-4 w-4 text-primary" />
    );
  };

  const getFormattedExportData = () => {
    let rawData: Record<string, any>[] = [];
    
    if (getExportData) {
      rawData = getExportData(sortedData);
    } else {
      rawData = sortedData.map((item, index) => {
        const rowData: Record<string, any> = {};
        columns.forEach((col) => {
          let val = "";
          if (col.key === idField) {
            val = String(index + 1);
          } else {
            const rawVal =
              typeof col.key === "string"
                ? col.key.split(".").reduce((obj: any, k) => (obj || {})[k], item)
                : item[col.key as keyof T];
            val = rawVal !== undefined && rawVal !== null ? String(rawVal) : "";
          }
          rowData[col.label] = val;
        });
        return rowData;
      });
    }

    const allHeaders = Array.from(
      new Set(rawData.flatMap((row) => Object.keys(row)))
    );

    return rawData.map((row) => {
      const normalizedRow: Record<string, any> = {};
      allHeaders.forEach((h) => {
        normalizedRow[h] = row[h] !== undefined && row[h] !== null ? row[h] : "";
      });
      return normalizedRow;
    });
  };

  const handleExportCSV = () => {
    if (sortedData.length === 0) {
      toast({ title: "No Data", description: "There is no data to export.", variant: "destructive" });
      return;
    }

    try {
      const dataToExport = getFormattedExportData();
      if (dataToExport.length === 0) return;

      const csv = Papa.unparse(dataToExport);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${exportFilename || "export"}_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({ title: "Export Failed", description: err.message || "Could not export CSV.", variant: "destructive" });
    }
  };

  const handleExportExcel = () => {
    if (sortedData.length === 0) {
      toast({ title: "No Data", description: "There is no data to export.", variant: "destructive" });
      return;
    }

    try {
      const dataToExport = getFormattedExportData();
      if (dataToExport.length === 0) return;

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
      XLSX.writeFile(workbook, `${exportFilename || "export"}_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (err: any) {
      toast({ title: "Export Failed", description: err.message || "Could not export Excel.", variant: "destructive" });
    }
  };

  const handleExportPDF = () => {
    if (sortedData.length === 0) {
      toast({ title: "No Data", description: "There is no data to export.", variant: "destructive" });
      return;
    }

    try {
      const dataToExport = getFormattedExportData();
      if (dataToExport.length === 0) return;

      const headers = Object.keys(dataToExport[0]);
      const body = dataToExport.map(row => headers.map(h => row[h] ? String(row[h]) : ""));

      const doc = new jsPDF("landscape");
      
      doc.setFontSize(16);
      const titleText = `${exportFilename || "Export Data"}`.replace(/_/g, " ").toUpperCase();
      doc.text(titleText, 14, 15);
      
      doc.setFontSize(10);
      doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 22);

      autoTable(doc, {
        head: [headers],
        body: body,
        startY: 28,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      });

      doc.save(`${exportFilename || "export"}_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Export Failed", description: err.message || "Could not generate PDF.", variant: "destructive" });
    }
  };

  const handlePrint = () => {
    if (sortedData.length === 0) {
      toast({ title: "No Data", description: "There is no data to print.", variant: "destructive" });
      return;
    }

    try {
      const dataToExport = getFormattedExportData();
      if (dataToExport.length === 0) return;

      const headers = Object.keys(dataToExport[0]);
      
      const html = `
        <html>
          <head>
            <title>Print - ${exportFilename || "Export Data"}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #333; }
              h1 { font-size: 24px; margin-bottom: 5px; text-transform: capitalize; }
              p { font-size: 12px; color: #666; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; }
              th, td { padding: 8px 12px; border: 1px solid #ddd; text-align: left; }
              th { background-color: #f4f4f5; font-weight: 600; }
              tr:nth-child(even) { background-color: #fafafa; }
              @media print {
                @page { size: landscape; margin: 10mm; }
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <h1>${(exportFilename || "Export Data").replace(/_/g, " ")}</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
            <table>
              <thead>
                <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
              </thead>
              <tbody>
                ${dataToExport.map(row => `<tr>${headers.map(h => `<td>${row[h] ? String(row[h]).replace(/</g, "&lt;").replace(/>/g, "&gt;") : ""}</td>`).join("")}</tr>`).join("")}
              </tbody>
            </table>
            <script>
              window.onload = () => {
                window.print();
                setTimeout(() => window.close(), 500);
              };
            </script>
          </body>
        </html>
      `;

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
      } else {
        toast({ title: "Error", description: "Please allow pop-ups to print the data.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Print Failed", description: err.message || "Could not prepare print data.", variant: "destructive" });
    }
  };

  const handleVoiceSearch = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Error", description: "Voice search not supported in this browser", variant: "destructive" });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setSearch(transcript);
      setCurrentPage(1);
    };

    recognition.onend = () => setIsListening(false);

    recognition.onerror = (event: any) => {
      setIsListening(false);
      // Ignore common non-critical errors
      if (event.error === 'no-speech' || event.error === 'aborted' || event.error === 'not-allowed') {
        if (event.error === 'not-allowed') {
          toast({ title: "Microphone Access Denied", description: "Please allow microphone access in your browser to use voice search.", variant: "destructive" });
        }
        return;
      }
      toast({ title: "Error", description: `Voice recognition failed (${event.error}).`, variant: "destructive" });
    };

    recognition.start();
  };

  const toggleAll = () => {
    if (selectedItems.length === currentItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems([...currentItems]);
    }
  };

  const toggleItem = (item: T) => {
    const isSelected = selectedItems.find((i) => i[idField as keyof T] === item[idField as keyof T]);
    if (isSelected) {
      setSelectedItems(selectedItems.filter((i) => i[idField as keyof T] !== item[idField as keyof T]));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  return (
    <div className="space-y-6">
      {children}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select
            value={pageSize}
            onValueChange={(val) => {
              setPageSize(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[70px] h-11 rounded-xl font-bold text-xs">
              <SelectValue placeholder="25" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 rounded-xl px-4 border-slate-200 bg-white font-black uppercase text-[10px] tracking-widest text-muted-foreground hover:text-primary hover:bg-slate-50 transition-all duration-200">
                Export <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-2xl p-2 border-slate-100 shadow-2xl">
              <DropdownMenuItem className="rounded-xl h-10 font-bold text-xs cursor-pointer text-slate-700 hover:bg-slate-50 focus:bg-slate-50" onClick={handleExportExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" /> Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl h-10 font-bold text-xs cursor-pointer text-slate-700 hover:bg-slate-50 focus:bg-slate-50" onClick={handleExportCSV}>
                <FileType className="mr-2 h-4 w-4 text-rose-600" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl h-10 font-bold text-xs cursor-pointer text-slate-700 hover:bg-slate-50 focus:bg-slate-50" onClick={handleExportPDF}>
                <FileDown className="mr-2 h-4 w-4 text-blue-600" /> PDF
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl h-10 font-bold text-xs cursor-pointer text-slate-700 hover:bg-slate-50 focus:bg-slate-50" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4 text-slate-600" /> Print Data
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {toolbarActions}
          {onRefresh && (
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl"
              onClick={onRefresh}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          {enableBulkActions && selectedItems.length === 0 && (
            <Button
              variant="outline"
              className="flex items-center gap-2 h-11 px-6 rounded-xl border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all duration-200 font-black text-[10px] uppercase tracking-widest"
              onClick={() => toast({ title: "Bulk Actions", description: "Select items first to apply bulk actions." })}
            >
              <Zap className="h-4 w-4 text-primary" />
              Bulk Actions
            </Button>
          )}
          {enableBulkActions && selectedItems.length > 0 && (
            <div className="flex items-center gap-2 border-l pl-2 ml-2">
              <span className="text-sm font-bold text-muted-foreground mr-2">{selectedItems.length} selected</span>
              {onBulkDelete && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete ${selectedItems.length} items?`)) {
                      onBulkDelete(selectedItems);
                      setSelectedItems([]);
                    }
                  }}
                  className="h-11 px-4 text-xs font-bold uppercase tracking-widest rounded-xl"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Bulk Delete
                </Button>
              )}
              {bulkActions?.map((action, i) => (
                <Button
                  key={i}
                  variant="secondary"
                  onClick={() => {
                    action.action(selectedItems);
                    setSelectedItems([]);
                  }}
                  className="h-11 px-4 text-xs font-bold uppercase tracking-widest rounded-xl"
                >
                  <CheckSquare className="h-4 w-4 mr-2" /> {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
        <div className="relative w-full max-w-sm group">
          <Input
            placeholder={searchPlaceholder}
            className="pl-4 h-11 border-border focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 rounded-xl bg-muted/50 font-bold text-xs"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                {enableBulkActions && (
                  <TableHead className="w-12 text-center py-3 px-4 border-r">
                    <Checkbox
                      checked={currentItems.length > 0 && selectedItems.length === currentItems.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                )}
                {showIdColumn && (
                  <TableHead
                    className="w-16 font-semibold text-foreground py-3 px-4 border-r cursor-pointer hover:bg-accent/50 group whitespace-nowrap"
                    onClick={() => requestSort(idField as string)}
                  >
                    <div className="flex items-center gap-2">
                      ID
                      {getSortIcon(idField as string)}
                    </div>
                  </TableHead>
                )}
                {columns.map((col, i) => (
                  <TableHead
                    key={i}
                    className={`font-semibold text-foreground py-3 px-4 group select-none whitespace-nowrap ${col.sortable !== false
                      ? "cursor-pointer hover:bg-accent/50"
                      : ""
                      } ${col.className || ""} ${i < columns.length - 1 ? "border-r" : ""}`}
                    style={{ width: col.width }}
                    onClick={() =>
                      col.sortable !== false && requestSort(col.key as string)
                    }
                  >
                    <div className="flex items-center gap-2">
                      {col.label}
                      {col.sortable !== false && getSortIcon(col.key as string)}
                    </div>
                  </TableHead>
                ))}
                {(onEdit || onDelete || renderCustomActions) && (
                  <TableHead className="text-right font-semibold text-foreground py-3 px-4 w-28 uppercase tracking-wider text-[11px] whitespace-nowrap">
                    Options
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody className="text-foreground">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {enableBulkActions && (
                      <TableCell className="border-r">
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                    )}
                    {showIdColumn && (
                      <TableCell className="border-r">
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                    )}
                    {columns.map((_, j) => (
                      <TableCell
                        key={j}
                        className={j < columns.length - 1 ? "border-r" : ""}
                      >
                        <Skeleton
                          className={`h-4 ${j === 0 ? "w-3/4" : "w-1/2"}`}
                        />
                      </TableCell>
                    ))}
                    {(onEdit || onDelete || renderCustomActions) && (
                      <TableCell />
                    )}
                  </TableRow>
                ))
              ) : currentItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      columns.length +
                      (showIdColumn ? 1 : 0) +
                      (enableBulkActions ? 1 : 0) +
                      (onEdit || onDelete || renderCustomActions ? 1 : 0)
                    }
                    className="h-32 text-center text-muted-foreground italic"
                  >
                    No records found.
                  </TableCell>
                </TableRow>
              ) : (
                currentItems.map((item, index) => (
                  <TableRow
                    key={item[idField as string] || index}
                    className="hover:bg-muted/20 transition-colors group border-b last:border-0"
                  >
                    {enableBulkActions && (
                      <TableCell className="border-r py-3 px-4">
                        <Checkbox
                          checked={!!selectedItems.find((i) => i[idField as keyof T] === item[idField as keyof T])}
                          onCheckedChange={() => toggleItem(item)}
                        />
                      </TableCell>
                    )}
                    {showIdColumn && (
                      <TableCell className="text-muted-foreground font-mono text-[11px] border-r py-3 px-4">
                        {startIndex + index + 1}
                      </TableCell>
                    )}
                    {columns.map((col, j) => (
                      <TableCell
                        key={j}
                        className={`py-3 px-4 ${col.className || ""} ${j < columns.length - 1 ? "border-r" : ""
                          }`}
                      >
                        {col.render
                          ? col.render(item, startIndex + index)
                          : item[col.key as string] || "-"}
                      </TableCell>
                    ))}
                    {(onEdit || onDelete || renderCustomActions) && (
                      <TableCell className="text-right py-2 px-4">
                        <div className="flex justify-end gap-1">
                          {renderCustomActions && renderCustomActions(item)}
                          {onEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5"
                              onClick={() => onEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                              onClick={() => onDelete(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-t bg-muted/30">
          <div className="text-sm text-muted-foreground font-medium">
            Showing{" "}
            <span className="text-foreground font-bold">
              {sortedData.length > 0 ? startIndex + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="text-foreground font-bold">
              {Math.min(endIndex, sortedData.length)}
            </span>{" "}
            of{" "}
            <span className="text-foreground font-bold">{sortedData.length}</span>{" "}
            entries
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              disabled={safeCurrentPage === 1}
              className="text-muted-foreground hover:bg-accent h-9 text-xs font-bold px-3 uppercase tracking-wider disabled:opacity-30"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <Button
                    key={page}
                    variant={page === safeCurrentPage ? "default" : "ghost"}
                    className={`h-9 w-9 p-0 rounded-lg text-sm font-bold transition-all duration-300 ${page === safeCurrentPage
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_2px_10px_-3px_hsl(var(--primary)/0.5)]"
                      : "text-muted-foreground hover:bg-accent"
                      }`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ),
              )}
            </div>
            <Button
              variant="ghost"
              disabled={safeCurrentPage === totalPages || totalPages === 0}
              className="text-muted-foreground hover:bg-accent h-9 text-xs font-bold px-3 uppercase tracking-wider disabled:opacity-30"
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
