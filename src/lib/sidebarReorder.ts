import { arrayMove } from "@dnd-kit/sortable";

// Reassigns the scope's own existing `order` values (sorted) to the new
// sequence produced by the drag — so a reorder only ever touches the order
// numbers already "owned" by this scope (a group on the live sidebar, or the
// whole table on the Setup page) and never collides with items outside it.
export function computeReorderPayload(items: any[], oldIndex: number, newIndex: number) {
  const slots = items.map((i) => i.order).sort((a, b) => a - b);
  const reordered = arrayMove(items, oldIndex, newIndex);
  return {
    reordered,
    payload: reordered.map((item, idx) => ({ id: item._id, order: slots[idx] })),
  };
}
