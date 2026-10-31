// Estimates / Quotations Calculation Engine & GST Validation Tests
import { describe, it, expect } from "vitest";

describe("Estimates Calculation Engine & GST Rules", () => {
  // 1. Subtotal calculation
  describe("Subtotal Calculation", () => {
    it("computes item amount accurately with qty * rate", () => {
      const items = [
        { id: "1", qty: 5, rate: 200 },       // 1,000
        { id: "2", qty: 2.5, rate: 400 },     // 1,000
        { id: "3", qty: 10, rate: 50.5 },     // 505
      ];

      const subTotal = items.reduce((acc, item) => acc + (item.qty * item.rate), 0);
      expect(subTotal).toBe(2505);
    });

    it("respects manually overridden amounts if specified", () => {
      const items = [
        { id: "1", qty: 2, rate: 500, amount: 950, amountOverridden: true }, // custom special negotiated rate
        { id: "2", qty: 1, rate: 100 },
      ];

      const itemAmount = (item: any) => item.amount ?? (item.qty * item.rate);
      const subTotal = items.reduce((acc, item) => acc + itemAmount(item), 0);
      expect(subTotal).toBe(1050);
    });
  });

  // 2. Discount logic (Percentage vs Flat)
  describe("Discount Calculation Logic", () => {
    it("computes percentage discount correctly", () => {
      const subTotal = 10000;
      const discountType = "percent";
      const discountValue = 15; // 15%

      const discountAmount = discountType === "percent" ? (subTotal * (discountValue / 100)) : discountValue;
      expect(discountAmount).toBe(1500);
      expect(subTotal - discountAmount).toBe(8500);
    });

    it("computes flat discount correctly", () => {
      const subTotal = 10000;
      const discountType = "fixed";
      const discountValue = 750; // flat ₹750 off

      const discountAmount = discountType === "percent" ? (subTotal * (discountValue / 100)) : discountValue;
      expect(discountAmount).toBe(750);
      expect(subTotal - discountAmount).toBe(9250);
    });

    it("handles zero or 'no_discount' without altering subtotal", () => {
      const subTotal = 5000;
      const discount_type = "no_discount";
      const discountAmount = discount_type === "no_discount" ? 0 : 500;
      expect(discountAmount).toBe(0);
      expect(subTotal - discountAmount).toBe(5000);
    });
  });

  // 3. Indian GST Tax Calculation on Post-Discount Amount
  describe("GST Calculation on Taxable Base", () => {
    it("charges GST on the discounted taxable amount, NOT the gross subtotal", () => {
      // Subtotal = 10,000, 10% discount = 1,000. Taxable = 9,000.
      // 18% GST on 9,000 = 1,620.
      // Total = 9,000 + 1,620 = 10,620.
      const items = [{ id: "1", qty: 10, rate: 1000, taxRate: 18 }];
      const subTotal = items.reduce((acc, i) => acc + (i.qty * i.rate), 0); // 10,000
      const discountAmount = subTotal * (10 / 100); // 1,000
      const discountFactor = subTotal > 0 ? 1 - discountAmount / subTotal : 1; // 0.9

      const totalTax = items.reduce((acc, item) => {
        return acc + ((item.qty * item.rate) * discountFactor * (item.taxRate / 100));
      }, 0);

      expect(totalTax).toBe(1620);
      const total = subTotal - discountAmount + totalTax;
      expect(total).toBe(10620);
    });

    it("splits intra-state GST into equal CGST (9%) and SGST (9%)", () => {
      const taxableAmount = 9000;
      const gstRate = 18;
      const isIntraState = true; // Gujarat to Gujarat

      if (isIntraState) {
        const cgstRate = gstRate / 2;
        const sgstRate = gstRate / 2;
        const cgstAmount = taxableAmount * (cgstRate / 100);
        const sgstAmount = taxableAmount * (sgstRate / 100);

        expect(cgstRate).toBe(9);
        expect(sgstRate).toBe(9);
        expect(cgstAmount).toBe(810);
        expect(sgstAmount).toBe(810);
        expect(cgstAmount + sgstAmount).toBe(1620);
      }
    });

    it("applies full IGST (18%) for inter-state transactions", () => {
      const taxableAmount = 9000;
      const gstRate = 18;
      const isIntraState = false; // Gujarat to Maharashtra

      const igstAmount = taxableAmount * (gstRate / 100);
      expect(igstAmount).toBe(1620);
    });
  });

  // 4. State Detection from Address String
  describe("State Detection from Address", () => {
    const isStateGujarat = (address: string) => {
      const lower = address.toLowerCase();
      const INDIAN_STATES = [
        "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh",
        "goa", "gujarat", "haryana", "himachal pradesh", "jharkhand", "karnataka",
        "kerala", "madhya pradesh", "maharashtra", "manipur", "meghalaya", "mizoram",
        "nagaland", "odisha", "punjab", "rajasthan", "sikkim", "tamil nadu",
        "telangana", "tripura", "uttar pradesh", "uttarakhand", "west bengal", "delhi"
      ];
      const sorted = [...INDIAN_STATES].sort((x, y) => y.length - x.length);
      const detected = sorted.find((s) => lower.includes(s)) || "";
      return detected ? detected === "gujarat" : true; // default to local if unspecified
    };

    it("identifies Gujarat address as intra-state", () => {
      expect(isStateGujarat("Shop 4, Ring Road, Surat, Gujarat, 395002")).toBe(true);
      expect(isStateGujarat("Ahmedabad, GUJARAT")).toBe(true);
    });

    it("identifies non-Gujarat address as inter-state", () => {
      expect(isStateGujarat("Andheri West, Mumbai, Maharashtra 400058")).toBe(false);
      expect(isStateGujarat("Whitefield, Bengaluru, Karnataka")).toBe(false);
      expect(isStateGujarat("Connaught Place, New Delhi, Delhi")).toBe(false);
    });
  });

  // 5. Convert to Invoice Lifecycle & Statuses
  describe("Estimate to Invoice Conversion Rules", () => {
    it("marks estimate as accepted and assigns invoice reference", () => {
      const estimate = {
        _id: "est-123",
        number: "EST-2026-0042",
        status: "sent",
        subtotal: 10000,
        total: 11800,
        invoice_id: null as any,
      };

      // Conversion trigger
      const convertToInvoice = (est: typeof estimate, newInvoiceId: string) => {
        return {
          ...est,
          status: "accepted",
          invoice_id: newInvoiceId,
          converted_date: new Date().toISOString(),
        };
      };

      const converted = convertToInvoice(estimate, "inv-999");
      expect(converted.status).toBe("accepted");
      expect(converted.invoice_id).toBe("inv-999");
      expect(converted.converted_date).toBeTruthy();
    });
  });
});

