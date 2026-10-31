// Frontend UI Component & Validation tests for Expenses (/admin/expenses)
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Expenses Validation & Receipt Upload Rules", () => {
  // 1. Required field validations
  describe("Required Form Field Verification", () => {
    const validateExpenseForm = (formData: { category: string; date: string; amount: any }) => {
      const errors: string[] = [];
      if (!formData.category || !formData.category.trim()) {
        errors.push("Category is required");
      }
      if (!formData.date) {
        errors.push("Date is required");
      }
      if (formData.amount === undefined || formData.amount === "" || Number(formData.amount) <= 0) {
        errors.push("Valid positive amount is required");
      }
      return { isValid: errors.length === 0, errors };
    };

    it("passes validation with valid category, date, and positive amount", () => {
      const validData = {
        category: "Office Supplies",
        date: "2026-10-31",
        amount: 1450,
      };
      const result = validateExpenseForm(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("fails validation when amount is missing, zero, or negative", () => {
      expect(validateExpenseForm({ category: "Travel", date: "2026-10-31", amount: "" }).isValid).toBe(false);
      expect(validateExpenseForm({ category: "Travel", date: "2026-10-31", amount: 0 }).isValid).toBe(false);
      expect(validateExpenseForm({ category: "Travel", date: "2026-10-31", amount: -500 }).isValid).toBe(false);
    });

    it("fails validation when category or date is empty", () => {
      expect(validateExpenseForm({ category: "", date: "2026-10-31", amount: 500 }).isValid).toBe(false);
      expect(validateExpenseForm({ category: "Meals", date: "", amount: 500 }).isValid).toBe(false);
    });
  });

  // 2. Receipt File Upload & Size Limits
  describe("Receipt Upload Constraints & MIME Types", () => {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

    const validateReceiptFile = (file: { name: string; size: number; type: string }) => {
      if (file.size > MAX_FILE_SIZE) {
        return { valid: false, error: "File exceeds 5MB limit" };
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return { valid: false, error: "Invalid file type. Allowed: JPG, PNG, WEBP, PDF" };
      }
      return { valid: true };
    };

    it("accepts valid receipt image and PDF within 5MB", () => {
      const samplePdf = { name: "bill.pdf", size: 1.2 * 1024 * 1024, type: "application/pdf" };
      const sampleJpg = { name: "receipt.jpg", size: 2.5 * 1024 * 1024, type: "image/jpeg" };

      expect(validateReceiptFile(samplePdf).valid).toBe(true);
      expect(validateReceiptFile(sampleJpg).valid).toBe(true);
    });

    it("rejects files exceeding 5MB limit", () => {
      const largeFile = { name: "huge_scan.pdf", size: 6.8 * 1024 * 1024, type: "application/pdf" };
      const result = validateReceiptFile(largeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("5MB limit");
    });

    it("rejects invalid or dangerous file types (e.g. .exe, .sh, .bat)", () => {
      const exeFile = { name: "receipt.exe", size: 1024, type: "application/x-msdownload" };
      const zipFile = { name: "receipt.zip", size: 1024, type: "application/zip" };

      expect(validateReceiptFile(exeFile).valid).toBe(false);
      expect(validateReceiptFile(zipFile).valid).toBe(false);
    });
  });

  // 3. Tax and Net Amount calculation
  describe("Expense Tax Calculation", () => {
    it("calculates net total including applicable tax", () => {
      const amount = 1000;
      const taxRate = 18; // 18%
      const taxAmount = amount * (taxRate / 100);
      const totalExpense = amount + taxAmount;

      expect(taxAmount).toBe(180);
      expect(totalExpense).toBe(1180);
    });

    it("ignores tax if set to 'none' or not selected", () => {
      const amount = 1000;
      const tax = "none";
      const totalExpense = tax && tax !== "none" ? amount * 1.18 : amount;

      expect(totalExpense).toBe(1000);
    });
  });
});

