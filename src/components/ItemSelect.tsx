import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { itemService } from "@/api/services/item.service";

export interface ItemRecord {
  _id: string;
  name: string;
  long_description?: string;
  rate?: number;
  unit?: string;
  hsn_sac_code?: string;
  cess_rate?: number;
  tax?: { _id: string; name: string; taxrate: number } | string | null;
  tax2?: { _id: string; name: string; taxrate: number } | string | null;
  group?: string;
}

interface ItemSelectProps {
  value?: string;
  onChange: (item: ItemRecord) => void;
  disabled?: boolean;
  placeholder?: string;
}

// Reused everywhere a Sales/Purchases line needs to pick a catalog item —
// fetched live from the tenant's own Items collection (each admin only ever
// sees their own tenant's items, per the existing tenant_id scoping on
// GET /items), never a hardcoded list.
export function gstRateFromItem(item: ItemRecord): number {
  const rate1 = typeof item.tax === "object" && item.tax ? item.tax.taxrate || 0 : 0;
  const rate2 = typeof item.tax2 === "object" && item.tax2 ? item.tax2.taxrate || 0 : 0;
  return rate1 + rate2;
}

const emptyNewItem = { name: "", rate: "", unit: "", hsn_sac_code: "" };

export function ItemSelect({ value, onChange, disabled, placeholder = "Select item..." }: ItemSelectProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newItem, setNewItem] = useState(emptyNewItem);
  const [creating, setCreating] = useState(false);

  const { data: items = [], isLoading } = useQuery<ItemRecord[]>({
    queryKey: ["items"],
    queryFn: async () => {
      const response = await itemService.getAll();
      return Array.isArray(response) ? response : response?.data || [];
    },
  });

  const selected = items.find((i) => i._id === value) || null;

  const handleCreateItem = async () => {
    if (!newItem.name.trim()) {
      toast({ title: "Error", description: "Item name is required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const created = await itemService.create({
        name: newItem.name,
        rate: Number(newItem.rate) || 0,
        unit: newItem.unit,
        hsn_sac_code: newItem.hsn_sac_code,
      });
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      onChange(created);
      setIsAddOpen(false);
      setNewItem(emptyNewItem);
      toast({ title: "Success", description: "Item created and selected" });
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="w-full justify-between h-11 rounded-xl border-slate-200 font-normal"
          >
            {selected ? selected.name : isLoading ? "Loading items..." : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command shouldFilter={true}>
            <CommandInput placeholder="Search by name, code, HSN/SAC..." />
            <CommandList>
              <CommandEmpty>No item found — you can still type this line as free text.</CommandEmpty>
              <CommandGroup>
                {items.map((it) => (
                  <CommandItem
                    key={it._id}
                    value={`${it.name} ${it.hsn_sac_code || ""} ${it.group || ""}`}
                    onSelect={() => {
                      onChange(it);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === it._id ? "opacity-100" : "opacity-0")} />
                    <div className="flex flex-col">
                      <span className="font-medium">{it.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {[it.hsn_sac_code, it.rate != null ? `Rs.${it.rate}` : null, `${gstRateFromItem(it)}% GST`]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="border-t p-1">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-xs font-bold text-primary"
                onClick={() => { setOpen(false); setIsAddOpen(true); }}
              >
                <Plus className="h-3.5 w-3.5" /> Create item
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">* Name</Label>
              <Input value={newItem.name} onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Rate</Label>
              <Input type="number" value={newItem.rate} onChange={(e) => setNewItem((p) => ({ ...p, rate: e.target.value }))} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Unit</Label>
              <Input value={newItem.unit} onChange={(e) => setNewItem((p) => ({ ...p, unit: e.target.value }))} className="h-10" placeholder="e.g. pcs, hr, kg" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">HSN/SAC Code</Label>
              <Input value={newItem.hsn_sac_code} onChange={(e) => setNewItem((p) => ({ ...p, hsn_sac_code: e.target.value }))} className="h-10" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateItem} disabled={creating}>{creating ? "Creating..." : "Create & Select"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
