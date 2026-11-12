// Leads — GAP UI component tests (the existing leads.ui.component.test.tsx only re-implements
// helper logic inline). These render the REAL components with mocked services:
// - lib/whatsappQuickChat + <WhatsAppQuickChat> (12-leads.md rule 3 and suspected bug #3)
// - <ConvertLeadDialog> (convert form validation, double-click, cancel, server error)
// Each test states the CORRECT behaviour; a failing test = a UI bug.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const settings = vi.hoisted(() => ({ current: { whatsappQcEnabled: true, companyName: "Trinetra", whatsappQcTemplates: undefined as any } }));
const leadSvc = vi.hoisted(() => ({ convertToCustomer: vi.fn() }));
const sonner = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("@/context/SettingsContext", () => ({
  useSettings: () => ({ getSetting: (k: string, d: any) => ((settings.current as any)[k] ?? d) }),
}));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ user: { firstname: "Asha", lastname: "Patel" } }) }));
vi.mock("@/api/services/lead.service", () => ({ leadService: leadSvc }));
vi.mock("@/api/services/item.service", () => ({ itemService: { getAll: vi.fn(async () => []) } }));
vi.mock("@/context/CurrencyContext", () => ({ useCurrency: () => ({ symbol: "₹", formatAmount: (n: number) => `₹${n}` }) }));
vi.mock("sonner", () => ({ toast: sonner }));

import { normalizeWhatsappPhone, buildWhatsappUrl, resolveWhatsappTemplate } from "@/lib/whatsappQuickChat";
import { WhatsAppQuickChat } from "@/components/shared/WhatsAppQuickChat";
import { ConvertLeadDialog } from "@/components/leads/ConvertLeadDialog";

afterEach(() => cleanup());

describe("[unit] lib/whatsappQuickChat phone normalisation (rule 3 / suspected #3)", () => {
  it.each([
    ["9876543210", "919876543210"],
    ["+91 98765 43210", "919876543210"],
    ["+91-98765-43210", "919876543210"],
    ["919876543210", "919876543210"],
  ])("[unit] %s -> %s (country code kept / prepended)", (input, out) => {
    expect(normalizeWhatsappPhone(input)).toBe(out);
  });

  it("[unit][suspected #3] leading zero is stripped: '09876543210' -> '919876543210'", () => {
    expect(normalizeWhatsappPhone("09876543210")).toBe("919876543210");
  });

  it("[unit][suspected #3] '+91 09876543210' (trunk zero after +91) -> '919876543210'", () => {
    expect(normalizeWhatsappPhone("+91 09876543210")).toBe("919876543210");
  });

  it.each([[""], [null], [undefined], ["12345"], ["abcdefghij"]])("[unit] unusable phone %p -> null (icon hidden)", (p) => {
    expect(normalizeWhatsappPhone(p as any)).toBeNull();
  });

  it("[unit] template placeholders resolved; unknown ones become ''", () => {
    expect(resolveWhatsappTemplate("Hi {customer_name} #{invoice_no}", { customer_name: "Ravi" })).toBe("Hi Ravi #");
    expect(resolveWhatsappTemplate("   ", { customer_name: "Ravi", company_name: "X" })).toBe("Hi Ravi, this is X.");
  });

  it("[unit] buildWhatsappUrl encodes the message (XSS / & / spaces safe in the URL)", () => {
    const url = buildWhatsappUrl("+91 98765 43210", "Hi {customer_name}", { customer_name: "<b>A&B</b>" })!;
    expect(url.startsWith("https://wa.me/919876543210?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toBe("Hi <b>A&B</b>");
  });
});

describe("[ui] <WhatsAppQuickChat> on a lead phone", () => {
  beforeEach(() => { settings.current = { whatsappQcEnabled: true, companyName: "Trinetra", whatsappQcTemplates: undefined }; });

  it("[ui] enabled + valid phone: click opens wa.me with +91 kept as 91 and the template filled", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<WhatsAppQuickChat phone="+91 98765 43210" data={{ customer_name: "Ravi" }} />);
    fireEvent.click(screen.getByTitle("Chat on WhatsApp"));
    expect(open).toHaveBeenCalledTimes(1);
    const [url, target, features] = open.mock.calls[0] as any[];
    expect(url).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/);
    expect(decodeURIComponent(url.split("text=")[1])).toBe("Hi Ravi, this is Trinetra.");
    expect(target).toBe("_blank");
    expect(features).toContain("noopener");
    open.mockRestore();
  });

  it("[ui][suspected #3] a phone saved with a trunk zero '09876543210' opens wa.me/919876543210", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<WhatsAppQuickChat phone="09876543210" />);
    fireEvent.click(screen.getByTitle("Chat on WhatsApp"));
    expect(String(open.mock.calls[0]?.[0])).toMatch(/^https:\/\/wa\.me\/919876543210\?/);
    open.mockRestore();
  });

  it("[ui] feature OFF: plain phone text, no WhatsApp button", () => {
    settings.current.whatsappQcEnabled = false;
    render(<WhatsAppQuickChat phone="9876543210" />);
    expect(screen.getByText("9876543210")).toBeInTheDocument();
    expect(screen.queryByTitle("Chat on WhatsApp")).not.toBeInTheDocument();
  });

  it("[ui] invalid phone: plain text, no broken link", () => {
    render(<WhatsAppQuickChat phone="12345" />);
    expect(screen.queryByTitle("Chat on WhatsApp")).not.toBeInTheDocument();
  });

  it("[ui] no phone: renders nothing", () => {
    const { container } = render(<WhatsAppQuickChat phone="" />);
    expect(container.innerHTML).toBe("");
  });
});

