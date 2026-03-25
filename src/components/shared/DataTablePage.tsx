import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
  Plus,
  Search,
  FileDown,
  RotateCcw,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export interface DataTableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T, index: number) => React.ReactNode;
  width?: string;
  className?: string;
  sortable?: boolean;
}

interface DataTablePageProps<T> {
  title: string;
  subtitle?: string;
  addLabel?: string;
  onAdd?: () => void;
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
}

export function DataTablePage<T extends Record<string, any>>({
  title,
  subtitle,
  addLabel,
  onAdd,
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
}: DataTablePageProps<T>) {
  const [search, setSearch] = useState("");
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

    // Handle nested or complex fields if necessary
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

  // Pagination Logic
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1a2b3c]">{title}</h1>
            {subtitle && (
              <p className="text-muted-foreground text-sm">{subtitle}</p>
            )}
          </div>
          {onAdd && (
            <Button
              onClick={onAdd}
              className="bg-[#1a2b3c] hover:bg-[#2c3e50] text-white flex items-center gap-2 h-10 px-5 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span className="font-semibold text-sm">
                {addLabel || `New ${title.slice(0, -1)}`}
              </span>
            </Button>
          )}
        </div>
        {children}

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Select
              value={pageSize}
              onValueChange={(val) => {
                setPageSize(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[70px] h-10">
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
              className="flex items-center gap-2 h-10 px-4 border-gray-200 hover:border-primary/50 hover:bg-primary/5 text-gray-600 hover:text-primary transition-all duration-200 font-medium text-sm"
            >
              <FileDown className="h-4 w-4" />
              Export
            </Button>
            {onRefresh && (
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={onRefresh}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="relative w-full max-w-sm group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder={searchPlaceholder}
              className="pl-10 h-10 border-gray-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200 rounded-lg bg-gray-50/50"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  {showIdColumn && (
                    <TableHead
                      className="w-16 font-semibold text-gray-700 py-3 px-4 border-r cursor-pointer hover:bg-gray-100/50 group whitespace-nowrap"
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
                      className={`font-semibold text-gray-700 py-3 px-4 group select-none whitespace-nowrap ${
                        col.sortable !== false
                          ? "cursor-pointer hover:bg-gray-100/50"
                          : ""
                      } ${col.className || ""} ${i < columns.length - 1 ? "border-r" : ""}`}
                      style={{ width: col.width }}
                      onClick={() =>
                        col.sortable !== false && requestSort(col.key as string)
                      }
                    >
                      <div className="flex items-center gap-2">
                        {col.label}
                        {col.sortable !== false &&
                          getSortIcon(col.key as string)}
                      </div>
                    </TableHead>
                  ))}
                  {(onEdit || onDelete) && (
                    <TableHead className="text-right font-semibold text-gray-700 py-3 px-4 w-28 uppercase tracking-wider text-[11px] whitespace-nowrap">
                      Options
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
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
                      {(onEdit || onDelete) && <TableCell />}
                    </TableRow>
                  ))
                ) : currentItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        columns.length +
                        (showIdColumn ? 1 : 0) +
                        (onEdit || onDelete ? 1 : 0)
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
                      {showIdColumn && (
                        <TableCell className="text-muted-foreground font-mono text-[11px] border-r py-3 px-4">
                          {startIndex + index + 1}
                        </TableCell>
                      )}
                      {columns.map((col, j) => (
                        <TableCell
                          key={j}
                          className={`py-3 px-4 ${col.className || ""} ${
                            j < columns.length - 1 ? "border-r" : ""
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
                            {onEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-primary hover:bg-primary/5"
                                onClick={() => onEdit(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {renderCustomActions && renderCustomActions(item)}
                            {onDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-destructive hover:bg-destructive/5"
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
          {/* Footer */}
          <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-t bg-gray-50/30">
            <div className="text-sm text-gray-500 font-medium">
              Showing{" "}
              <span className="text-gray-900 font-bold">
                {sortedData.length > 0 ? startIndex + 1 : 0}
              </span>{" "}
              to{" "}
              <span className="text-gray-900 font-bold">
                {Math.min(endIndex, sortedData.length)}
              </span>{" "}
              of{" "}
              <span className="text-gray-900 font-bold">
                {sortedData.length}
              </span>{" "}
              entries
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                disabled={safeCurrentPage === 1}
                className="text-gray-600 hover:bg-gray-100 h-9 text-xs font-bold px-3 uppercase tracking-wider disabled:opacity-30"
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
                      className={`h-9 w-9 p-0 rounded-lg text-sm font-bold transition-all duration-300 ${
                        page === safeCurrentPage
                          ? "bg-primary hover:bg-primary/90 text-white shadow-[0_2px_10px_-3px_hsl(var(--primary)/0.5)]"
                          : "text-gray-600 hover:bg-gray-100"
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
                className="text-gray-600 hover:bg-gray-100 h-9 text-xs font-bold px-3 uppercase tracking-wider disabled:opacity-30"
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
    </DashboardLayout>
  );
}
