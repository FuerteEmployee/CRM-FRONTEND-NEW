import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";

import { leadService } from "@/api/services/lead.service";
import { customerService } from "@/api/services/customer.service";

import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface Props {
  kind: "leads" | "customers";
  selected: string[];
  onChange: (ids: string[]) => void;
}

const PAGE_SIZE = 50;

// Searchable, paged checklist of the tenant's leads or customers. Selection
// is kept as ids across searches/pages so the campaign stores exactly who
// was ticked.
export function AudiencePicker({ kind, selected, onChange }: Props) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isFetching } = useQuery({
    queryKey: ["wa-audience-picker", kind, debounced, page],
    queryFn: () => {
      const params = { page, limit: PAGE_SIZE, search: debounced };
      return kind === "leads" ? leadService.getAll(params) : customerService.getAll(params);
    },
  });

  const rows: any[] = data?.data || [];
  const total: number = data?.total || 0;
  const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const selectedSet = new Set(selected);

  const labelOf = (r: any) =>
    kind === "leads" ? r.name || r.company || "Lead" : r.contact_person ? `${r.contact_person} (${r.company})` : r.company;

  const toggle = (id: string) =>
    onChange(selectedSet.has(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  const withPhone = rows.filter((r) => String(r.phonenumber || "").replace(/\D/g, "").length >= 10);
  const allOnPageSelected = withPhone.length > 0 && withPhone.every((r) => selectedSet.has(r._id));
  const togglePage = () => {
    const ids = withPhone.map((r) => r._id);
    onChange(allOnPageSelected ? selected.filter((s) => !ids.includes(s)) : Array.from(new Set([...selected, ...ids])));
  };

  return (
    <div className="border rounded-md">
      <div className="flex items-center gap-2 p-2 border-b">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={kind === "leads" ? "Search leads by name, phone, company…" : "Search customers…"}
          className="h-8 border-0 shadow-none focus-visible:ring-0"
        />
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="flex items-center justify-between px-3 py-1.5 text-xs text-muted-foreground border-b">
        <button type="button" className="hover:underline" onClick={togglePage} disabled={withPhone.length === 0}>
          {allOnPageSelected ? "Unselect this page" : "Select this page"}
        </button>
        <span>
          <strong className="text-foreground">{selected.length}</strong> selected
          {selected.length > 0 && (
            <button type="button" className="ml-2 hover:underline" onClick={() => onChange([])}>
              Clear
            </button>
          )}
        </span>
      </div>

      <div className="max-h-56 overflow-y-auto">
        {rows.length === 0 && !isFetching && (
          <p className="text-sm text-muted-foreground text-center py-6">No {kind} found</p>
        )}
        {rows.map((r) => {
          const hasPhone = String(r.phonenumber || "").replace(/\D/g, "").length >= 10;
          return (
            <label
              key={r._id}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm ${hasPhone ? "cursor-pointer hover:bg-muted/50" : "opacity-50"}`}
            >
              <Checkbox checked={selectedSet.has(r._id)} disabled={!hasPhone} onCheckedChange={() => hasPhone && toggle(r._id)} />
              <span className="flex-1 truncate">{labelOf(r)}</span>
              <span className="text-xs text-muted-foreground">{hasPhone ? r.phonenumber : "no phone"}</span>
            </label>
          );
        })}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between px-3 py-1.5 border-t text-xs text-muted-foreground">
          <Button type="button" variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Prev
          </Button>
          <span>
            Page {page} / {pages} · {total} {kind}
          </span>
          <Button type="button" variant="ghost" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
