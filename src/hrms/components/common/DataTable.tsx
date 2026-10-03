import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableEmpty,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
} from "@/hrms/components/ui/table";
import { Card } from "@/hrms/components/ui/card";
import { Skeleton } from "@/hrms/components/ui/skeleton";
import { useState, useMemo, useEffect, useRef } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/hrms/lib/utils";

export interface Column<T> {
  id?: string;
  minWidth?: number;
  width?: number;
  header: string | React.ReactNode;
  accessorKey: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

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

// Renders with the app-wide table design (same as Setup → Staff / the shared
// DataTable): TableContainer card, muted uppercase header, column dividers,
// "No records found." empty row and the standard TablePagination footer.
export function DataTable<T extends { id?: string | number; _id?: string | number }>({
  data,
  columns,
  pageSize: defaultPageSize = 10,
  onRowClick,
  emptyMessage = "No records found.",
  isLoading = false,
  totalItems,
  onPageChange,
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

  const renderValue = (item: T, col: Column<T>) =>
    typeof col.accessorKey === "function"
      ? col.accessorKey(item)
      : (item[col.accessorKey] as React.ReactNode);

  const colKey = (col: Column<T>, idx: number) =>
    col.id || (typeof col.header === "string" ? col.header : idx);

  const showSkeleton = isLoading || (data.length === 0 && !showEmpty);
  const isEmpty = showEmpty && data.length === 0;

  return (
    <div className="space-y-4">
      <TableContainer>
        {/* ── Desktop Table View ── */}
        <Table wrapperClassName="custom-scrollbar hidden md:block">
          <TableHeader>
            <TableRow>
              {columns.map((col, idx) => (
                <TableHead
                  key={colKey(col, idx)}
                  style={{ minWidth: col.minWidth, width: col.width }}
                  className={col.className}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {showSkeleton ? (
              Array.from({ length: pageSize }).map((_, rowIndex) => (
                <TableRow key={`skeleton-row-${rowIndex}`}>
                  {columns.map((_, colIndex) => (
                    <TableCell key={`skeleton-cell-${colIndex}`}>
                      <Skeleton className="h-4 w-full max-w-[120px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isEmpty ? (
              <TableEmpty colSpan={columns.length}>{emptyMessage}</TableEmpty>
            ) : (
              paginatedData.map((item, rowIndex) => (
                <TableRow
                  key={item._id || item.id || `row-${rowIndex}`}
                  // bg-card keeps sticky (bg-inherit) action columns opaque
                  className={cn("bg-card", onRowClick && "cursor-pointer")}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col, idx) => (
                    <TableCell
                      key={colKey(col, idx)}
                      style={{ minWidth: col.minWidth, width: col.width }}
                      className={col.className}
                    >
                      {renderValue(item, col)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* ── Mobile Grid (Card) View ── */}
        <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
          {showSkeleton ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={`mobile-skeleton-${i}`} className="p-3.5 space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-1/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-full rounded-lg" />
              </Card>
            ))
          ) : isEmpty ? (
            <div className="py-16 text-center text-muted-foreground italic text-sm">
              <div className="flex flex-col items-center gap-4">
                <MoreHorizontal className="h-8 w-8 opacity-20" />
                {emptyMessage}
              </div>
            </div>
          ) : (
            paginatedData.map((item, rowIndex) => (
              <Card
                key={item._id || item.id || `card-${rowIndex}`}
                className={cn(
                  "p-3.5 space-y-1.5 shadow-sm active:scale-[0.98] transition-transform",
                  onRowClick && "cursor-pointer",
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-4 border-b pb-1.5 last:border-0 last:pb-0">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pt-1">{col.header}</span>
                    <div className="text-sm font-medium text-foreground text-right break-words max-w-[65%]">
                      {renderValue(item, col)}
                    </div>
                  </div>
                ))}
              </Card>
            ))
          )}
        </div>

        {/* ── Pagination ── */}
        {data.length > 0 && (
          <TablePagination
            page={currentPage}
            pageSize={pageSize}
            total={totalCount}
            onPageChange={handlePageChange}
          />
        )}
      </TableContainer>
    </div>
  );
}
