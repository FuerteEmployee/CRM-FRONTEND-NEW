import { useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ArrowDown, ArrowUp, CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { purchaseOrderService } from "@/api/services/purchaseOrder.service";
import { formatInr } from "./poCalc";
import { readPriceListFile, type SheetRows } from "./priceListFile";
import { cleanSeriesName, reuseSeries, seriesFromSheet, seriesNameError } from "./poValidation";
import { firstSheetOnly, newUploadId, referenceBatches } from "./catalogAdd";

// R3: "Upload items (Excel)" for the real Brady price list — every sheet, its
// own headers. Steps: choose file -> sheets (counts, skip reasons) -> column
// mapping per sheet (skipped when every sheet's layout was saved before) ->
// preview (new / updated / unchanged / errors, duplicates across sheets with
// both prices, sheet priority) -> import in batches with progress -> summary.
// Round 30 (S6): only the FIRST item sheet is ticked by default; the whole
// file (every readable sheet) is kept as the reference price list after the
// import, for "+ Add Catalog No." and the PO editor's picker.

type Step = "file" | "sheets" | "mapping" | "preview" | "importing" | "done";
type Column = { index: number; header: string; field: string; auto_field: string; sample: string[] };
// series (round 29, S1): the sheet's series — the sheet name by default; can be
// renamed or pointed at an existing series in the mapping step.
type ScannedSheet = { index: number; name: string; header_row: number; columns: Column[]; signature: string; remembered: boolean; item_rows: number; skip_reason: string; series?: string };
type SheetState = ScannedSheet & { include: boolean; fields: string[]; series: string };

const BATCH = 1000;
const FIELD_HELP: Record<string, string> = { attribute: "kept as an extra detail of the item", ignore: "not imported" };

export const PriceListImportDialog = ({ onDone, existingSeries = [] }: { onDone: () => void; existingSeries?: string[] }) => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("file");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [raw, setRaw] = useState<SheetRows[]>([]);
  const [sheets, setSheets] = useState<SheetState[]>([]);
  const [fieldOptions, setFieldOptions] = useState<{ value: string; label: string }[]>([]);
  const [mapSheet, setMapSheet] = useState("");
  const [priority, setPriority] = useState<string[]>([]);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<any>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<any>(null);
  const [remembered, setRemembered] = useState(false);

  const reset = () => {
    setStep("file");
    setError("");
    setFileName("");
    setRaw([]);
    setSheets([]);
    setPreview(null);
    setChoices({});
    setSummary(null);
    setProgress({ done: 0, total: 0 });
    if (fileRef.current) fileRef.current.value = "";
  };

  const included = sheets.filter((s) => s.include && !s.skip_reason);
  const seriesErrors = Object.fromEntries(included.map((s) => [s.name, seriesNameError(s.series)]));
  const hasSeriesError = Object.values(seriesErrors).some(Boolean);
  // What a sheet's series will be called (an existing series in any case is reused).
  const finalSeries = (s: SheetState) => reuseSeries(cleanSeriesName(s.series), existingSeries);
  const fieldLabel = (f: string) => fieldOptions.find((o) => o.value === f)?.label || f;

  const runPreview = async (state = sheets, prio = priority, ch = choices) => {
    setBusy(true);
    setError("");
    try {
      const body = {
        sheets: raw.map((r) => {
          const s = state.find((x) => x.name === r.name);
          return { name: r.name, rows: r.rows, include: !!s?.include && !s?.skip_reason, header_row: s?.header_row ?? -1, fields: s?.fields, series: s ? cleanSeriesName(s.series) : undefined };
        }),
        priority: prio,
        choices: ch,
      };
      const res: any = await purchaseOrderService.previewPriceList(body);
      setPreview(res);
      setPriority(res.priority);
      setStep("preview");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file?: File | null) => {
    if (!file) return;
    reset();
    setFileName(file.name);
    setBusy(true);
    try {
      const rows = await readPriceListFile(file);
      setRaw(rows);
      const res: any = await purchaseOrderService.scanPriceList(rows);
      const state: SheetState[] = firstSheetOnly(res.sheets as ScannedSheet[]).map((s) => ({ ...s, fields: s.columns.map((c) => c.field), series: s.series || seriesFromSheet(s.name) }));
      setSheets(state);
      setFieldOptions(res.fields);
      setPriority(res.priority);
      setMapSheet(state.find((s) => !s.skip_reason)?.name || "");
      setRemembered(!!res.all_remembered);
      if (res.all_remembered) {
        // The same layout was imported before: one click — straight to the preview.
        const body = rows;
        setRaw(body);
        await (async () => {
          setBusy(true);
          const pv: any = await purchaseOrderService.previewPriceList({
            sheets: body.map((r) => {
              const s = state.find((x) => x.name === r.name)!;
              return { name: r.name, rows: r.rows, include: s.include, header_row: s.header_row, fields: s.fields, series: s.series };
            }),
            priority: res.priority,
          });
          setPreview(pv);
          setPriority(pv.priority);
          setStep("preview");
        })();
      } else {
        setStep("sheets");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const setField = (sheet: string, col: number, field: string) =>
    setSheets((prev) => prev.map((s) => (s.name === sheet ? { ...s, fields: s.fields.map((f, i) => (i === col ? field : f)) } : s)));

  const movePriority = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= priority.length) return;
    const next = [...priority];
    [next[i], next[j]] = [next[j], next[i]];
    setPriority(next);
  };

  // Batches of 1000; the last batch also saves the replacement links and the
  // confirmed column mappings (so the next upload of this layout is one click).
  const runImport = async () => {
    const records: any[] = preview?.records || [];
    const mappings = included.map((s) => ({ signature: s.signature, sheet_name: s.name, fields: s.fields }));
    const batches = Math.max(Math.ceil(records.length / BATCH), 1);
    const refParts = referenceBatches(preview?.reference || []);
    setStep("importing");
    setProgress({ done: 0, total: batches + refParts.length });
    const total = { created: 0, updated: 0, unchanged: 0, errors: [] as any[], reference: 0, referenceError: "" };
    try {
      for (let b = 0; b < batches; b++) {
        const last = b === batches - 1;
        const res: any = await purchaseOrderService.importPriceList({
          records: records.slice(b * BATCH, (b + 1) * BATCH),
          ...(last ? { links: preview.links, mappings } : {}),
        });
        total.created += res.created;
        total.updated += res.updated;
        total.unchanged += res.unchanged;
        total.errors.push(...(res.errors || []));
        setProgress({ done: b + 1, total: batches + refParts.length });
      }
      // S6: then the whole price list as the reference (replaced as a whole).
      if ((preview?.reference || []).length) {
        const uploadId = newUploadId();
        try {
          for (let p = 0; p < refParts.length; p++) {
            const done = p === refParts.length - 1;
            const res: any = await purchaseOrderService.saveReference({ upload_id: uploadId, entries: refParts[p], done, file_name: fileName });
            if (done) total.reference = res.count;
            setProgress({ done: batches + p + 1, total: batches + refParts.length });
          }
        } catch (err: any) {
          total.referenceError = err.message;
        }
      }
      setSummary({ ...total, previewErrors: preview.summary.errors, unchangedBefore: preview.summary.unchanged, skipped: sheets.filter((s) => s.skip_reason || !s.include) });
      setStep("done");
      onDone();
    } catch (err: any) {
      toast({ title: "Import stopped", description: `${err.message} — batches already saved stay saved; upload again to finish.`, variant: "destructive" });
      setStep("preview");
    }
  };

  const mapping = sheets.find((s) => s.name === mapSheet);
  const dupRows = useMemo(() => (preview?.duplicates || []).slice(0, 300), [preview]);

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => { reset(); setOpen(true); }}>
        <Upload className="h-4 w-4" /> Upload items (Excel)
      </Button>
      <Dialog open={open} onOpenChange={(o) => { if (step !== "importing") setOpen(o); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto grid-cols-1">
          <DialogHeader>
            <DialogTitle>Upload the price list (Excel)</DialogTitle>
            <DialogDescription>
              Every sheet of the Brady price list is read with its own column titles. Items are matched by Catalog No. (else Y code). Nothing is saved until you press Import.
            </DialogDescription>
          </DialogHeader>

          {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

          {step === "file" && (
            <div className="space-y-3">
              <Label htmlFor="po-pricelist-file">Excel file (.xlsx or .xls, up to 15 MB)</Label>
              <input id="po-pricelist-file" ref={fileRef} type="file" accept=".xlsx,.xls,.xlsm" className="block w-full text-sm"
                onChange={(e) => onFile(e.target.files?.[0])} />
              {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Reading {fileName}…</div>}
            </div>
          )}

          {step === "sheets" && (
            <div className="space-y-3 min-w-0">
              <p className="text-sm"><FileSpreadsheet className="inline h-4 w-4 mr-1" />{fileName} — choose the sheets to import.</p>
              <p className="text-xs text-muted-foreground">
                Only the first sheet is ticked. Tick more to import them as PO items too — the whole file is kept as the price list either way, so any other catalog no. can be added later from the PO form's item picker (<b>Add … from the price list</b>).
              </p>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">Import</TableHead>
                      <TableHead>Sheet</TableHead>
                      <TableHead>Series</TableHead>
                      <TableHead className="text-right">Item rows</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sheets.map((s) => (
                      <TableRow key={s.name} className={s.skip_reason ? "opacity-70" : ""}>
                        <TableCell>
                          <Checkbox aria-label={`Import sheet ${s.name}`} checked={s.include} disabled={!!s.skip_reason}
                            onCheckedChange={(on) => setSheets((prev) => prev.map((x) => (x.name === s.name ? { ...x, include: !!on } : x)))} />
                        </TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-xs">{s.skip_reason ? "—" : finalSeries(s)}</TableCell>
                        <TableCell className="text-right">{s.item_rows}</TableCell>
                        <TableCell className="text-xs">
                          {s.skip_reason
                            ? <span className="text-amber-700">Skipped: {s.skip_reason}</span>
                            : s.remembered
                              ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Saved mapping</Badge>
                              : <Badge variant="outline" className="bg-blue-50 text-blue-700">Check columns</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {step === "mapping" && mapping && (
            <div className="space-y-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Label>Sheet</Label>
                <Select value={mapSheet} onValueChange={setMapSheet}>
                  <SelectTrigger className="w-[280px]" aria-label="Sheet to map"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {included.map((s) => <SelectItem key={s.name} value={s.name}>{s.name}{s.remembered ? " (saved)" : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">Header found on row {mapping.header_row + 1}. Change a column's field if it was guessed wrong.</span>
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <Label htmlFor="po-import-series" className="pt-2">Series name *</Label>
                <div className="space-y-1">
                  <Input id="po-import-series" list="po-import-series-list" className="w-[280px]" maxLength={40} value={mapping.series}
                    aria-invalid={!!seriesErrors[mapping.name]}
                    onChange={(e) => setSheets((prev) => prev.map((x) => (x.name === mapping.name ? { ...x, series: e.target.value } : x)))} />
                  <datalist id="po-import-series-list">
                    {existingSeries.map((s) => <option key={s} value={s} />)}
                  </datalist>
                  {seriesErrors[mapping.name]
                    ? <p className="text-[11px] text-red-700">{seriesErrors[mapping.name]}</p>
                    : <p className="text-[11px] text-muted-foreground">
                        Items of this sheet go to series <b>{finalSeries(mapping)}</b>{existingSeries.includes(finalSeries(mapping)) ? " (existing series)" : " (new series)"}. Type another name or pick an existing series.
                      </p>}
                </div>
              </div>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column in the sheet</TableHead>
                      <TableHead>Sample values</TableHead>
                      <TableHead className="min-w-[230px]">Imported as</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mapping.columns.map((c) => (
                      <TableRow key={c.index}>
                        <TableCell className="font-medium text-sm">{c.header}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">{c.sample.join(" · ")}</TableCell>
                        <TableCell>
                          <Select value={mapping.fields[c.index]} onValueChange={(v) => setField(mapping.name, c.index, v)}>
                            <SelectTrigger className="h-8" aria-label={`Field for column ${c.header}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {fieldOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {FIELD_HELP[mapping.fields[c.index]] && <div className="text-[10px] text-muted-foreground mt-0.5">{FIELD_HELP[mapping.fields[c.index]]}</div>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {step === "preview" && preview && (
            <div className="space-y-4 min-w-0">
              {remembered && (
                <p className="text-xs text-emerald-700 flex items-center gap-1 flex-wrap">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Saved column mapping used for every sheet.
                  <button type="button" className="underline ml-1" onClick={() => setStep("mapping")}>Change mapping</button>
                  <button type="button" className="underline ml-1" onClick={() => setStep("sheets")}>Choose sheets</button>
                </p>
              )}
              <p className="text-xs text-muted-foreground" data-testid="pl-import-scope">
                Importing as PO items: <b>{included.map((s) => s.name).join(", ") || "no sheet"}</b>.{" "}
                The whole file ({preview.summary.reference ?? 0} catalog nos. from {preview.summary.reference_sheets ?? 0} sheets) is kept as the price list for the item picker
              </p>
              <div className="flex gap-2 flex-wrap text-xs">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700">{preview.summary.new} new</Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">{preview.summary.update} updated</Badge>
                <Badge variant="outline">{preview.summary.unchanged} unchanged</Badge>
                <Badge variant="outline" className="bg-red-50 text-red-700">{preview.summary.errors} errors (skipped)</Badge>
                <Badge variant="outline" className="bg-amber-50 text-amber-700">{preview.summary.duplicates} on more than one sheet</Badge>
                <Badge variant="outline">{preview.summary.skipped_sheets} sheets skipped</Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-semibold">Sheet priority</div>
                  <p className="text-[11px] text-muted-foreground">When a catalog is on more than one sheet, the sheet higher in this list wins (unless you pick one on the right).</p>
                  <div className="rounded-md border divide-y max-h-72 overflow-y-auto">
                    {priority.map((name, i) => (
                      <div key={name} className="flex items-center gap-1 px-2 py-1 text-xs">
                        <span className="w-5 text-muted-foreground">{i + 1}.</span>
                        <span className="flex-1 truncate" title={name}>{name}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" aria-label={`Move ${name} up`} disabled={i === 0} onClick={() => movePriority(i, -1)}><ArrowUp className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" aria-label={`Move ${name} down`} disabled={i === priority.length - 1} onClick={() => movePriority(i, 1)}><ArrowDown className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => runPreview()}>
                    {busy && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />} Update preview
                  </Button>
                </div>

                <div className="space-y-2 min-w-0">
                  <div className="text-sm font-semibold">Same catalog on more than one sheet</div>
                  <div className="rounded-md border overflow-x-auto max-h-72 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Catalog</TableHead>
                          <TableHead>Use the price from</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dupRows.length === 0 ? (
                          <TableRow><TableCell colSpan={2} className="text-xs text-muted-foreground">None.</TableCell></TableRow>
                        ) : dupRows.map((d: any) => (
                          <TableRow key={d.key}>
                            <TableCell className="font-mono text-xs">{d.catalog}</TableCell>
                            <TableCell className="text-xs space-y-1">
                              {d.options.map((o: any) => (
                                <label key={o.sheet} className="flex items-center gap-2 cursor-pointer">
                                  <input type="radio" name={`dup-${d.key}`} checked={(choices[d.key] || d.chosen) === o.sheet}
                                    onChange={() => {
                                      const next = { ...choices, [d.key]: o.sheet };
                                      setChoices(next);
                                      runPreview(sheets, priority, next);
                                    }} />
                                  <span className="font-medium">{o.sheet}</span>
                                  <span className="text-muted-foreground">MDP {o.master_price ?? "—"} · DP {o.distributor_price ?? "—"} · EP {o.end_customer_price ?? "—"}</span>
                                </label>
                              ))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {preview.duplicates.length > dupRows.length && <p className="text-[11px] text-muted-foreground">Showing the first {dupRows.length} of {preview.duplicates.length}; the rest follow the sheet priority.</p>}
                </div>
              </div>

              {preview.errors.length > 0 && (
                <div className="space-y-1 min-w-0">
                  <div className="text-sm font-semibold text-red-700">Rows that will be skipped</div>
                  <div className="rounded-md border overflow-x-auto max-h-48 overflow-y-auto">
                    <Table>
                      <TableBody>
                        {preview.errors.slice(0, 200).map((e: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs whitespace-nowrap">{e.sheet} · row {e.row}</TableCell>
                            <TableCell className="text-xs font-mono">{e.catalog}</TableCell>
                            <TableCell className="text-xs text-red-700">{e.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
              {preview.records.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  e.g. {preview.records.slice(0, 3).map((r: any) => `${r.item_code || r.y_code}: MDP ${r.master_price !== undefined ? formatInr(r.master_price) : "—"}`).join(" · ")}
                </p>
              )}
            </div>
          )}

          {step === "importing" && (
            <div className="space-y-3 py-6">
              <div className="text-sm">Importing… batch {progress.done} of {progress.total}</div>
              <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} aria-label="Import progress" />
            </div>
          )}

          {step === "done" && summary && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold"><CheckCircle2 className="h-5 w-5" /> Price list imported</div>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-sm">
                {[["Imported now", summary.created + summary.updated], ["New", summary.created], ["Updated", summary.updated], ["Unchanged", summary.unchanged + summary.unchangedBefore], ["Errors (skipped)", summary.previewErrors + summary.errors.length], ["Kept in price list", summary.reference]].map(([k, v]) => (
                  <div key={String(k)} className="rounded-md border p-2"><div className="text-lg font-bold">{v}</div><div className="text-[11px] text-muted-foreground">{k}</div></div>
                ))}
              </div>
              {summary.referenceError && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                  The PO items were imported, but the price list (for the item picker) was not saved: {summary.referenceError}. Upload the file again to keep it.
                </div>
              )}
              {summary.skipped.length > 0 && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">{summary.skipped.length} sheet{summary.skipped.length === 1 ? "" : "s"} not imported as PO items (kept in the price list unless skipped)</summary>
                  <ul className="list-disc pl-5 mt-1">
                    {summary.skipped.map((s: SheetState) => <li key={s.name}>{s.name}: {s.skip_reason || "not selected"}</li>)}
                  </ul>
                </details>
              )}
              {summary.errors.length > 0 && (
                <ul className="text-xs text-red-700 list-disc pl-5">
                  {summary.errors.slice(0, 50).map((e: any, i: number) => <li key={i}>{e.sheet} row {e.row} {e.catalog}: {e.error}</li>)}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">The column mapping of these sheets is saved — the next upload of the same layout goes straight to the preview.</p>
            </div>
          )}

          <DialogFooter className="gap-2">
            {step !== "importing" && step !== "done" && <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>}
            {step === "sheets" && (
              <Button disabled={!included.length} onClick={() => setStep("mapping")}>Next: check columns</Button>
            )}
            {step === "mapping" && (
              <>
                <Button variant="outline" onClick={() => setStep("sheets")}>Back</Button>
                <Button disabled={busy || hasSeriesError} onClick={() => runPreview()}>{busy && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Next: preview</Button>
              </>
            )}
            {step === "preview" && preview && (
              <Button disabled={busy} onClick={runImport}>
                {preview.summary.new + preview.summary.update > 0 ? `Import ${preview.summary.new + preview.summary.update} items` : "Save price list"}
              </Button>
            )}
            {step === "done" && <Button onClick={() => setOpen(false)}>Close</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
