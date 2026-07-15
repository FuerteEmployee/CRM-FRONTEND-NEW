import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/hrms/components/ui/table";
import { Card } from "@/hrms/components/ui/card";
import { Skeleton } from "@/hrms/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/hrms/components/ui/pagination";
import { useState, useMemo, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/hrms/components/ui/button";
import { cn } from "@/hrms/lib/utils";

export interface Column<T> {
  id?: string;
  minWidth?: number;
  width?: number;
  header: string | React.ReactNode;
  accessorKey: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  isLoading?: boolean;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  currentPage?: number;
}

function getPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [];
  const add = (p: number) => {
    if (!pages.includes(p)) pages.push(p);
  };
  add(1);
  if (current > 3) pages.push("...");
  for (
    let p = Math.max(2, current - 1);
    p <= Math.min(total - 1, current + 1);
    p++
  )
    add(p);
  if (current < total - 2) pages.push("...");
  add(total);
  return pages;
}

export function DataTable<T extends { id?: string | number; _id?: string | number }>({
  data,
  columns,
  pageSize: defaultPageSize = 10,
  onRowClick,
  emptyMessage = "No data found",
  isLoading = false,
  totalItems,
  onPageChange,
  onPageSizeChange,
  currentPage: externalCurrentPage,
}: DataTableProps<T>) {
  const [internalPage, setInternalPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Delay showing "No Data Found" so a brief loading flash never shows the empty state
  const [showEmpty, setShowEmpty] = useState(false);
  const emptyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (emptyTimer.current) clearTimeout(emptyTimer.current);
    if (!isLoading && data.length === 0) {
      emptyTimer.current = setTimeout(() => setShowEmpty(true), 400);
    } else {
      setShowEmpty(false);
    }
    return () => { if (emptyTimer.current) clearTimeout(emptyTimer.current); };
  }, [isLoading, data.length]);

  // Sync internal page size state with prop changes
  useEffect(() => {
    setPageSize(defaultPageSize);
    setInternalPage(1);
  }, [defaultPageSize]);

  // Reset page to 1 when data changes (e.g., search/filters applied)
  const prevDataRef = useRef<T[]>(data);
  useEffect(() => {
    const hasChanged =
      prevDataRef.current.length !== data.length ||
      prevDataRef.current.some((item, idx) => item !== data[idx]);

    if (hasChanged) {
      setInternalPage(1);
      prevDataRef.current = data;
    }
  }, [data]);

  const isServerSide = totalItems !== undefined && onPageChange !== undefined;
  const currentPage = isServerSide ? (externalCurrentPage || 1) : internalPage;
  const totalCount = isServerSide ? totalItems : data.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Clamp page to bounds if it exceeds total pages
  useEffect(() => {
    if (!isServerSide && internalPage > totalPages) {
      setInternalPage(totalPages);
    }
  }, [totalPages, internalPage, isServerSide]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setInternalPage(1);
    if (isServerSide) {
      onPageChange!(1);
      onPageSizeChange?.(newSize);
    }
  };

  const paginatedData = useMemo(() => {
    if (isServerSide) return data;
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, currentPage, pageSize, isServerSide]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      if (isServerSide) {
        onPageChange(page);
      } else {
        setInternalPage(page);
      }
    }
  };

  const pageRange = getPageRange(currentPage, totalPages);

  return (
    <div className="space-y-4">
      <Card className="bg-white border border-slate-200 shadow-sm overflow-hidden rounded-xl">
        {/* ── Desktop Table View ── */}
        <div
          className="w-full overflow-x-auto custom-scrollbar hidden md:block"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <table className="w-full caption-bottom text-sm border-collapse">
            <TableHeader className="bg-white border-b border-slate-200 sticky top-0 z-20">
              <TableRow className="bg-white hover:bg-transparent border-0">
                {columns.map((col, idx) => (
                  <TableHead
                    key={col.id || (typeof col.header === 'string' ? col.header : idx)}
                    style={{ minWidth: col.minWidth, width: col.width }}
                    className={cn(
                      "h-12 font-medium text-slate-400 text-[14px] tracking-tight whitespace-nowrap px-3 py-3",
                      col.className
                    )}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading || (data.length === 0 && !showEmpty) ? (
                Array.from({ length: pageSize }).map((_, rowIndex) => (
                  <TableRow
                    key={`skeleton-row-${rowIndex}`}
                    className="border-b border-slate-200 last:border-0"
                  >
                    {columns.map((_, colIndex) => (
                      <TableCell
                        key={`skeleton-cell-${colIndex}`}
                        className="px-3 py-5"
                      >
                        <Skeleton className="h-4 w-full max-w-[120px] rounded bg-slate-100" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : showEmpty && data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-32 text-center text-slate-400 text-sm font-medium"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center">
                        <MoreHorizontal className="h-8 w-8 opacity-20" />
                      </div>
                      {emptyMessage}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item, rowIndex) => (
                  <TableRow
                    key={item._id || item.id || `row-${rowIndex}`}
                    className={cn(
                      "border-b border-slate-200 last:border-0 transition-all hover:bg-slate-100",
                      rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50",
                      onRowClick && "cursor-pointer"
                    )}
                    onClick={() => onRowClick?.(item)}
                  >
                    {columns.map((col, idx) => (
                      <TableCell
                        key={col.id || (typeof col.header === 'string' ? col.header : idx)}
                        style={{ minWidth: col.minWidth, width: col.width }}
                        className={cn(
                          "text-[14px] px-3 py-4 font-medium text-[#333]",
                          col.className
                        )}
                      >
                        {typeof col.accessorKey === "function"
                          ? col.accessorKey(item)
                          : (item[col.accessorKey] as React.ReactNode)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </table>
        </div>

        {/* ── Mobile Grid (Card) View ── */}
        <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
          {isLoading || (data.length === 0 && !showEmpty) ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={`mobile-skeleton-${i}`} className="p-3.5 space-y-3 border-slate-100">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-1/3 bg-slate-50" />
                  <Skeleton className="h-3 w-1/4 bg-slate-50" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-1/4 bg-slate-50" />
                  <Skeleton className="h-3 w-1/2 bg-slate-50" />
                </div>
                <Skeleton className="h-8 w-full bg-slate-50 rounded-lg" />
              </Card>
            ))
          ) : showEmpty && data.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-sm font-medium">
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center">
                  <MoreHorizontal className="h-8 w-8 opacity-20" />
                </div>
                {emptyMessage}
              </div>
            </div>
          ) : (
            paginatedData.map((item, rowIndex) => (
              <Card
                key={item._id || item.id || `card-${rowIndex}`}
                className={`p-3.5 space-y-1.5 border-slate-100 shadow-sm active:scale-[0.98] transition-transform ${onRowClick ? "cursor-pointer" : ""}`}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-4 border-b border-slate-100/50 pb-1.5 last:border-0 last:pb-0">
                    <span className="text-[11px] font-bold text-slate-400 tracking-widest pt-1">{col.header}</span>
                    <div className="text-[14.5px] font-semibold text-[#1a1a1a] text-right break-words max-w-[65%]">
                      {typeof col.accessorKey === "function"
                        ? col.accessorKey(item)
                        : (item[col.accessorKey] as React.ReactNode)}
                    </div>
                  </div>
                ))}
              </Card>
            ))
          )}
        </div>

        {/* ── Pagination ── */}
        {data.length > 0 && (
          <div
            className="border-t border-slate-100 px-5 py-4 bg-white
            flex flex-col sm:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-1 order-2 sm:order-1 text-slate-500 font-medium text-[13px]">
              <span>Showing page</span>
              <span className="text-slate-900 font-bold">{currentPage}</span>
              <span>of</span>
              <span className="text-slate-900 font-bold">{totalPages}</span>
              <span className="mx-1">·</span>
              <span className="text-slate-900 font-bold">{totalCount}</span>
              <span>records</span>
            </div>

            <Pagination className="mx-0 w-auto order-1 sm:order-2">
              <PaginationContent className="gap-2">
                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 rounded-lg border border-slate-100 bg-white shadow-sm hover:bg-slate-50 disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </PaginationItem>

                <div className="flex items-center gap-1.5">
                  {pageRange.map((page, idx) =>
                    page === "..." ? (
                      <div key={`ellipsis-${idx}`} className="h-8 w-8 flex items-center justify-center text-slate-300">
                        <MoreHorizontal className="h-3 w-3" />
                      </div>
                    ) : (
                      <PaginationItem key={page}>
                        <Button
                          variant={currentPage === page ? "default" : "ghost"}
                          onClick={() => handlePageChange(page)}
                          className={`h-8 w-8 p-0 rounded-lg text-[13px] font-bold transition-all
                            ${currentPage === page
                              ? "gradient-primary text-white border-0 shadow-sm shadow-primary/20 scale-105"
                              : "bg-white border border-slate-100 text-slate-500 hover:bg-slate-50"
                            }`}
                        >
                          {page}
                        </Button>
                      </PaginationItem>
                    ),
                  )}
                </div>

                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 rounded-lg border border-slate-100 bg-white shadow-sm hover:bg-slate-50 disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Card>
    </div>
  );
}
