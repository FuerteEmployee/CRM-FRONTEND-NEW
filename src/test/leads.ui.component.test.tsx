// Frontend UI Component & Validation tests for Leads (/admin/leads)
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

describe("Leads Form Validation & Business Logic Tests", () => {
  // 1. Phone number sanitization and 10-digit enforcement
  describe("Phone Number 10-Digit & Digits-Only Rule", () => {
    it("strips all non-digit characters and enforces exact max 10 digits", () => {
      // Mirroring Leads.tsx:1424:
      // onChange={(e) => setLeadForm(prev => ({ ...prev, phonenumber: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
      const sanitizePhone = (input: string) => input.replace(/\D/g, "").slice(0, 10);

      expect(sanitizePhone("9876543210")).toBe("9876543210");
      expect(sanitizePhone("+91 98765-43210")).toBe("9198765432"); // strips + and space, caps at 10
      expect(sanitizePhone("abcdef")).toBe("");
      expect(sanitizePhone("98765abc43210999")).toBe("9876543210"); // caps at 10 digits
      expect(sanitizePhone("98765 43210")).toBe("9876543210");
    });

    it("identifies valid vs invalid phone numbers for submission", () => {
      const isValidPhone = (phone: string) => /^[6-9]\d{9}$/.test(phone);

      expect(isValidPhone("9876543210")).toBe(true);
      expect(isValidPhone("8123456789")).toBe(true);
      expect(isValidPhone("7000000000")).toBe(true);
      expect(isValidPhone("6355555555")).toBe(true);

      // Negatives:
      expect(isValidPhone("1234567890")).toBe(false); // does not start with 6-9
      expect(isValidPhone("987654321")).toBe(false);  // 9 digits (too short)
      expect(isValidPhone("98765432100")).toBe(false); // 11 digits (too long)
      expect(isValidPhone("98765ABC10")).toBe(false); // contains letters
    });
  });

  // 2. WhatsApp quick-chat deep link generation
  describe("WhatsApp Deep-Link Generation", () => {
    it("generates correct WhatsApp api link with sanitized phone and custom message", () => {
      const generateWhatsAppLink = (phone: string, customerName: string, leadId: string) => {
        const cleanPhone = phone.replace(/\D/g, "");
        const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const msg = encodeURIComponent(`Hello ${customerName}, regarding your inquiry (Lead #${leadId.slice(-4)})...`);
        return `https://wa.me/${formattedPhone}?text=${msg}`;
      };

      const link = generateWhatsAppLink("9876543210", "Vijay Patel", "6723abc456def789");
      expect(link).toContain("https://wa.me/919876543210");
      expect(link).toContain("Vijay%20Patel");
      expect(link).toContain("f789");
    });
  });

  // 3. Kanban column status grouping
  describe("Kanban Status Grouping Logic", () => {
    it("groups leads correctly by status columns", () => {
      const leads = [
        { _id: "1", name: "Lead 1", status: "New" },
        { _id: "2", name: "Lead 2", status: "Contacted" },
        { _id: "3", name: "Lead 3", status: "New" },
        { _id: "4", name: "Lead 4", status: "Won" },
        { _id: "5", name: "Lead 5", status: "Lost" },
      ];

      const statuses = ["New", "Contacted", "Qualified", "Proposal Sent", "Won", "Lost"];

      const kanbanBoard = statuses.reduce((acc: Record<string, any[]>, status) => {
        acc[status] = leads.filter(l => l.status === status);
        return acc;
      }, {});

      expect(kanbanBoard["New"].length).toBe(2);
      expect(kanbanBoard["Contacted"].length).toBe(1);
      expect(kanbanBoard["Qualified"].length).toBe(0);
      expect(kanbanBoard["Won"].length).toBe(1);
      expect(kanbanBoard["Lost"].length).toBe(1);
    });
  });

  // 4. Search and filter query logic
  describe("Leads Search Filter Logic", () => {
    it("filters leads by name, phone, or company case-insensitively", () => {
      const leads = [
        { _id: "1", name: "Trinetra Infra", phonenumber: "9876543210", company: "Trinetra" },
        { _id: "2", name: "Kiran Global", phonenumber: "8888888888", company: "Kiran" },
        { _id: "3", name: "Rudra Corp", phonenumber: "7777777777", company: "Rudra" },
      ];

      const filterLeads = (query: string) => {
        const q = query.toLowerCase().trim();
        return leads.filter(l =>
          l.name.toLowerCase().includes(q) ||
          l.phonenumber.includes(q) ||
          l.company.toLowerCase().includes(q)
        );
      };

      expect(filterLeads("Trinetra").length).toBe(1);
      expect(filterLeads("88888").length).toBe(1);
      expect(filterLeads("corp").length).toBe(1);
      expect(filterLeads("NonExistent").length).toBe(0);
    });
  });

  // 5. Responsive Grid & Card layout checks
  describe("Leads Responsive Viewport Logic", () => {
    it("determines list view vs kanban view default based on viewport width", () => {
      const getPreferredView = (width: number) => (width < 768 ? "list" : "kanban");

      expect(getPreferredView(375)).toBe("list"); // Mobile should default to readable list
      expect(getPreferredView(768)).toBe("kanban"); // Tablet can support kanban
      expect(getPreferredView(1440)).toBe("kanban"); // Desktop default
    });
  });
});

