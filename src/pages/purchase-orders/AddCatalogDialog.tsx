import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Loader2, Plus, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { purchaseOrderService } from "@/api/services/purchaseOrder.service";
import { formatInr } from "./poCalc";
import { ALREADY, NO_REFERENCE, NOT_IN_REFERENCE, parseCatalogPaste, RESULT_LABEL, type FindResult } from "./catalogAdd";

// Round 30 (S6): PO Items → "+ Add Catalog No.". Type (or paste several)
// catalog nos. / Y codes / obsolete catalogs → Find in the uploaded price list
// → Add to PO Items (series = its sheet, prices from the price list).
const STATUS_CLASS: Record<string, string> = {
  found: "bg-emerald-50 text-emerald-700",
  added: "bg-emerald-100 text-emerald-800",
  already: "bg-blue-50 text-blue-700",
  not_found: "bg-red-50 text-red-700",
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdded: () => void;
  onOpenItem: (code: string) => void;
  onAddByHand: (catalog: string) => void;
};

export const AddCatalogDialog = ({ open, onOpenChange, onAdded, onOpenItem, onAddByHand }: Props) => {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState<"" | "find" | "add">("");
  const [results, setResults] = useState<FindResult[] | null>(null);
  const [problem, setProblem] = useState("");
  const [reference, setReference] = useState<{ count: number; file_name: string } | null>(null);

  const parsed = parseCatalogPaste(text);
  const inputError = touched ? parsed.error : "";
  const found = (results || []).filter((r) => r.status === "found");

  const reset = () => {
    setText("");
    setTouched(false);
    setResults(null);
    setProblem("");
  };

  const fail = (err: any) => {
    const code = err?.response?.data?.code;
    setProblem(code === "no_reference" ? NO_REFERENCE : err.message);
    setResults(null);
  };

  const find = async () => {
    setTouched(true);
    if (parsed.error) return;
    setBusy("find");
    setProblem("");
    try {
      const res: any = await purchaseOrderService.findCatalogs(parsed.list.join("\n"));
      setResults(res.results);
      setReference(res.reference);
    } catch (err: any) {
      fail(err);
    } finally {
      setBusy("");
    }
  };

  const add = async (queries: string[]) => {
    if (!queries.length) return;
    setBusy("add");
    try {
      const res: any = await purchaseOrderService.addCatalogs(queries.join("\n"));
      const byQuery = new Map<string, FindResult>(res.results.map((r: FindResult) => [r.query.toLowerCase(), r]));
      setResults((prev) => (prev || []).map((r) => byQuery.get(r.query.toLowerCase()) || r));
      toast({
        title: res.added ? `Added ${res.added} PO item${res.added === 1 ? "" : "s"}` : "Nothing added",
        description: res.added ? res.results.filter((r: FindResult) => r.status === "added").map((r: FindResult) => `${r.item?.item_code} → series ${r.item?.category}`).slice(0, 5).join(", ") : "They are already in PO Items.",
      });
      if (res.added) onAdded();
    } catch (err: any) {
      if (err?.response?.data?.code === "no_reference") fail(err);
      else toast({ title: "Could not add", description: err.message, variant: "destructive" });
    } finally {
      setBusy("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto grid-cols-1">
        <DialogHeader>
          <DialogTitle>Add Catalog No. from the price list</DialogTitle>
          <DialogDescription>
            Find a catalog no. in the uploaded Brady price list and add it to PO Items with its series and prices.
            {reference && reference.count > 0 && <> The price list has {reference.count.toLocaleString("en-IN")} catalog nos.{reference.file_name ? ` (${reference.file_name})` : ""}.</>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 min-w-0">
          <Label htmlFor="po-add-catalog">Catalog No. *</Label>
          <Textarea id="po-add-catalog" rows={3} value={text} aria-invalid={!!inputError} placeholder={"M7-84-499\nM21-500-423, Y4900609"}
            onChange={(e) => { setText(e.target.value); setResults(null); setProblem(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) find(); }} />
          {inputError
            ? <p className="text-[11px] text-red-700" role="alert">{inputError}</p>
            : <p className="text-[11px] text-muted-foreground">Catalog no., Y code or an obsolete catalog no. Paste several — one per line or separated by commas (up to 200).</p>}
        </div>

        {problem && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" role="alert" data-testid="add-catalog-problem">
            {problem}{problem === NO_REFERENCE && <> — use <b>Upload items (Excel)</b> on PO Items. The whole file is kept as the price list.</>}
          </div>
        )}

        {results && (
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap gap-2 text-xs" data-testid="add-catalog-summary">
              <Badge variant="outline" className={STATUS_CLASS.found}>{found.length} found</Badge>
              <Badge variant="outline" className={STATUS_CLASS.already}>{results.filter((r) => r.status === "already" || r.status === "added").length} in PO Items</Badge>
              <Badge variant="outline" className={STATUS_CLASS.not_found}>{results.filter((r) => r.status === "not_found").length} not in the price list</Badge>
            </div>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Typed</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Series (sheet)</TableHead>
                    <TableHead>Y code</TableHead>
                    <TableHead className="text-right">MDP</TableHead>
                    <TableHead className="text-right">DP</TableHead>
                    <TableHead className="text-right">EP</TableHead>
                    <TableHead>Lead time</TableHead>
                    <TableHead className="text-right"><span className="sr-only">Action</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.query} data-testid={`add-catalog-row-${r.query}`}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{r.query}</TableCell>
                      <TableCell className="text-xs min-w-[180px]">
                        <Badge variant="outline" className={STATUS_CLASS[r.status]}>{r.status === "already" ? ALREADY : r.status === "not_found" ? NOT_IN_REFERENCE : RESULT_LABEL[r.status]}</Badge>
                        {r.entry?.item_code && r.entry.item_code.toLowerCase() !== r.query.toLowerCase() && <div className="mt-0.5 font-mono">{r.entry.item_code}</div>}
                        {r.note && <div className="mt-0.5 text-[11px] text-muted-foreground">{r.note}</div>}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.entry?.category || r.item?.category || "—"}
                        {r.entry?.price_sheet && r.entry.price_sheet !== r.entry.category && <div className="text-[10px] text-muted-foreground">Price from sheet: {r.entry.price_sheet}</div>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.entry?.y_code || "—"}</TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap">{r.entry ? formatInr(r.entry.master_price) : "—"}</TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap">{r.entry ? formatInr(r.entry.distributor_price) : "—"}</TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap">{r.entry ? formatInr(r.entry.end_customer_price) : "—"}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{r.entry?.lead_time || "—"}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {r.status === "found" && (
                          <Button size="sm" className="h-7 gap-1" disabled={!!busy} onClick={() => add([r.query])} aria-label={`Add ${r.entry?.item_code || r.query} to PO Items`}>
                            <Plus className="h-3.5 w-3.5" /> Add to PO Items
                          </Button>
                        )}
                        {(r.status === "already" || r.status === "added") && r.item && (
                          <Button size="sm" variant="link" className="h-7 px-1" onClick={() => { onOpenItem(r.item!.item_code || r.item!.name); reset(); onOpenChange(false); }}>
                            Open {r.item.item_code || r.item.name}
                          </Button>
                        )}
                        {r.status === "not_found" && (
                          <Button size="sm" variant="outline" className="h-7" onClick={() => { onAddByHand(r.query); reset(); onOpenChange(false); }}>
                            Add by hand
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Close</Button>
          {found.length > 1 && (
            <Button variant="outline" className="gap-1" disabled={!!busy} onClick={() => add(found.map((r) => r.query))}>
              {busy === "add" && <Loader2 className="h-4 w-4 animate-spin" />} Add all found ({found.length})
            </Button>
          )}
          <Button className="gap-1" disabled={!!busy} onClick={find}>
            {busy === "find" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Find
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
