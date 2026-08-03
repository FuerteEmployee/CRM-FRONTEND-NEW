import { useNavigate } from "react-router-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Building2 } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import type { KanbanLead, KanbanStaff } from "@/pages/LeadsKanban";

interface LeadCardProps {
  lead: KanbanLead;
  assignee: KanbanStaff | null;
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return "";

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "updated just now";
  if (minutes < 60) return `updated ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `updated ${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `updated ${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `updated ${months}mo ago`;

  return `updated ${Math.floor(months / 12)}y ago`;
}

function initials(staff: KanbanStaff | null): string {
  if (!staff) return "?";
  const first = staff.firstname?.charAt(0) || "";
  const last = staff.lastname?.charAt(0) || "";
  return (first + last).toUpperCase() || "?";
}

export function LeadCard({ lead, assignee }: LeadCardProps) {
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const value = lead.lead_value ? Number(lead.lead_value) : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => navigate(`/leads/${lead._id}`)}
      className={`rounded-2xl border border-slate-100 bg-white p-3 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
        isDragging ? "opacity-40" : ""
      }`}
      tabIndex={0}
      role="button"
      aria-label={`Open lead ${lead.name}`}
    >
      <p className="text-xs font-black text-slate-900 truncate">{lead.name}</p>

      {lead.company && (
        <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-400">
          <Building2 className="h-3 w-3 text-slate-300" />
          <span className="truncate">{lead.company}</span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-black text-primary">
            {initials(assignee)}
          </div>
          {value > 0 && (
            <span className="text-[10px] font-black text-slate-700">{formatAmount(value)}</span>
          )}
        </div>
        <span className="text-[9px] font-bold text-slate-300">{timeAgo(lead.updatedAt || lead.createdAt)}</span>
      </div>
    </div>
  );
}
