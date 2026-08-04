import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { leadService } from "@/api/services/lead.service";
import { LeadCard } from "@/pages/LeadCard";

export interface KanbanStatus {
  _id: string;
  name: string;
  color?: string;
  statusorder?: number;
}

export interface KanbanStaff {
  _id: string;
  firstname?: string;
  lastname?: string;
}

export interface KanbanLead {
  _id: string;
  name: string;
  company?: string;
  lead_value?: string;
  status?: KanbanStatus | string | null;
  assigned?: KanbanStaff | string | null;
  updatedAt?: string;
  createdAt?: string;
}

interface LeadsKanbanProps {
  leads: KanbanLead[];
  statuses: KanbanStatus[];
  staff: KanbanStaff[];
  isLoading: boolean;
}

function getStatusId(lead: KanbanLead): string {
  if (!lead.status) return "";
  return typeof lead.status === "object" ? lead.status._id : lead.status;
}

function getAssignee(lead: KanbanLead, staff: KanbanStaff[]): KanbanStaff | null {
  if (!lead.assigned) return null;
  if (typeof lead.assigned === "object") return lead.assigned;
  return staff.find((s) => s._id === lead.assigned) || null;
}

function KanbanColumn({
  status,
  leads,
  staff,
}: {
  status: KanbanStatus;
  leads: KanbanLead[];
  staff: KanbanStaff[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status._id}` });

  return (
    <div className="flex w-[280px] shrink-0 flex-col rounded-2xl bg-slate-50/60 border border-slate-100">
      <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: status.color || "#757575" }}
          />
          <span className="text-xs font-black text-slate-700 uppercase tracking-wide truncate">
            {status.name}
          </span>
        </div>
        <Badge className="rounded-lg border-none font-black text-[9px] px-2 h-5 bg-slate-100 text-slate-500 shrink-0">
          {leads.length}
        </Badge>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[120px] overflow-y-auto no-scrollbar p-2 space-y-2 transition-colors ${
          isOver ? "bg-primary/5" : ""
        }`}
        style={{ maxHeight: "calc(100vh - 260px)" }}
      >
        <SortableContext items={leads.map((l) => l._id)} strategy={verticalListSortingStrategy}>
          {leads.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              No leads
            </div>
          ) : (
            leads.map((lead) => (
              <LeadCard key={lead._id} lead={lead} assignee={getAssignee(lead, staff)} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export function LeadsKanban({ leads, statuses, staff, isLoading }: LeadsKanbanProps) {
  const [boardLeads, setBoardLeads] = useState<KanbanLead[]>(leads);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setBoardLeads(leads);
  }, [leads]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const orderedStatuses = [...statuses].sort(
    (a, b) => (a.statusorder ?? 0) - (b.statusorder ?? 0)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeLead = boardLeads.find((l) => l._id === activeId);
    if (!activeLead) return;

    const overLead = boardLeads.find((l) => l._id === overId) || null;
    const fromStatusId = getStatusId(activeLead);
    const toStatusId = overId.startsWith("column:")
      ? overId.replace("column:", "")
      : overLead
      ? getStatusId(overLead)
      : "";

    if (!toStatusId || fromStatusId === toStatusId) {
      // Same-column reorder is visual only — the backend has no lead
      // position field yet, so there's nothing to persist here.
      if (fromStatusId === toStatusId && activeId !== overId && !overId.startsWith("column:")) {
        const columnIds = boardLeads
          .filter((l) => getStatusId(l) === fromStatusId)
          .map((l) => l._id);
        const oldIndex = columnIds.indexOf(activeId);
        const newIndex = columnIds.indexOf(overId);
        if (oldIndex === -1 || newIndex === -1) return;
        const reorderedColumn = arrayMove(columnIds, oldIndex, newIndex);
        setBoardLeads((prev) => {
          const others = prev.filter((l) => getStatusId(l) !== fromStatusId);
          const columnLeads = reorderedColumn.map(
            (id) => prev.find((l) => l._id === id) as KanbanLead
          );
          return [...others, ...columnLeads];
        });
      }
      return;
    }

    const previousBoardLeads = boardLeads;
    setBoardLeads((prev) =>
      prev.map((l) =>
        l._id === activeId ? { ...l, status: toStatusId } : l
      )
    );

    leadService
      .updateStatus(activeId, toStatusId)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["leads"] });
      })
      .catch((err: unknown) => {
        setBoardLeads(previousBoardLeads);
        const message =
          err instanceof Error
            ? (err as Error & { response?: { data?: { message?: string } } }).response?.data
                ?.message || err.message
            : "Failed to move lead";
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
      });
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-[280px] shrink-0 space-y-2">
            <Skeleton className="h-10 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }

  if (boardLeads.length === 0) {
    return (
      <div className="p-20 text-center">
        <div className="flex flex-col items-center gap-3">
          <Users className="h-12 w-12 text-slate-100" />
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
            No leads found in the pipeline
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ height: "calc(100vh - 220px)" }}>
        {orderedStatuses.map((status) => (
          <KanbanColumn
            key={status._id}
            status={status}
            leads={boardLeads.filter((l) => getStatusId(l) === status._id)}
            staff={staff}
          />
        ))}
      </div>
    </DndContext>
  );
}