describe("[ui] <ConvertLeadDialog>", () => {
  const lead = { _id: "L1", name: "Asha Patel", phonenumber: "9876543210", source: { name: "Website" } };
  const renderDlg = (props: any = {}) => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const onOpenChange = vi.fn();
    const onConverted = vi.fn();
    render(
      <QueryClientProvider client={qc}>
        <ConvertLeadDialog lead={lead} open onOpenChange={onOpenChange} onConverted={onConverted} {...props} />
      </QueryClientProvider>
    );
    return { onOpenChange, onConverted };
  };
  const nameBox = () => screen.getByPlaceholderText(/root canal/i);
  const amountBox = () => document.querySelector('input[type="number"]') as HTMLInputElement;
  const convertBtn = () => screen.getByRole("button", { name: /convert to patient/i });

  beforeEach(() => {
    vi.clearAllMocks();
    leadSvc.convertToCustomer.mockResolvedValue({ message: "ok" });
  });

  it("[ui] shows the lead name, phone and source; Convert disabled until name + amount are valid", () => {
    renderDlg();
    expect(screen.getByText(/Asha Patel · 9876543210/)).toBeInTheDocument();
    expect(screen.getByText("Website")).toBeInTheDocument();
    expect(convertBtn()).toBeDisabled();
    fireEvent.change(nameBox(), { target: { value: "Root canal" } });
    expect(convertBtn()).toBeDisabled();
    fireEvent.change(amountBox(), { target: { value: "5000" } });
    expect(convertBtn()).toBeEnabled();
  });

  it("[ui] treatment name of only spaces keeps Convert disabled", () => {
    renderDlg();
    fireEvent.change(nameBox(), { target: { value: "    " } });
    fireEvent.change(amountBox(), { target: { value: "5000" } });
    expect(convertBtn()).toBeDisabled();
  });

  it("[ui] negative amount keeps Convert disabled", () => {
    renderDlg();
    fireEvent.change(nameBox(), { target: { value: "Cleaning" } });
    fireEvent.change(amountBox(), { target: { value: "-1" } });
    expect(convertBtn()).toBeDisabled();
  });

  it("[ui] treatment name input is capped at 200 chars, notes at 2000", () => {
    renderDlg();
    expect(nameBox().getAttribute("maxLength")).toBe("200");
    expect(document.querySelector("textarea")!.getAttribute("maxLength")).toBe("2000");
  });

  it("[ui] valid convert sends trimmed name + numeric amount, toasts success, closes and calls onConverted", async () => {
    const { onOpenChange, onConverted } = renderDlg();
    fireEvent.change(nameBox(), { target: { value: "  Shah & Sons <Implant>  " } });
    fireEvent.change(amountBox(), { target: { value: "12500.5" } });
    fireEvent.click(convertBtn());
    await waitFor(() => expect(leadSvc.convertToCustomer).toHaveBeenCalledTimes(1));
    const [id, body] = leadSvc.convertToCustomer.mock.calls[0];
    expect(id).toBe("L1");
    expect(body).toEqual(expect.objectContaining({ treatment_name: "Shah & Sons <Implant>", treatment_amount: 12500.5, treatment_item: undefined }));
    await waitFor(() => expect(sonner.success).toHaveBeenCalled());
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConverted).toHaveBeenCalled();
  });

  it("[ui] double-click Convert sends only ONE request (button disabled while pending)", async () => {
    leadSvc.convertToCustomer.mockImplementation(() => new Promise((r) => setTimeout(() => r({}), 50)));
    renderDlg();
    fireEvent.change(nameBox(), { target: { value: "Braces" } });
    fireEvent.change(amountBox(), { target: { value: "100" } });
    fireEvent.click(convertBtn());
    await waitFor(() => expect(screen.getByRole("button", { name: /converting/i })).toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: /converting/i }));
    await new Promise((r) => setTimeout(r, 100));
    expect(leadSvc.convertToCustomer).toHaveBeenCalledTimes(1);
  });

  it("[ui] server error shows the server message as an error toast and keeps the dialog open", async () => {
    leadSvc.convertToCustomer.mockRejectedValueOnce({ response: { data: { message: "This lead has already been converted" } } });
    const { onOpenChange } = renderDlg();
    fireEvent.change(nameBox(), { target: { value: "Braces" } });
    fireEvent.change(amountBox(), { target: { value: "100" } });
    fireEvent.click(convertBtn());
    await waitFor(() => expect(sonner.error).toHaveBeenCalledWith("This lead has already been converted"));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("[ui] Cancel closes without calling the API", () => {
    const { onOpenChange } = renderDlg();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(leadSvc.convertToCustomer).not.toHaveBeenCalled();
  });

  it("[ui] lead = null renders nothing", () => {
    const qc = new QueryClient();
    const { container } = render(<QueryClientProvider client={qc}><ConvertLeadDialog lead={null} open onOpenChange={() => {}} /></QueryClientProvider>);
    expect(container.innerHTML).toBe("");
  });
});
