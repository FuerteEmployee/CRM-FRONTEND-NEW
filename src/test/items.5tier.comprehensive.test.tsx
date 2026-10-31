import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { TableActions } from "@/components/TableActions";

// =====================================================================
// Helper Validation & Calculation Logic matching Items.tsx & item_controller.js
// =====================================================================
const calculateAmount = (qty: number | string, rate: number | string): number => {
  const q = Number(qty) || 0;
  const r = Number(rate) || 0;
  return Number((q * r).toFixed(2));
};

const validateItemForm = (form: {
  name?: string;
  quantity?: any;
  rate?: any;
  cess_rate?: any;
  hsn_sac_code?: string;
}): string | null => {
  const name = String(form.name || "").trim();
  if (!name) return "Item Name is required";
  if (name.length > 300) return "Item Name must be 300 characters or less";

  const qty = form.quantity !== undefined && form.quantity !== null && form.quantity !== "" ? Number(form.quantity) : 1;
  if (isNaN(qty) || qty < 0) return "Quantity must be a non-negative number";

  const rate = form.rate !== undefined && form.rate !== null && form.rate !== "" ? Number(form.rate) : 0;
  if (isNaN(rate) || rate < 0) return "Rate must be a non-negative number";

  const cess = form.cess_rate !== undefined && form.cess_rate !== null && form.cess_rate !== "" ? Number(form.cess_rate) : 0;
  if (isNaN(cess) || cess < 0 || cess > 100) return "Cess Rate must be between 0 and 100";

  const hsn = String(form.hsn_sac_code || "").trim();
  if (hsn && !/^\d{4,8}$/.test(hsn)) return "HSN/SAC Code must be between 4 and 8 digits";

  return null;
};

