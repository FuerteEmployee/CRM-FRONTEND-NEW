import React from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DataTable, DataTableColumn } from "./DataTable";

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
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-muted-foreground text-sm">{subtitle}</p>
            )}
          </div>
          {onAdd && (
            <Button
              onClick={onAdd}
              className="rounded-xl font-black gap-2 shadow-lg shadow-primary/20 px-6 h-11 uppercase text-xs tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground flex items-center transition-all duration-300 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>
                {addLabel || `New ${title.slice(0, -1)}`}
              </span>
            </Button>
          )}
        </div>

        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          onEdit={onEdit}
          onDelete={onDelete}
          onRefresh={onRefresh}
          searchPlaceholder={searchPlaceholder}
          idField={idField}
          showIdColumn={showIdColumn}
          renderCustomActions={renderCustomActions}
        >
          {children}
        </DataTable>
      </div>
    </DashboardLayout>
  );
}
