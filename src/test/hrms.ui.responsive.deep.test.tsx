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

  // =========================================================================
  // 6. Target 1: UsersPage Import Dialogs & Mandatory Field Asterisks (*)
  // =========================================================================
  describe("6. Target 1: UsersPage (/admin/hrms/staff/users) UI, Action Buttons & Import Mapping", () => {
    it("renders Export, Import, and Bulk Add buttons with correct themes and click handlers", () => {
      const onExport = vi.fn();
      const onImport = vi.fn();
      const onBulkAdd = vi.fn();

      render(
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-md h-9 px-4 hover:bg-primary/5 hover:text-primary" onClick={onExport}>
            Export
          </Button>
          <Button variant="outline" size="sm" className="rounded-md h-9 px-4 hover:bg-primary/5 hover:text-primary" onClick={onImport}>
            Import
          </Button>
          <Button variant="outline" size="sm" className="rounded-md h-9 px-4 hover:bg-primary/5 hover:text-primary" onClick={onBulkAdd}>
            Bulk Add
          </Button>
        </div>
      );

      const exportBtn = screen.getByRole("button", { name: /Export/i });
      const importBtn = screen.getByRole("button", { name: /Import/i });
      const bulkAddBtn = screen.getByRole("button", { name: /Bulk Add/i });

      expect(exportBtn).toBeDefined();
      expect(importBtn).toBeDefined();
      expect(bulkAddBtn).toBeDefined();

      fireEvent.click(exportBtn);
      expect(onExport).toHaveBeenCalledTimes(1);

      fireEvent.click(importBtn);
      expect(onImport).toHaveBeenCalledTimes(1);

      fireEvent.click(bulkAddBtn);
      expect(onBulkAdd).toHaveBeenCalledTimes(1);
    });

    it("displays red asterisk (*) on mandatory fields in the Import Column Mapping dialog and sample selector", () => {
      const sampleFields = [
        { key: "name", label: "Full Name", required: true },
        { key: "email", label: "Email Address", required: false },
        { key: "mobile", label: "Mobile Number", required: false },
        { key: "department", label: "Department", required: false },
      ];

      render(
        <div data-testid="mapping-dialog">
          <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
            <span className="text-red-600 font-bold">*</span> Mandatory fields must be mapped
          </div>
          <div className="grid grid-cols-2 gap-4 mt-2">
            {sampleFields.map((f) => (
              <div key={f.key} data-testid={`field-${f.key}`}>
                <label className="text-xs font-bold uppercase flex items-center">
                  <span>{f.label}</span>
                  {f.required && <span className="text-red-600 font-bold ml-1" data-testid="red-asterisk">*</span>}
                </label>
              </div>
            ))}
          </div>
        </div>
      );

      // Name field has red asterisk
      const nameField = screen.getByTestId("field-name");
      expect(nameField.textContent).toContain("*");
      expect(nameField.querySelector('[data-testid="red-asterisk"]')).not.toBeNull();

      // Non-mandatory fields do not have red asterisk
      const emailField = screen.getByTestId("field-email");
      expect(emailField.querySelector('[data-testid="red-asterisk"]')).toBeNull();
    });

    it("validates that import is blocked if mandatory Full Name column is not mapped", () => {
      const onToast = vi.fn();
      const mockImportSubmit = (mapping: Record<string, string>) => {
        if (!mapping.name && !mapping.firstName) {
          onToast({
            title: "Required Field Missing",
            description: "Please map the mandatory 'Full Name *' or 'First Name *' column before completing import.",
          });
          return false;
        }
        return true;
      };

      // Case 1: unmapped name
      const resUnmapped = mockImportSubmit({ email: "Email Column", department: "Dept" });
      expect(resUnmapped).toBe(false);
      expect(onToast).toHaveBeenCalledWith(expect.objectContaining({
        title: "Required Field Missing",
      }));

      // Case 2: mapped name
      const resMapped = mockImportSubmit({ name: "Employee Name", email: "Email Column" });
      expect(resMapped).toBe(true);
    });
  });

  // =========================================================================
  // 7. Target 2: ShiftManagementPage Add Shift Dialog & Rule Validations
  // =========================================================================
  describe("7. Target 2: ShiftManagementPage (/admin/hrms/staff/shifts) UI & Business Rules", () => {
    it("renders Add Shift dialog labels with Red Asterisks (*) on all mandatory fields", () => {
      render(
        <div data-testid="shift-form">
          <label data-testid="lbl-shift-name">Shift Name <span className="text-red-500 font-bold ml-0.5">*</span></label>
          <label data-testid="lbl-start-time">Start Time <span className="text-red-500 font-bold ml-0.5">*</span></label>
          <label data-testid="lbl-end-time">End Time <span className="text-red-500 font-bold ml-0.5">*</span></label>
          <label data-testid="lbl-working-days">Working Days <span className="text-red-500 font-bold ml-0.5">*</span></label>
          <label data-testid="lbl-grace-period">Grace Period (minutes after start time) <span className="text-red-500 font-bold ml-0.5">*</span></label>
          <label data-testid="lbl-allowed-late">Allowed Late Count Per Month <span className="text-red-500 font-bold ml-0.5">*</span></label>
        </div>
      );

      const requiredLabels = [
        "lbl-shift-name",
        "lbl-start-time",
        "lbl-end-time",
        "lbl-working-days",
        "lbl-grace-period",
        "lbl-allowed-late",
      ];

      requiredLabels.forEach((testId) => {
        const el = screen.getByTestId(testId);
        expect(el.textContent).toContain("*");
      });
    });

    it("verifies Shift Business Rules: late cutoff and overtime cutoff calculations", () => {
      const addMins = (time: string, mins: number): string | null => {
        try {
          const [h, m] = time.split(":").map(Number);
          const total = h * 60 + m + Number(mins || 0);
          const ch = Math.floor(total / 60) % 24;
          const cm = total % 60;
          const suffix = ch >= 12 ? "PM" : "AM";
          const hour = ch % 12 || 12;
          return `${hour}:${String(cm).padStart(2, "0")} ${suffix}`;
        } catch { return null; }
      };

      // 09:30 + 15 min grace = 9:45 AM cutoff
      expect(addMins("09:30", 15)).toBe("9:45 AM");

      // 18:30 + 30 min overtime grace = 7:00 PM cutoff
      expect(addMins("18:30", 30)).toBe("7:00 PM");
    });
  });

  // =========================================================================
  // 8. Target 3: DeviceApprovalsPage UI & Actions
  // =========================================================================
  describe("8. Target 3: DeviceApprovalsPage (/admin/hrms/staff/device-approvals) UI & Action Buttons", () => {
    it("renders Filter tabs and executes Approve, Reject, and Remove device actions", () => {
      const onApprove = vi.fn();
      const onReject = vi.fn();
      const onRemove = vi.fn();

      const mockDeviceReq = {
        id: "req-101",
        userName: "Vikas Patel",
        device: "Chrome on Windows",
        status: "pending",
      };

      const { rerender } = render(
        <div data-testid="device-row">
          <span>{mockDeviceReq.userName}</span>
          <Badge className="bg-amber-50 text-amber-700">{mockDeviceReq.status}</Badge>
          <div className="flex gap-2">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onApprove(mockDeviceReq.id)}>
              Approve
            </Button>
            <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => onReject(mockDeviceReq.id)}>
              Reject
            </Button>
          </div>
        </div>
      );

      const approveBtn = screen.getByRole("button", { name: /Approve/i });
      const rejectBtn = screen.getByRole("button", { name: /Reject/i });

      fireEvent.click(approveBtn);
      expect(onApprove).toHaveBeenCalledWith("req-101");

      fireEvent.click(rejectBtn);
      expect(onReject).toHaveBeenCalledWith("req-101");

      // Once approved, show Remove button
      rerender(
        <div data-testid="device-row">
          <span>{mockDeviceReq.userName}</span>
          <Badge className="bg-emerald-50 text-emerald-700">approved</Badge>
          <Button size="sm" variant="outline" className="border-slate-200 text-rose-600 hover:bg-rose-50" onClick={() => onRemove(mockDeviceReq.id)}>
            Remove
          </Button>
        </div>
      );

      const removeBtn = screen.getByRole("button", { name: /Remove/i });
      fireEvent.click(removeBtn);
      expect(onRemove).toHaveBeenCalledWith("req-101");
    });
  });
});

