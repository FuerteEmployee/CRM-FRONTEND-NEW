import { Facebook, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface MetaFormsFilterDropdownProps {
  forms: { id: string; name: string }[];
  value: string;
  onChange: (formId: string) => void;
}

// A compact alternative to the ad-tabs above the table for jumping straight
// to one ad's leads — same underlying filter, just reachable from the
// toolbar without scrolling up. Columns for each form's questions are added
// to the Leads table automatically on import now (see meta_integration
// controller/service) — this dropdown is purely a view filter, nothing to
// configure here.
export const MetaFormsFilterDropdown = ({ forms, value, onChange }: MetaFormsFilterDropdownProps) => {
  const activeLabel = value === "all" ? "All Leads" : forms.find((f) => f.id === value)?.name || "Meta Forms";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-10 rounded-xl px-4 border-slate-200 bg-white font-black uppercase text-[10px] tracking-widest gap-2"
        >
          <Facebook className="h-3.5 w-3.5 text-[#1877F2]" />
          {activeLabel === "All Leads" ? "Meta Forms" : activeLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem className="justify-between cursor-pointer" onSelect={() => onChange("all")}>
          All Leads
          {value === "all" && <Check className="h-3.5 w-3.5" />}
        </DropdownMenuItem>
        {forms.length === 0 ? (
          <div className="px-2 py-3 text-xs text-slate-400 text-center">
            No leads imported from a Meta form yet.
          </div>
        ) : (
          forms.map((form) => (
            <DropdownMenuItem
              key={form.id}
              className="justify-between cursor-pointer"
              onSelect={() => onChange(form.id)}
            >
              <span className="truncate">{form.name}</span>
              {value === form.id && <Check className="h-3.5 w-3.5 shrink-0" />}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
