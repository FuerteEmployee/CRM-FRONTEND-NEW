import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DataTable, DataTableColumn } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Eye, AlertCircle, RefreshCw, Plus } from "lucide-react";
import { estimateService } from "@/api/services/estimate.service";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EstimateRecord {
  _id: string;
  number: string;
  date: string;
  status: string;
  contact_name: string;
  contact_email: string;
  total: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-foreground border-slate-200",
  sent: "bg-blue-50 text-blue-600 border-blue-100",
  accepted: "bg-emerald-50 text-emerald-600 border-emerald-100",
  declined: "bg-red-50 text-red-600 border-red-100",
  expired: "bg-amber-50 text-amber-600 border-amber-100",
};

// ─── Estimates Page (Financial) ───────────────────────────────────────────────

export default function Estimates() {
  const navigate = useNavigate();

  // Fetch Data
  const {
    data: allData = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["estimates"],
    queryFn: async () => {
      const response = await estimateService.getEstimates();
      return Array.isArray(response) ? response : response?.data || [];
    },
  });

  // Filter for financial estimates only (no form reference)
  const estimates = useMemo(
    () => allData.filter((item: any) => !item.form),
    [allData],
  );

  // ─── Column Definitions ─────────────────────────────────────────────────────

  const estimateColumns: DataTableColumn<EstimateRecord>[] = [
    {
      key: "number",
      label: "Estimate #",
      className: "font-mono font-bold text-primary",
    },
    {
      key: "contact_name",
      label: "Contact",
      className: "font-medium text-slate-900",
    },
    {
      key: "contact_email",
      label: "Email",
      className: "text-muted-foreground",
    },
    {
      key: "total",
      label: "Total",
      render: (row) => (
        <span className="font-semibold text-slate-800">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: row.currency || "USD",
          }).format(row.total)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <Badge
          variant="outline"
          className={`capitalize font-semibold ${STATUS_COLORS[row.status.toLowerCase()] || STATUS_COLORS.draft}`}
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (row) => (
        <span className="text-muted-foreground text-sm">
          {new Date(row.date).toLocaleDateString()}
        </span>
      ),
    },
  ];

  if (isError) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <AlertCircle className="h-10 w-10 text-destructive/60 mb-4" />
          <p className="font-semibold text-lg">Failed to load estimates</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Estimates
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage your professional financial estimate documents.
            </p>
          </div>
          <Button className="  flex items-center gap-2 h-10 px-5 rounded-lg shadow-sm">
            <Plus className="h-4 w-4" />
            <span className="font-semibold text-sm">New Estimate</span>
          </Button>
        </div>

        {/* Clean DataTable without Tabs */}
        <DataTable
          columns={estimateColumns}
          data={estimates}
          isLoading={isLoading}
          onRefresh={refetch}
          showIdColumn={true}
          renderCustomActions={(row) => (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5"
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        />
      </div>
    </DashboardLayout>
  );
}
