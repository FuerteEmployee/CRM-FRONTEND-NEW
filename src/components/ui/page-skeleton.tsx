import { Skeleton } from "@/components/ui/skeleton";

// ── Generic building blocks ──────────────────────────────────────────────────

const StatCards = ({ count = 4 }: { count?: number }) => (
  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count} gap-4`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex justify-between items-start">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    ))}
  </div>
);

const TableRows = ({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) => (
  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
    {/* Table header */}
    <div className="px-4 py-3 border-b border-gray-100 flex gap-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={`h-4 rounded ${i === 0 ? "w-32" : i === cols - 1 ? "w-16 ml-auto" : "w-24"}`} />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="px-4 py-3.5 border-b border-gray-50 flex items-center gap-4">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-16 rounded-full ml-auto" />
        <Skeleton className="h-8 w-16 rounded-md" />
      </div>
    ))}
  </div>
);

const PageHeader = ({ hasButton = false }: { hasButton?: boolean }) => (
  <div className="flex justify-between items-start">
    <div className="space-y-2">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
    {hasButton && <Skeleton className="h-9 w-32 rounded-lg" />}
  </div>
);

// ── Page-level skeletons ─────────────────────────────────────────────────────

/** SuperAdminDashboard — 4 stats + activity feed + health card */
export const SuperAdminDashboardSkeleton = () => (
  <div className="p-6 max-w-7xl mx-auto space-y-6">
    <PageHeader />
    <StatCards count={4} />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Activity feed */}
      <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <Skeleton className="h-5 w-36" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-3 w-12 shrink-0" />
          </div>
        ))}
      </div>
      {/* Health card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/** SuperAdminAdmins / SuperAdminCompanies — header + search + table */
export const SuperAdminTablePageSkeleton = ({ hasSearch = true }: { hasSearch?: boolean }) => (
  <div className="p-6 max-w-7xl mx-auto space-y-6">
    <PageHeader hasButton />
    {hasSearch && (
      <div className="flex gap-3">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
    )}
    <TableRows rows={7} cols={5} />
  </div>
);

/** SuperAdminPlans — header + plan cards grid */
export const SuperAdminPlansSkeleton = () => (
  <div className="p-6 max-w-7xl mx-auto space-y-6">
    <PageHeader hasButton />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-gray-100 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="p-5 space-y-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
          <div className="p-5 pt-0 grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton key={j} className="h-7 rounded-lg" />
            ))}
          </div>
          <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** SuperAdminBilling — 3 stats + table + roadmap cards */
export const SuperAdminBillingSkeleton = () => (
  <div className="p-6 max-w-7xl mx-auto space-y-6">
    <PageHeader />
    <StatCards count={3} />
    <TableRows rows={5} cols={5} />
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <Skeleton className="h-5 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/** SuperAdminAlerts — filter pills + list of alert cards */
export const SuperAdminAlertsSkeleton = () => (
  <div className="p-6 max-w-7xl mx-auto space-y-6">
    <div className="flex justify-between items-start">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
    </div>
    {/* Filter pills */}
    <div className="flex gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-20 rounded-full" />
      ))}
    </div>
    {/* Alert cards */}
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2 items-center">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md shrink-0" />
        </div>
      ))}
    </div>
  </div>
);

/** Admin Dashboard — stats + overview cards + todo + tabs + charts */
export const AdminDashboardSkeleton = () => (
  <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
    {/* Header */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-9 w-32 rounded-lg" />
    </div>

    {/* 4 stat cards */}
    <StatCards count={4} />

    {/* Overview + Todo row */}
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
      <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <Skeleton className="h-5 w-36" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-3 space-y-2">
              <Skeleton className="h-4 w-24" />
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-8" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <Skeleton className="h-5 w-28" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>

    {/* Invoice summary 3 cards */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-36" />
        </div>
      ))}
    </div>

    {/* Tabs section */}
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex gap-2 px-4 pt-3 border-b border-gray-100">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-t-md" />
        ))}
      </div>
      <div className="p-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </div>

    {/* Charts row */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-40 w-40 rounded-full mx-auto" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Recent activity */}
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
      <Skeleton className="h-5 w-36" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-3 w-16 shrink-0" />
        </div>
      ))}
    </div>
  </div>
);

/** Generic table page skeleton — for all other admin pages */
export const AdminTablePageSkeleton = () => (
  <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
    <PageHeader hasButton />
    <div className="flex flex-wrap gap-3">
      <Skeleton className="h-9 w-56 rounded-lg" />
      <Skeleton className="h-9 w-28 rounded-lg" />
      <Skeleton className="h-9 w-28 rounded-lg" />
    </div>
    <TableRows rows={8} cols={5} />
  </div>
);