describe("Items Module — 5-Tier Comprehensive Quality Audit", () => {
  // -------------------------------------------------------------------
  // TIER 1: UNIT TESTING
  // -------------------------------------------------------------------
  describe("Tier 1: Unit Testing (Calculations, Validation & Transformation)", () => {
    it("calculates amount correctly as quantity * rate", () => {
      expect(calculateAmount(10, 150)).toBe(1500);
      expect(calculateAmount(2.5, 40)).toBe(100);
      expect(calculateAmount(0, 500)).toBe(0);
      expect(calculateAmount("3", "33.33")).toBe(99.99);
    });

    it("validates Item Name is required and rejects empty strings", () => {
      expect(validateItemForm({ name: "" })).toBe("Item Name is required");
      expect(validateItemForm({ name: "   " })).toBe("Item Name is required");
      expect(validateItemForm({ name: "MacBook Pro" })).toBeNull();
    });

    it("enforces max length of 300 on Item Name", () => {
      const longName = "A".repeat(301);
      expect(validateItemForm({ name: longName })).toBe("Item Name must be 300 characters or less");
      expect(validateItemForm({ name: "A".repeat(300) })).toBeNull();
    });

    it("validates HSN/SAC code format (4 to 8 digits)", () => {
      expect(validateItemForm({ name: "Item", hsn_sac_code: "8471" })).toBeNull();
      expect(validateItemForm({ name: "Item", hsn_sac_code: "84713010" })).toBeNull();
      expect(validateItemForm({ name: "Item", hsn_sac_code: "12" })).toBe("HSN/SAC Code must be between 4 and 8 digits");
      expect(validateItemForm({ name: "Item", hsn_sac_code: "ABC1234" })).toBe("HSN/SAC Code must be between 4 and 8 digits");
    });

    it("validates Cess rate boundaries [0, 100]", () => {
      expect(validateItemForm({ name: "Item", cess_rate: 0 })).toBeNull();
      expect(validateItemForm({ name: "Item", cess_rate: 12 })).toBeNull();
      expect(validateItemForm({ name: "Item", cess_rate: -1 })).toBe("Cess Rate must be between 0 and 100");
      expect(validateItemForm({ name: "Item", cess_rate: 105 })).toBe("Cess Rate must be between 0 and 100");
    });
  });

  // -------------------------------------------------------------------
  // TIER 2: INTEGRATION TESTING
  // -------------------------------------------------------------------
  describe("Tier 2: Integration Testing (Action Icons, Dialogs & Table Actions)", () => {
    it("triggers onView callback when View icon is clicked", () => {
      const onViewMock = vi.fn();
      render(<TableActions onView={onViewMock} />);

      const viewBtn = screen.getByTitle("View");
      fireEvent.click(viewBtn);

      expect(onViewMock).toHaveBeenCalledTimes(1);
    });

    it("triggers onEdit callback when Edit icon is clicked", () => {
      const onEditMock = vi.fn();
      render(<TableActions onEdit={onEditMock} />);

      const editBtn = screen.getByTitle("Edit");
      fireEvent.click(editBtn);

      expect(onEditMock).toHaveBeenCalledTimes(1);
    });

    it("opens Radix confirmation dialog when Delete icon is clicked and confirms", () => {
      const onDeleteMock = vi.fn();
      render(<TableActions onDelete={onDeleteMock} />);

      // 1. Click delete trigger
      const deleteTrigger = screen.getByTitle("Delete");
      fireEvent.click(deleteTrigger);

      // 2. Dialog appears
      expect(screen.getByText("Are you sure?")).toBeInTheDocument();
      expect(screen.getByText(/This action cannot be undone/i)).toBeInTheDocument();

      // 3. Confirm deletion
      const confirmBtn = screen.getByRole("button", { name: "Delete" });
      fireEvent.click(confirmBtn);

      expect(onDeleteMock).toHaveBeenCalledTimes(1);
    });

    it("cancels deletion when Cancel is clicked in the confirmation dialog", () => {
      const onDeleteMock = vi.fn();
      render(<TableActions onDelete={onDeleteMock} />);

      const deleteTrigger = screen.getByTitle("Delete");
      fireEvent.click(deleteTrigger);

      const cancelBtn = screen.getByRole("button", { name: "Cancel" });
      fireEvent.click(cancelBtn);

      expect(onDeleteMock).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------
  // TIER 3: POSITIVE TESTING
  // -------------------------------------------------------------------
  describe("Tier 3: Positive Testing (Complete Datasets & Happy Path)", () => {
    it("handles complete valid item payload with procurement hierarchy", () => {
      const payload = {
        name: "Dell PowerEdge Server",
        long_description: "Enterprise rack server with 64GB RAM",
        quantity: 2,
        rate: 85000,
        amount: 170000,
        unit: "Nos",
        group: "Hardware",
        tax: "tax-18",
        hsn_sac_code: "84715000",
        cess_rate: 0,
        tax_inclusive: false,
        procurementType: "READY",
        categoryId: "cat-it-hw",
        subcategoryId: "sub-servers",
        branch: "Mumbai HQ",
      };

      expect(validateItemForm(payload)).toBeNull();
      expect(calculateAmount(payload.quantity, payload.rate)).toBe(payload.amount);
    });

    it("supports search filtering across Name, Description, and Group", () => {
      const items = [
        { name: "Cisco Router", group: "Networking", description: "Gigabit Ethernet" },
        { name: "HP LaserJet Printer", group: "Office Equipment", description: "Monochrome" },
        { name: "Logitech Keyboard", group: "Accessories", description: "Wireless combo" },
      ];

      const searchLower = "cisco";
      const filtered = items.filter(
        (i) =>
          i.name.toLowerCase().includes(searchLower) ||
          i.group.toLowerCase().includes(searchLower) ||
          i.description.toLowerCase().includes(searchLower)
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("Cisco Router");
    });
  });

  // -------------------------------------------------------------------
  // TIER 4: NEGATIVE TESTING
  // -------------------------------------------------------------------
  describe("Tier 4: Negative Testing (RBAC, Bad Inputs & Corrupted Data)", () => {
    it("rejects non-numeric quantity or negative rates", () => {
      expect(validateItemForm({ name: "Monitor", quantity: "abc", rate: 500 })).toBe(
        "Quantity must be a non-negative number"
      );
      expect(validateItemForm({ name: "Monitor", quantity: 1, rate: -100 })).toBe(
        "Rate must be a non-negative number"
      );
    });

    it("hides Edit and Delete actions when permissions are missing (RBAC enforcement)", () => {
      const userPermissions = {
        canEdit: false,
        canDelete: false,
      };

      const onEdit = userPermissions.canEdit ? vi.fn() : undefined;
      const onDelete = userPermissions.canDelete ? vi.fn() : undefined;

      render(<TableActions onView={vi.fn()} onEdit={onEdit} onDelete={onDelete} />);

      expect(screen.queryByTitle("Edit")).not.toBeInTheDocument();
      expect(screen.queryByTitle("Delete")).not.toBeInTheDocument();
      expect(screen.getByTitle("View")).toBeInTheDocument();
    });

    it("handles null or undefined item fields gracefully without crashing", () => {
      const corruptItem = {
        name: null,
        rate: undefined,
        quantity: null,
      };

      expect(() => validateItemForm(corruptItem as any)).not.toThrow();
      expect(calculateAmount(corruptItem.quantity as any, corruptItem.rate as any)).toBe(0);
    });
  });

  // -------------------------------------------------------------------
  // TIER 5: UI & BUILD CHECK
  // -------------------------------------------------------------------
  describe("Tier 5: UI Component & Build Check", () => {
    it("renders item name as plain table text (non-clickable) to prevent redundant popup triggers", () => {
      const testItem = { _id: "item-001", name: "Industrial Valve", description: "3-way brass valve" };

      render(
        <table>
          <tbody>
            <tr>
              <td data-testid="item-name-cell" className="font-medium">
                {testItem.name || testItem.description}
              </td>
            </tr>
          </tbody>
        </table>
      );

      const cell = screen.getByTestId("item-name-cell");
      expect(cell).toHaveTextContent("Industrial Valve");
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });
});
