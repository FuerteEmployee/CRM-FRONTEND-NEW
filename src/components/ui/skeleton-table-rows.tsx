import { Skeleton } from "@/components/ui/skeleton";

/**
 * Drop-in <tbody> loading state for data tables: a handful of rows that
 * mimic real table cells (avatar-ish block + varying-width bars) instead of
 * a single flat bar, so the table looks like it's populating rather than
 * just "something is happening". `colSpan` should match the table's real
 * column count so the skeleton cell spans the full width correctly.
 */
export function SkeletonTableRows({ rows = 5, colSpan }: { rows?: number; colSpan: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b last:border-0">
          <td colSpan={colSpan} className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <Skeleton className="h-4 flex-1 min-w-[80px]" />
              <Skeleton className="h-4 w-24 hidden sm:block" />
              <Skeleton className="h-4 w-20 hidden md:block" />
              <Skeleton className="h-4 w-16 hidden lg:block" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}
