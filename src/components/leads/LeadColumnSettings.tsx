import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Settings, GripVertical, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface LeadColumnOption {
  id: string;
  label: string;
}

interface SortableColumnRowProps {
  column: LeadColumnOption;
  hidden: boolean;
  onToggle: (id: string) => void;
}

function SortableColumnRow({ column, hidden, onToggle }: SortableColumnRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-xl px-2 py-1.5 bg-white",
        isDragging && "opacity-50 shadow-lg z-10 relative"
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing"
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${column.label}`}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Checkbox
        checked={!hidden}
        onCheckedChange={() => onToggle(column.id)}
        className="border-slate-300 rounded-md"
      />
      <span className="text-xs font-bold text-slate-700 truncate">{column.label}</span>
    </div>
  );
}

interface LeadColumnSettingsProps {
  columns: LeadColumnOption[];
  hiddenColumns: string[];
  onReorder: (orderedIds: string[]) => void;
  onToggle: (id: string) => void;
  onReset: () => void;
}

export function LeadColumnSettings({ columns, hiddenColumns, onReorder, onToggle, onReset }: LeadColumnSettingsProps) {
  const [open, setOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = columns.findIndex((c) => c.id === active.id);
    const newIndex = columns.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(columns, oldIndex, newIndex).map((c) => c.id));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Table column settings"
          className="h-10 w-10 shrink-0 rounded-xl border-slate-200 bg-white"
        >
          <Settings className="h-4 w-4 text-slate-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 max-w-[calc(100vw-2rem)] rounded-2xl p-3 space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Table Columns</p>
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
        <p className="px-1 text-[9px] font-bold text-slate-400 leading-snug">
          Drag to reorder. Uncheck to hide a column. Saved for your account on this browser.
        </p>
        <div className="max-h-80 overflow-y-auto no-scrollbar space-y-1">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {columns.map((col) => (
                <SortableColumnRow
                  key={col.id}
                  column={col}
                  hidden={hiddenColumns.includes(col.id)}
                  onToggle={onToggle}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </PopoverContent>
    </Popover>
  );
}
