import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { externalDataSourceService } from "@/api/services/externalDataSource.service";
import { DataTable } from "@/components/shared/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { FormInput, AlertTriangle, Pencil, Loader2 } from "lucide-react";

// Turns a raw API field name into a readable column header automatically —
// no admin has to type anything for this to look reasonable. The API only
// ever returns submitted values, never the form's own label text, so an
// exact match to custom wording like "Position Applied For" isn't something
// that can be fetched; this is the closest fully-automatic approximation.
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
  const queryClient = useQueryClient();
  const [selectedFormId, setSelectedFormId] = useState<string>("");
  const [isLabelDialogOpen, setIsLabelDialogOpen] = useState(false);
  const [labelDrafts, setLabelDrafts] = useState<Record<string, string>>({});

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
  const fieldLabels: Record<string, string> = selectedForm?.field_labels || {};

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
  // gets its own column instead of silently disappearing. The DISPLAYED
  // label defaults to that same raw key, but an admin can override it per
  // field (below) to match their form's own wording — e.g. "post" ->
  // "Position Applied For".
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
    label: fieldLabels[key] || humanizeFieldName(key),
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

  const openLabelDialog = () => {
    const drafts: Record<string, string> = {};
    allFieldNames.forEach((key) => {
      drafts[key] = fieldLabels[key] || humanizeFieldName(key);
    });
    setLabelDrafts(drafts);
    setIsLabelDialogOpen(true);
  };

  const saveLabelsMutation = useMutation({
    mutationFn: (field_labels: Record<string, string>) =>
      externalDataSourceService.update(selectedFormId, { field_labels }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-data-sources"] });
      toast.success("Column labels updated");
      setIsLabelDialogOpen(false);
    },
    onError: (error: any) => toast.error(error.message || "Failed to save column labels"),
  });

  const handleSaveLabels = () => {
    // Blank input means "just use the raw field name" — no point persisting
    // a label that's identical to the key it'd fall back to anyway.
    const cleaned: Record<string, string> = {};
    allFieldNames.forEach((key) => {
      const val = (labelDrafts[key] || "").trim();
      if (val && val !== humanizeFieldName(key)) cleaned[key] = val;
    });
    saveLabelsMutation.mutate(cleaned);
  };

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
              toolbarActions={
                allFieldNames.length > 0 ? (
                  <Button variant="outline" size="sm" className="gap-2 h-11 rounded-xl" onClick={openLabelDialog}>
                    <Pencil className="h-3.5 w-3.5" /> Edit Column Labels
                  </Button>
                ) : undefined
              }
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isLabelDialogOpen} onOpenChange={setIsLabelDialogOpen}>
        <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-muted/30">
            <DialogTitle>Edit Column Labels</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            <p className="text-xs text-muted-foreground -mt-1">
              Column labels are generated automatically from each field's name — nothing here is required. Only change one if the auto-generated wording isn't what you want.
            </p>
            {allFieldNames.map((key) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs font-mono text-muted-foreground">{key}</Label>
                <Input
                  value={labelDrafts[key] ?? ""}
                  onChange={(e) => setLabelDrafts((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={humanizeFieldName(key)}
                  className="h-10"
                />
              </div>
            ))}
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-muted/30">
            <Button variant="outline" onClick={() => setIsLabelDialogOpen(false)} disabled={saveLabelsMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSaveLabels} disabled={saveLabelsMutation.isPending}>
              {saveLabelsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Labels
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
