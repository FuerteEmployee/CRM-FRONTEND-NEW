import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, ListTodo } from "lucide-react";
import { formatDate } from "@/lib/dateFormat";
import type { KanbanStaff, KanbanTask } from "@/pages/TasksKanban";

interface TaskCardProps {
  task: KanbanTask;
  assignees: KanbanStaff[];
  onOpen: (task: KanbanTask) => void;
}

const priorityColors: Record<number, string> = {
  1: "bg-green-50 text-green-700 border-green-200",
  2: "bg-yellow-50 text-yellow-700 border-yellow-200",
  3: "bg-orange-50 text-orange-700 border-orange-200",
  4: "bg-red-50 text-red-700 border-red-200",
};

function initials(staff: KanbanStaff): string {
  const first = staff.firstname?.charAt(0) || "";
  const last = staff.lastname?.charAt(0) || "";
  return (first + last).toUpperCase() || "?";
}

export function TaskCard({ task, assignees, onOpen }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task)}
      className={`rounded-2xl border border-slate-100 bg-white p-3 shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
        isDragging ? "opacity-40" : ""
      }`}
      tabIndex={0}
      role="button"
      aria-label={`Open task ${task.name}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-black text-slate-900 leading-snug">{task.name}</p>
        {task.isTodo && <ListTodo className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
      </div>

      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <span className="text-[8px] font-black uppercase tracking-wide px-1.5 h-4 flex items-center rounded-md bg-slate-50 text-slate-500 border border-slate-100">
          {task.category || "To-Do"}
        </span>
        <span
          className={`text-[8px] font-black uppercase tracking-wide px-1.5 h-4 flex items-center rounded-md border ${
            priorityColors[task.displayPriority] || priorityColors[2]
          }`}
        >
          P{task.displayPriority}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex -space-x-1.5">
          {assignees.slice(0, 3).map((s) => (
            <div
              key={s._id}
              className="h-5 w-5 rounded-full bg-primary/10 border-2 border-white flex items-center justify-center text-[7px] font-black text-primary"
            >
              {initials(s)}
            </div>
          ))}
        </div>
        {task.duedate && (
          <span className="flex items-center gap-1 text-[9px] font-bold text-slate-300">
            <Calendar className="h-3 w-3" />
            {formatDate(task.duedate)}
          </span>
        )}
      </div>
    </div>
  );
}
