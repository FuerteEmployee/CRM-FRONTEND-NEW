// Frontend UI Component & Business Logic tests for HRMS (/hrms/*)
import { describe, it, expect } from "vitest";

describe("HRMS Frontend Validation & Payroll Display Rules", () => {
  // 1. Leave Application Date Boundary
  describe("Leave Application Date Boundaries", () => {
    const validateLeaveDates = (fromDateStr: string, toDateStr: string) => {
      const from = new Date(fromDateStr);
      const to = new Date(toDateStr);

      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return { valid: false, error: "Invalid date format" };
      }
      if (to < from) {
        return { valid: false, error: "To Date cannot be earlier than From Date" };
      }

      // Calculate days inclusive
      const diffTime = to.getTime() - from.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      return { valid: true, days: diffDays };
    };

    it("accepts same-day leave (single day)", () => {
      const res = validateLeaveDates("2026-11-01", "2026-11-01");
      expect(res.valid).toBe(true);
      expect(res.days).toBe(1);
    });

    it("accepts multi-day leave and computes total days accurately", () => {
      const res = validateLeaveDates("2026-11-01", "2026-11-05");
      expect(res.valid).toBe(true);
      expect(res.days).toBe(5);
    });

    it("rejects when To Date is earlier than From Date", () => {
      const res = validateLeaveDates("2026-11-05", "2026-11-01");
      expect(res.valid).toBe(false);
      expect(res.error).toBe("To Date cannot be earlier than From Date");
    });
  });

  // 2. Salary Slip Calculations (PF Statutory Limit & ESIC Ceiling)
  describe("Salary Slip Display Calculations", () => {
    const calculateSalarySlip = (ctc: number, pfApplicable = true, esicApplicable = true) => {
      const basic = Math.round(ctc * 0.50); // 50% Basic
      const hra = Math.round(ctc * 0.30);   // 30% HRA
      const allowances = ctc - basic - hra; // 20% Special Allowance
      const gross = basic + hra + allowances; // equal to CTC

      // PF: 12% of Basic, capped at ₹1,800/month (statutory cap on ₹15,000 base)
      let employeePf = 0;
      if (pfApplicable) {
        employeePf = Math.min(1800, Math.round(basic * 0.12));
      }

      // ESIC: 0.75% of Gross ONLY if gross <= ₹21,000
      let employeeEsic = 0;
      if (esicApplicable && gross <= 21000) {
        employeeEsic = Math.round(gross * 0.0075);
      }

      const totalDeductions = employeePf + employeeEsic;
      const netPay = gross - totalDeductions;

      return { basic, hra, allowances, gross, employeePf, employeeEsic, totalDeductions, netPay };
    };

    it("computes correct slip for high-earning employee (CTC = ₹30,000): ESIC must be 0", () => {
      const slip = calculateSalarySlip(30000, true, true);
      expect(slip.gross).toBe(30000);
      expect(slip.basic).toBe(15000);
      expect(slip.employeePf).toBe(1800); // capped at ₹1,800
      expect(slip.employeeEsic).toBe(0);   // Gross > ₹21,000 -> ESIC exempt!
      expect(slip.totalDeductions).toBe(1800);
      expect(slip.netPay).toBe(28200);
    });

    it("computes correct slip for employee under ESIC ceiling (CTC = ₹18,000)", () => {
      const slip = calculateSalarySlip(18000, true, true);
      expect(slip.gross).toBe(18000);
      expect(slip.basic).toBe(9000);
      expect(slip.employeePf).toBe(1080); // 12% of 9000
      expect(slip.employeeEsic).toBe(135); // 0.75% of 18000 = 135
      expect(slip.totalDeductions).toBe(1215);
      expect(slip.netPay).toBe(16785);
    });
  });

  // 3. Geofence radius validation
  describe("Geofence Check-in Calculation", () => {
    // Haversine distance in meters
    const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3; // Earth radius in meters
      const phi1 = (lat1 * Math.PI) / 180;
      const phi2 = (lat2 * Math.PI) / 180;
      const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
      const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c);
    };

    const isWithinGeofence = (
      userLat: number, userLon: number,
      officeLat: number, officeLon: number,
      radiusMeters = 200
    ) => {
      const distance = getDistanceMeters(userLat, userLon, officeLat, officeLon);
      return { allowed: distance <= radiusMeters, distanceMeters: distance };
    };

    it("allows attendance check-in when employee is inside office radius (e.g. 45m away)", () => {
      const office = { lat: 21.1702, lon: 72.8311 }; // Surat center
      const employee = { lat: 21.1704, lon: 72.8313 }; // ~30m away
      const check = isWithinGeofence(employee.lat, employee.lon, office.lat, office.lon, 200);
      expect(check.allowed).toBe(true);
      expect(check.distanceMeters).toBeLessThan(200);
    });

    it("blocks attendance check-in when employee is outside office radius (e.g. 1.2km away)", () => {
      const office = { lat: 21.1702, lon: 72.8311 };
      const remote = { lat: 21.1802, lon: 72.8411 }; // ~1.5km away
      const check = isWithinGeofence(remote.lat, remote.lon, office.lat, office.lon, 200);
      expect(check.allowed).toBe(false);
      expect(check.distanceMeters).toBeGreaterThan(200);
    });
  });
});

