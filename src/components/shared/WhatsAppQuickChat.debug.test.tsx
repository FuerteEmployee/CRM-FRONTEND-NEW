import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WhatsAppQuickChat } from "./WhatsAppQuickChat";

// Radix's Popper/DismissableLayer primitives call these DOM APIs, which
// jsdom doesn't implement — without them, Radix's internal handlers throw
// silently and the menu never opens, which would look identical to a real
// bug from the outside. Polyfilling them is required for an accurate test.
beforeAll(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture || (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture || (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
});

vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({
    getSetting: (name: string, def: any) => {
      const map: Record<string, any> = {
        whatsappQcEnabled: true,
        whatsappQcTemplates: [
          { id: "a", name: "Payment Reminder", template: "Hi {customer_name}, please pay." },
          { id: "b", name: "Follow Up", template: "Hi {customer_name}, following up." },
        ],
        companyName: "Test Co",
      };
      return map[name] !== undefined ? map[name] : def;
    },
  }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({ user: { firstname: "Staff", lastname: "Member" } }),
}));

describe("WhatsAppQuickChat with multiple templates", () => {
  it("shows a dropdown menu with template names on click, instead of opening directly", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<WhatsAppQuickChat phone="9876543210" data={{ customer_name: "John" }} />);

    const trigger = screen.getByTitle("Choose a message to send");
    expect(trigger).toBeTruthy();

    // Radix's DropdownMenuTrigger opens on pointerdown, not plain click —
    // fireEvent.click alone doesn't fire the preceding pointer event chain
    // a real browser click always produces, so simulate that sequence.
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerId: 1 });
    fireEvent.pointerUp(trigger, { button: 0, pointerId: 1 });
    fireEvent.click(trigger);

    // After clicking, the menu should show both template names, and window.open
    // should NOT have fired yet (since no specific template chosen).
    expect(openSpy).not.toHaveBeenCalled();

    console.log("trigger data-state:", trigger.getAttribute("data-state"));
    console.log("body HTML:", document.body.innerHTML);

    const item1 = screen.queryByText("Payment Reminder");
    const item2 = screen.queryByText("Follow Up");
    console.log("item1 found:", !!item1, "item2 found:", !!item2);
    expect(item1).toBeTruthy();
    expect(item2).toBeTruthy();

    if (item1) {
      fireEvent.click(item1);
      expect(openSpy).toHaveBeenCalledTimes(1);
      console.log("window.open called with:", openSpy.mock.calls[0]?.[0]);
    }
  });
});
