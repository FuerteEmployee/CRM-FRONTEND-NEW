import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { externalDataSourceService } from "@/api/services/externalDataSource.service";
import { DataTable } from "@/components/shared/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FormInput, AlertTriangle } from "lucide-react";

export default function WebsiteForms() {
  const [selectedFormId, setSelectedFormId] = useState<string>("");

  const { data: forms = [], isLoading: isFormsLoading } = useQuery({
    queryKey: ["external-data-sources"],
    queryFn: externalDataSourceService.getAll,
  });

  // Default to the first form once the list loads, same as Meta's Lead
  // Center — the tab strip should never sit with nothing selected.
  useEffect(() => {
    if (!selectedFormId && (forms as any[]).length > 0) {
      setSelectedFormId((forms as any[])[0]._id);
    }
  }, [forms, selectedFormId]);

  const selectedForm = (forms as any[]).find((f: any) => f._id === selectedFormId) || null;

  const { data: formDataResult, isFetching: isDataLoading } = useQuery({
    queryKey: ["website-form-data", selectedFormId],
    queryFn: () => externalDataSourceService.getData(selectedFormId),
    enabled: !!selectedFormId,
  });

  const rows: Record<string, any>[] = Array.isArray(formDataResult?.rows) ? formDataResult.rows : [];
  const isUrl = (val: any) => typeof val === "string" && /^https?:\/\//i.test(val);
  const dataColumns = rows.length > 0
    ? Object.keys(rows[0]).map((key) => ({
        key,
        label: key,
        render: (item: Record<string, any>) => {
          const val = item[key];
          if (isUrl(val)) {
            return (
              <a
                href={val}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:no-underline"
              >
                View
              </a>
            );
          }
          return val !== undefined && val !== null && val !== "" ? String(val) : "-";
        },
      }))
    : [];

  return (
    <DashboardLayout>
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <FormInput className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Website Forms</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Forms configured under Setup → Settings → Integrations → External APIs. To add, edit, or remove a form, use that page.
          </p>
        </CardHeader>

        <div className="border-b bg-muted/20 overflow-x-auto">
          {isFormsLoading ? (
            <div className="px-6 py-3 text-sm text-muted-foreground">Loading forms...</div>
          ) : (forms as any[]).length === 0 ? (
            <div className="px-6 py-3 text-sm text-muted-foreground italic">
              No forms configured yet. Add one under Setup → Settings → Integrations → External APIs.
            </div>
          ) : (
            <div className="flex items-center gap-1 px-3 min-w-max">
              {(forms as any[]).map((form: any) => (
                <button
                  key={form._id}
                  type="button"
                  onClick={() => setSelectedFormId(form._id)}
                  className={cn(
                    "shrink-0 whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                    selectedFormId === form._id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {form.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <CardContent className="p-6">
          {!selectedFormId ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm italic">
              Select a form above to view its submissions.
            </div>
          ) : formDataResult?.error ? (
            <div className="h-32 flex flex-col items-center justify-center gap-2 text-destructive text-sm">
              <AlertTriangle className="h-5 w-5" />
              {formDataResult.error}
            </div>
          ) : (
            <DataTable
              key={selectedFormId}
              columns={dataColumns}
              data={rows}
              isLoading={isDataLoading}
              showIdColumn
              searchPlaceholder="Search submissions..."
              exportFilename={selectedForm?.name?.replace(/\s+/g, "_") || "website_form"}
            />
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
