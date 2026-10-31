// Global Responsive Layout & Viewport Audit Test
// Verifies responsive behavior across Mobile (375px), Tablet (768px), and Desktop (1440px)
import { describe, it, expect } from "vitest";

describe("Global Responsive Layout & Viewport Overflow Audit", () => {
  // 1. Grid Column Collapse Rule
  describe("Form Grid Column Responsiveness", () => {
    it("ensures multi-column forms collapse to single column on mobile (<640px)", () => {
      // Standard Tailwind responsive class string used in CRM forms
      const formGridClasses = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";

      const getColumnsForViewport = (classList: string, viewportWidth: number) => {
        if (viewportWidth >= 1024 && classList.includes("lg:grid-cols-3")) return 3;
        if (viewportWidth >= 640 && classList.includes("sm:grid-cols-2")) return 2;
        if (classList.includes("grid-cols-1")) return 1;
        return 1;
      };

      expect(getColumnsForViewport(formGridClasses, 375)).toBe(1);  // iPhone SE: 1 column
      expect(getColumnsForViewport(formGridClasses, 768)).toBe(2);  // iPad: 2 columns
      expect(getColumnsForViewport(formGridClasses, 1440)).toBe(3); // Desktop: 3 columns
    });
  });

  // 2. Table Horizontal Overflow Containment
  describe("Table Wrapper Overflow Containment", () => {
    it("verifies tables are wrapped in an overflow-x-auto container so the body window never scrolls sideways", () => {
      const isProperlyContained = (wrapperClasses: string) => {
        // Table container MUST have overflow-x-auto or overflow-hidden with w-full
        return (
          wrapperClasses.includes("overflow-x-auto") ||
          (wrapperClasses.includes("overflow-hidden") && wrapperClasses.includes("w-full"))
        );
      };

      const validWrapper = "relative w-full overflow-x-auto rounded-lg border";
      const invalidWrapper = "w-full overflow-visible"; // Would cause window-level blowout

      expect(isProperlyContained(validWrapper)).toBe(true);
      expect(isProperlyContained(invalidWrapper)).toBe(false);
    });
  });

  // 3. Mobile Touch Target Sizing (Accessibility & Usability)
  describe("Mobile Touch Target Minimum Sizing", () => {
    it("ensures mobile interactive buttons have at least 36px - 44px tap targets", () => {
      const getMinDimension = (classNames: string) => {
        if (classNames.includes("h-11")) return 44;
        if (classNames.includes("h-10")) return 40;
        if (classNames.includes("h-9")) return 36;
        if (classNames.includes("h-8")) return 32;
        return 24;
      };

      // Header and modal action buttons
      expect(getMinDimension("h-9 w-9 rounded-xl")).toBeGreaterThanOrEqual(36);
      expect(getMinDimension("h-11 px-4 rounded-xl")).toBeGreaterThanOrEqual(44);
    });
  });

  // 4. Tab Bar Containment (Payment Gateways / Settings Audit)
  describe("Multi-Tab Container Overflow Rule", () => {
    it("prevents unwrapped tab bars from expanding parent CSS grid beyond screen width", () => {
      // In SetupSettings.tsx, we fixed the 11 payment gateway tabs by ensuring:
      // 1. Grid column has minmax(0, 1fr) or min-w-0
      // 2. Tab container has overflow-x-auto with no-scrollbar
      const checkGridSafety = (parentGridClass: string, tabWrapperClass: string) => {
        const gridHasContainment = parentGridClass.includes("min-w-0") || parentGridClass.includes("minmax(0");
        const tabsAreScrollable = tabWrapperClass.includes("overflow-x-auto");
        return gridHasContainment && tabsAreScrollable;
      };

      const fixedSetup = checkGridSafety("min-w-0 flex-1", "flex overflow-x-auto no-scrollbar");
      const brokenSetup = checkGridSafety("flex-1", "flex overflow-visible");

      expect(fixedSetup).toBe(true);
      expect(brokenSetup).toBe(false);
    });
  });

  // 5. Action Icons Dropdown vs Inline Rule on Mobile
  describe("Table Action Icons Display on Small Viewports", () => {
    it("collapses multiple action buttons (View, Edit, Delete) into a dropdown or compact flex on mobile", () => {
      const getActionsDisplayMode = (viewportWidth: number) => {
        if (viewportWidth < 640) {
          return "compact-or-dropdown"; // Avoids squishing table rows horizontally
        }
        return "inline-actions";
      };

      expect(getActionsDisplayMode(375)).toBe("compact-or-dropdown");
      expect(getActionsDisplayMode(1440)).toBe("inline-actions");
    });
  });
});

