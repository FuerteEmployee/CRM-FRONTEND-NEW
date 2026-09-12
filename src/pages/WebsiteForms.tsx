import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { externalDataSourceService } from "@/api/services/externalDataSource.service";
import { DataTable } from "@/components/shared/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { FormInput, AlertTriangle } from "lucide-react";

// Turns a raw API field name into a readable column header automatically —
// the API only ever returns submitted values, never the form's own label
// text, so this is the closest fully-automatic approximation of that.
const ACRONYMS: Record<string, string> = { Url: "URL", Id: "ID", Api: "API", Dob: "DOB" };
function humanizeFieldName(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/);
  return words
    .map((w) => {
      const titled = w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      return ACRONYMS[titled] || titled;
    })
    .join(" ");
}

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

  // Database housekeeping fields, not something anyone typed into the form —
  // hidden regardless of which form's API is selected, since any Mongo-backed
  // form API tends to return the same handful of internal fields.
  const HIDDEN_FIELD_NAMES = new Set(["_id", "__v", "createdAt", "updatedAt"]);

  // Column keys come straight from whatever field names the form's own API
  // returns — nothing dropped from real form data. Derived from every row
  // (not just the first) so a field only present on some submissions still
  // gets its own column instead of silently disappearing.
  const allFieldNames: string[] = [];
  const seenFieldNames = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!seenFieldNames.has(key) && !HIDDEN_FIELD_NAMES.has(key)) {
        seenFieldNames.add(key);
        allFieldNames.push(key);
      }
    });
  });

  const dataColumns = allFieldNames.map((key) => ({
    key,
    label: humanizeFieldName(key),
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
  }));

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
