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
import { ListTodo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { taskStatusConfig } from "@/pages/Tasks";
import { TaskCard } from "@/pages/TaskCard";

export interface KanbanStaff {
  _id: string;
  firstname?: string;
  lastname?: string;
}

export interface KanbanTask {
  _id: string;
  name: string;
  category?: string;
  displayStatus: number;
  displayPriority: number;
  assignees?: string[];
  duedate?: string;
  isTodo: boolean;
}

interface TasksKanbanProps {
  tasks: KanbanTask[];
  staff: KanbanStaff[];
  isLoading: boolean;
  onOpenTask: (task: KanbanTask) => void;
  onStatusChange: (task: KanbanTask, newStatusId: number) => void;
}

function getAssignees(task: KanbanTask, staff: KanbanStaff[]): KanbanStaff[] {
  if (!task.assignees) return [];
  return task.assignees
    .map((id) => staff.find((s) => s._id === id))
    .filter((s): s is KanbanStaff => Boolean(s));
}

function KanbanColumn({
  statusId,
  label,
  colorClasses,
  tasks,
  staff,
  onOpenTask,
}: {
  statusId: number;
  label: string;
  colorClasses: string;
  tasks: KanbanTask[];
  staff: KanbanStaff[];
  onOpenTask: (task: KanbanTask) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${statusId}` });

  return (
    <div className="flex w-[280px] shrink-0 flex-col rounded-2xl bg-slate-50/60 border border-slate-100">
      <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-slate-100">
        <span className={`text-[10px] font-black uppercase tracking-wide px-2 h-5 flex items-center rounded-md border ${colorClasses}`}>
          {label}
        </span>
        <Badge className="rounded-lg border-none font-black text-[9px] px-2 h-5 bg-slate-100 text-slate-500 shrink-0">
          {tasks.length}
        </Badge>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[120px] overflow-y-auto no-scrollbar p-2 space-y-2 transition-colors ${
          isOver ? "bg-primary/5" : ""
        }`}
        style={{ maxHeight: "calc(100vh - 260px)" }}
      >
        <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
              No tasks
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard key={task._id} task={task} assignees={getAssignees(task, staff)} onOpen={onOpenTask} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}

export function TasksKanban({ tasks, staff, isLoading, onOpenTask, onStatusChange }: TasksKanbanProps) {
  const [boardTasks, setBoardTasks] = useState<KanbanTask[]>(tasks);

  useEffect(() => {
    setBoardTasks(tasks);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeTask = boardTasks.find((t) => t._id === activeId);
    if (!activeTask) return;

    const overTask = boardTasks.find((t) => t._id === overId) || null;
    const fromStatusId = activeTask.displayStatus;
    const toStatusId = overId.startsWith("column:")
      ? Number(overId.replace("column:", ""))
      : overTask
      ? overTask.displayStatus
      : NaN;

    if (Number.isNaN(toStatusId)) return;

    if (fromStatusId === toStatusId) {
      // Same-column reorder is visual only — Task has a kanban_order field
      // but persisting drag order isn't wired up yet, so this doesn't call the API.
      if (activeId !== overId && !overId.startsWith("column:")) {
        const columnIds = boardTasks
          .filter((t) => t.displayStatus === fromStatusId)
          .map((t) => t._id);
        const oldIndex = columnIds.indexOf(activeId);
        const newIndex = columnIds.indexOf(overId);
        if (oldIndex === -1 || newIndex === -1) return;
        const reorderedColumn = arrayMove(columnIds, oldIndex, newIndex);
        setBoardTasks((prev) => {
          const others = prev.filter((t) => t.displayStatus !== fromStatusId);
          const columnTasks = reorderedColumn.map(
            (id) => prev.find((t) => t._id === id) as KanbanTask
          );
          return [...others, ...columnTasks];
        });
      }
      return;
    }

    setBoardTasks((prev) =>
      prev.map((t) => (t._id === activeId ? { ...t, displayStatus: toStatusId } : t))
    );
    onStatusChange(activeTask, toStatusId);
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {taskStatusConfig.map((s) => (
          <div key={s.id} className="w-[280px] shrink-0 space-y-2">
            <Skeleton className="h-10 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }

  if (boardTasks.length === 0) {
    return (
      <div className="p-20 text-center">
        <div className="flex flex-col items-center gap-3">
          <ListTodo className="h-12 w-12 text-slate-100" />
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
            No tasks found
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ height: "calc(100vh - 220px)" }}>
        {taskStatusConfig.map((status) => (
          <KanbanColumn
            key={status.id}
            statusId={status.id}
            label={status.label}
            colorClasses={`${status.bg} ${status.text} ${status.border}`}
            tasks={boardTasks.filter((t) => t.displayStatus === status.id)}
            staff={staff}
            onOpenTask={onOpenTask}
          />
        ))}
      </div>
    </DndContext>
  );
}
