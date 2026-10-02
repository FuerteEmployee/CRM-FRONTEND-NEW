import { useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/hrms/components/ui/popover";
import { Checkbox } from "@/hrms/components/ui/checkbox";
import { Input } from "@/hrms/components/ui/input";
import { Button } from "@/hrms/components/ui/button";
import { cn } from "@/hrms/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({ options, selected, onChange, placeholder = "Select...", className }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  const selectedLabels = options.filter(o => selected.includes(o.value)).map(o => o.label);

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-medium",
            className,
          )}
        >
          <span className={cn("truncate", selectedLabels.length === 0 && "text-slate-400")}>
            {selectedLabels.length > 0 ? selectedLabels.join(", ") : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2 bg-white" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="max-h-56 overflow-y-auto space-y-0.5">
          {filtered.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-slate-400">No options found</p>
          )}
          {filtered.map(option => (
            <label
              key={option.value}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50 cursor-pointer"
            >
              <Checkbox checked={selected.includes(option.value)} onCheckedChange={() => toggle(option.value)} />
              <span className="truncate">{option.label}</span>
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange([])}
            className="mt-1 h-7 w-full justify-center gap-1 text-xs text-slate-500"
          >
            <X className="h-3 w-3" /> Clear selection
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
