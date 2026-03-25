import { DataTablePage } from "@/components/shared/DataTablePage";

interface Column {
  key: string;
  label: string;
}

interface SetupPageLayoutProps {
  title: string;
  description?: string;
  addLabel?: string;
  columns: Column[];
  rows: Record<string, any>[];
  onAdd?: () => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  isLoading?: boolean;
}

export function SetupPageLayout({
  title,
  description,
  addLabel,
  columns,
  rows,
  onAdd,
  onEdit,
  onDelete,
  isLoading,
}: SetupPageLayoutProps) {
  return (
    <DataTablePage
      title={title}
      subtitle={description}
      addLabel={addLabel}
      onAdd={onAdd}
      columns={columns.map(col => ({
        key: col.key,
        label: col.label
      }))}
      data={rows}
      isLoading={isLoading}
      onEdit={onEdit}
      onDelete={onDelete}
      onRefresh={() => {}}
      showIdColumn={true}
    />
  );
}
