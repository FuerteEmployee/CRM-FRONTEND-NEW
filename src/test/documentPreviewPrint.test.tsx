// Invoice / Estimate / Proposal preview > "Print / PDF": the print dialog must
// open ONCE. Before the fix it opened twice (once when the stylesheets loaded,
// again from the 1.5 s fallback), so it came back right after Cancel.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/api/services/sales.service", () => ({ salesService: { getPaymentsByInvoice: vi.fn(async () => []), getInvoiceById: vi.fn(async () => ({})) } }));
vi.mock("@/api/services/estimate.service", () => ({ estimateService: { getById: vi.fn(async () => ({})) } }));
vi.mock("@/api/services/settings.service", () => ({ settingsService: { getSettings: vi.fn(async () => []) } }));
vi.mock("@/context/CurrencyContext", () => ({ useCurrency: () => ({ symbol: "₹" }) }));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ user: { _id: "me", email: "me@example.com" }, can: () => true }) }));

import { DocumentPreviewDialog } from "@/components/DocumentPreviewDialog";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

afterEach(() => {
  cleanup();
  document.head.querySelectorAll("link[data-test]").forEach((l) => l.remove());
});

describe("Print / PDF from the document preview", () => {
  it("opens the print dialog only once, even when the stylesheets load AND the fallback timer runs", async () => {
    // A page stylesheet, like the app's real ones (copied into the print frame).
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "data:text/css,body{}";
    css.setAttribute("data-test", "1");
    document.head.appendChild(css);

    const prints: number[] = [];
    // Catch the hidden print frame as soon as it is added; count print() calls
    // and make its stylesheets report "loaded" (jsdom does not load them).
    const obs = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach((n: any) => {
        if (n.tagName !== "IFRAME") return;
        n.contentWindow.print = () => prints.push(Date.now());
        n.contentWindow.focus = () => {}; // not implemented in jsdom
        setTimeout(() => n.contentDocument.head.querySelectorAll("link[rel='stylesheet']").forEach((l: any) => l.onload?.()), 20);
      });
    });
    obs.observe(document.body, { childList: true });

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <DocumentPreviewDialog open onOpenChange={() => {}} type="invoice" data={{ _id: "inv1", number: "P0011", items: [], total: 0 }} />
      </QueryClientProvider>
    );
    fireEvent.click(screen.getAllByRole("button", { name: /print/i })[0]);
    await wait(2200); // past the 300 ms trigger AND the 1.5 s fallback
    obs.disconnect();
    expect(prints).toHaveLength(1);
  }, 10000);
});
