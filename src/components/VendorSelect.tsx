import { useState } from "react";
import { Check, ChevronsUpDown, Plus, Building2, Phone, Mail } from "lucide-react";
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
import { vendorService } from "@/api/services/vendor.service";

export interface VendorRecord {
  _id: string;
  company_name: string;
  gst_number?: string;
  phone_number?: string;
  email?: string;
  address?: string;
}

interface VendorSelectProps {
  value?: string;
  onChange: (vendor: VendorRecord | null) => void;
  disabled?: boolean;
}

const emptyNewVendor = { company_name: "", gst_number: "", phone_number: "", email: "", address: "" };

export function VendorSelect({ value, onChange, disabled }: VendorSelectProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newVendor, setNewVendor] = useState(emptyNewVendor);
  const [creating, setCreating] = useState(false);

  const { data: vendors = [], isLoading } = useQuery<VendorRecord[]>({
    queryKey: ["vendors"],
    queryFn: vendorService.getAll,
  });

  const selected = vendors.find((v) => v._id === value) || null;

  const handleCreateVendor = async () => {
    if (!newVendor.company_name.trim()) {
      toast({ title: "Error", description: "Vendor name is required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const created = await vendorService.create(newVendor);
      await queryClient.invalidateQueries({ queryKey: ["vendors"] });
      onChange(created);
      setIsAddOpen(false);
      setNewVendor(emptyNewVendor);
      toast({ title: "Success", description: "Vendor created and selected" });
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={disabled}
            className="w-full justify-between h-11 rounded-xl border-slate-200 font-normal"
          >
            {selected ? selected.company_name : isLoading ? "Loading vendors..." : "Select vendor..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command shouldFilter={true}>
            <CommandInput placeholder="Search by name, GSTIN, phone, email..." />
            <CommandList>
              <CommandEmpty>No vendor found.</CommandEmpty>
              <CommandGroup>
                {vendors.map((v) => (
                  <CommandItem
                    key={v._id}
                    value={`${v.company_name} ${v.gst_number || ""} ${v.phone_number || ""} ${v.email || ""}`}
                    onSelect={() => {
                      onChange(v);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", value === v._id ? "opacity-100" : "opacity-0")} />
                    <div className="flex flex-col">
                      <span className="font-medium">{v.company_name}</span>
                      <span className="text-[10px] text-slate-400">
                        {[v.gst_number, v.phone_number].filter(Boolean).join(" · ") || "-"}
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
                <Plus className="h-3.5 w-3.5" /> Add new vendor
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {selected && (
        <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Building2 className="h-3 w-3 text-slate-300" />
            <span className="font-bold">{selected.gst_number || "No GSTIN on file"}</span>
          </div>
          {selected.phone_number && (
            <div className="flex items-center gap-1.5 text-slate-600">
              <Phone className="h-3 w-3 text-slate-300" /> {selected.phone_number}
            </div>
          )}
          {selected.email && (
            <div className="flex items-center gap-1.5 text-slate-600">
              <Mail className="h-3 w-3 text-slate-300" /> {selected.email}
            </div>
          )}
          {selected.address && <div className="text-slate-500">{selected.address}</div>}
        </div>
      )}

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">* Company Name</Label>
              <Input
                value={newVendor.company_name}
                onChange={(e) => setNewVendor((p) => ({ ...p, company_name: e.target.value }))}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">GST Number</Label>
              <Input
                value={newVendor.gst_number}
                onChange={(e) => setNewVendor((p) => ({ ...p, gst_number: e.target.value.toUpperCase() }))}
                className="h-10 uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Phone</Label>
              <Input
                value={newVendor.phone_number}
                onChange={(e) => setNewVendor((p) => ({ ...p, phone_number: e.target.value }))}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Email</Label>
              <Input
                value={newVendor.email}
                onChange={(e) => setNewVendor((p) => ({ ...p, email: e.target.value }))}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Address</Label>
              <Input
                value={newVendor.address}
                onChange={(e) => setNewVendor((p) => ({ ...p, address: e.target.value }))}
                className="h-10"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateVendor} disabled={creating}>
              {creating ? "Creating..." : "Create & Select"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
