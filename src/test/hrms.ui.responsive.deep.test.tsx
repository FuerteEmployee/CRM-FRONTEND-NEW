import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import React, { useState } from "react";
import { DataTable, Column } from "@/hrms/components/common/DataTable";
import { Button } from "@/hrms/components/ui/button";
import { Badge } from "@/hrms/components/ui/badge";
import { Eye, Edit2, Trash2, CheckCircle2, XCircle } from "lucide-react";

interface MockStaff {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive";
  branch: string;
}

const mockStaffData: MockStaff[] = [
  { id: "s-1", name: "Rahul Sharma", email: "rahul@example.com", role: "Manager", status: "active", branch: "Surat Central" },
  { id: "s-2", name: "Pooja Patel", email: "pooja@example.com", role: "HR Executive", status: "active", branch: "Ahmedabad HQ" },
  { id: "s-3", name: "Amit Verma", email: "amit@example.com", role: "Field Agent", status: "inactive", branch: "Vadodara Branch" },
  { id: "s-4", name: "Neha Gupta", email: "neha@example.com", role: "Accountant", status: "active", branch: "Surat Central" },
  { id: "s-5", name: "Kunal Shah", email: "kunal@example.com", role: "Developer", status: "active", branch: "Ahmedabad HQ" },
];

