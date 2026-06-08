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
  FileDown,
  RotateCcw,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Mic,
  MicOff,
  CheckSquare
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

  const handleExport = () => {
    if (sortedData.length === 0) return;

    const headers = columns.map((col) => col.label);
    const rows = sortedData.map((item, index) =>
      columns.map((col) => {
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
        return val.replace(/"/g, '""');
      })
    );

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((v) => `"${v}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center gap-2 h-11 px-6 rounded-xl border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all duration-200 font-black text-[10px] uppercase tracking-widest"
          >
            <FileDown className="h-4 w-4" />
            Export
          </Button>
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