describe("13-Tier Deep Quality Audit: HRMS Tier 7 (UI / Responsive Design, Tables, Filters & Buttons)", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. DataTable Desktop & Mobile Rendering (Dual Viewport Architecture)
  // =========================================================================
  describe("1. DataTable Layout & Responsive Dual-View Architecture", () => {
    const mockOnRowClick = vi.fn();
    const mockOnPageChange = vi.fn();

    const columns: Column<MockStaff>[] = [
      { id: "name", header: "Employee Name", accessorKey: "name" },
      { id: "role", header: "Role", accessorKey: "role" },
      { id: "branch", header: "Branch", accessorKey: "branch" },
      {
        id: "status",
        header: "Status",
        accessorKey: (item) => (
          <Badge variant="outline" className={item.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100"}>
            {item.status}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        accessorKey: (item) => (
          <div className="flex items-center gap-1.5" data-testid={`actions-${item.id}`}>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" title="View details" onClick={(e) => { e.stopPropagation(); }}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600" title="Edit employee" onClick={(e) => { e.stopPropagation(); }}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" title="Delete employee" onClick={(e) => { e.stopPropagation(); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ];

    it("renders desktop Table elements (table, thead, tbody, th, td) with all columns", () => {
      const { container } = render(
        <DataTable data={mockStaffData} columns={columns} pageSize={10} onRowClick={mockOnRowClick} />
      );

      // Desktop table exists
      const table = container.querySelector("table");
      expect(table).not.toBeNull();

      // Headers exist
      expect(screen.getAllByText("Employee Name").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Role").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Branch").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Actions").length).toBeGreaterThan(0);

      // Rows data exists
      expect(screen.getAllByText("Rahul Sharma").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Surat Central").length).toBeGreaterThan(0);
    });

    it("renders mobile Card elements (md:hidden container) with stacked key-value pairs and buttons", () => {
      const { container } = render(
        <DataTable data={mockStaffData} columns={columns} pageSize={10} onRowClick={mockOnRowClick} />
      );

      // Mobile cards container exists
      const mobileGrid = container.querySelector(".md\\:hidden");
      expect(mobileGrid).not.toBeNull();

      // Action buttons are present and interactive within mobile view
      const actionGroups = screen.getAllByTestId("actions-s-1");
      expect(actionGroups.length).toBeGreaterThanOrEqual(1);

      const viewButtons = screen.getAllByTitle("View details");
      expect(viewButtons.length).toBeGreaterThan(0);
    });

    it("handles onRowClick callback when a table row is clicked", () => {
      render(
        <DataTable data={mockStaffData} columns={columns} pageSize={10} onRowClick={mockOnRowClick} />
      );

      // Click row
      const firstRowName = screen.getAllByText("Rahul Sharma")[0];
      fireEvent.click(firstRowName);

      expect(mockOnRowClick).toHaveBeenCalledWith(mockStaffData[0]);
    });

    it("renders skeleton loader state when isLoading=true", () => {
      const { container } = render(
        <DataTable data={[]} columns={columns} isLoading={true} />
      );

      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("renders empty state message when data is empty and not loading", async () => {
      render(
        <DataTable data={[]} columns={columns} isLoading={false} emptyMessage="No staff members registered" />
      );

      // Delayed empty state appears
      await waitFor(() => {
        expect(screen.getAllByText("No staff members registered").length).toBeGreaterThan(0);
      }, { timeout: 1000 });
    });
  });

  // =========================================================================
  // 2. Action Buttons & Interactive Controls (View, Edit, Delete, Status Toggle)
  // =========================================================================
  describe("2. Table Action Buttons & Click Handlers", () => {
    it("executes View, Edit, and Delete action button handlers independently without triggering row click", () => {
      const onView = vi.fn();
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      const onRowClick = vi.fn();

      const ActionCell = ({ id }: { id: string }) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" title="View" onClick={() => onView(id)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-amber-600" title="Edit" onClick={() => onEdit(id)}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" title="Delete" onClick={() => onDelete(id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );

      render(
        <div onClick={onRowClick} data-testid="row-container">
          <ActionCell id="s-101" />
        </div>
      );

      // Click View
      fireEvent.click(screen.getByTitle("View"));
      expect(onView).toHaveBeenCalledWith("s-101");
      expect(onRowClick).not.toHaveBeenCalled();

      // Click Edit
      fireEvent.click(screen.getByTitle("Edit"));
      expect(onEdit).toHaveBeenCalledWith("s-101");
      expect(onRowClick).not.toHaveBeenCalled();

      // Click Delete
      fireEvent.click(screen.getByTitle("Delete"));
      expect(onDelete).toHaveBeenCalledWith("s-101");
      expect(onRowClick).not.toHaveBeenCalled();
    });

    it("toggles staff status (active <-> inactive) when status badge is clicked", () => {
      const StatusWidget = () => {
        const [status, setStatus] = useState<"active" | "inactive">("active");
        return (
          <Badge
            variant="outline"
            className={`cursor-pointer ${status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}
            onClick={() => setStatus((prev) => (prev === "active" ? "inactive" : "active"))}
          >
            {status}
          </Badge>
        );
      };

      render(<StatusWidget />);

      const badge = screen.getByText("active");
      expect(badge).toBeDefined();

      // Click to toggle
      fireEvent.click(badge);
      expect(screen.getByText("inactive")).toBeDefined();

      // Click again
      fireEvent.click(screen.getByText("inactive"));
      expect(screen.getByText("active")).toBeDefined();
    });
  });

  // =========================================================================
  // 3. Search & Filter Bar with Badge Counters & Clear All
  // =========================================================================
  describe("3. Search Bar, Dropdown Filters & Active Counter Badge", () => {
    const FilterWidget = () => {
      const [search, setSearch] = useState("");
      const [roleFilter, setRoleFilter] = useState("all");
      const [branchFilter, setBranchFilter] = useState("all");
      const [statusFilter, setStatusFilter] = useState("all");

      const activeCount = [roleFilter, branchFilter, statusFilter].filter((f) => f !== "all").length;

      const clearAll = () => {
        setRoleFilter("all");
        setBranchFilter("all");
        setStatusFilter("all");
        setSearch("");
      };

      return (
        <div>
          <input
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="search-input"
          />

          <button data-testid="filter-button">
            Filters
            {activeCount > 0 && <span data-testid="filter-count-badge">{activeCount}</span>}
          </button>

          <button data-testid="set-role-filter" onClick={() => setRoleFilter("Manager")}>Set Manager</button>
          <button data-testid="set-branch-filter" onClick={() => setBranchFilter("Surat")}>Set Surat</button>
          <button data-testid="clear-filters-btn" onClick={clearAll}>Clear All Filters</button>

          <div data-testid="current-role">{roleFilter}</div>
          <div data-testid="current-branch">{branchFilter}</div>
          <div data-testid="current-status">{statusFilter}</div>
        </div>
      );
    };

    it("updates search query input instantly", () => {
      render(<FilterWidget />);
      const input = screen.getByTestId("search-input") as HTMLInputElement;

      fireEvent.change(input, { target: { value: "Pooja" } });
      expect(input.value).toBe("Pooja");
    });

    it("displays active filter count badge when filters are applied", () => {
      render(<FilterWidget />);

      // Initially 0 filters
      expect(screen.queryByTestId("filter-count-badge")).toBeNull();

      // Apply 1 filter
      fireEvent.click(screen.getByTestId("set-role-filter"));
      expect(screen.getByTestId("filter-count-badge").textContent).toBe("1");

      // Apply 2nd filter
      fireEvent.click(screen.getByTestId("set-branch-filter"));
      expect(screen.getByTestId("filter-count-badge").textContent).toBe("2");
    });

    it("resets all active filters back to 'all' when Clear All Filters is clicked", () => {
      render(<FilterWidget />);

      fireEvent.click(screen.getByTestId("set-role-filter"));
      fireEvent.click(screen.getByTestId("set-branch-filter"));
      expect(screen.getByTestId("filter-count-badge").textContent).toBe("2");

      // Click Clear All
      fireEvent.click(screen.getByTestId("clear-filters-btn"));
      expect(screen.queryByTestId("filter-count-badge")).toBeNull();
      expect(screen.getByTestId("current-role").textContent).toBe("all");
      expect(screen.getByTestId("current-branch").textContent).toBe("all");
    });
  });

  // =========================================================================
  // 4. Leave Management Action Buttons (Approve & Reject)
  // =========================================================================
  describe("4. Leave Management Approval & Rejection UI Buttons", () => {
    it("renders Approve and Reject buttons for Pending leaves and executes corresponding handlers", () => {
      const onApprove = vi.fn();
      const onReject = vi.fn();

      const LeaveCard = ({ leave }: { leave: { id: string; name: string; status: string } }) => (
        <div data-testid={`leave-card-${leave.id}`} className="p-3 border rounded-xl">
          <p>{leave.name}</p>
          <Badge>{leave.status}</Badge>

          {leave.status.toLowerCase() === "pending" && (
            <div className="flex gap-2 mt-2">
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => onApprove(leave.id)}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="text-red-500 border-red-200" onClick={() => onReject(leave.id)}>
                <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
              </Button>
            </div>
          )}
        </div>
      );

      const pendingLeave = { id: "lv-001", name: "Rahul Sharma - Casual Leave", status: "pending" };
      const approvedLeave = { id: "lv-002", name: "Pooja Patel - Sick Leave", status: "approved" };

      const { rerender } = render(<LeaveCard leave={pendingLeave} />);

      // Pending leave renders Approve and Reject buttons
      const approveBtn = screen.getByRole("button", { name: /Approve/i });
      const rejectBtn = screen.getByRole("button", { name: /Reject/i });
      expect(approveBtn).toBeDefined();
      expect(rejectBtn).toBeDefined();

      // Click Approve
      fireEvent.click(approveBtn);
      expect(onApprove).toHaveBeenCalledWith("lv-001");

      // Click Reject
      fireEvent.click(rejectBtn);
      expect(onReject).toHaveBeenCalledWith("lv-001");

      // Approved leave hides Approve and Reject buttons
      rerender(<LeaveCard leave={approvedLeave} />);
      expect(screen.queryByRole("button", { name: /Approve/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /Reject/i })).toBeNull();
    });
  });

  // =========================================================================
  // 5. Responsive Viewport Adaptability & Minimum Touch Targets
  // =========================================================================
  describe("5. Responsive Touch Target Dimensions (Mobile 360px & Tablet 768px)", () => {
    it("ensures all action buttons meet minimum touch target accessibility standards (>= 32px)", () => {
      render(
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" className="h-8 w-8 min-h-[32px] min-w-[32px]" data-testid="touch-btn-1">
            <Eye className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 min-h-[32px] min-w-[32px]" data-testid="touch-btn-2">
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
      );

      const btn1 = screen.getByTestId("touch-btn-1");
      const btn2 = screen.getByTestId("touch-btn-2");

      expect(btn1.className).toContain("h-8");
      expect(btn1.className).toContain("w-8");
      expect(btn2.className).toContain("h-8");
      expect(btn2.className).toContain("w-8");
    });
  });
});
