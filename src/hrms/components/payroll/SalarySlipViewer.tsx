import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/hrms/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/hrms/components/ui/select";
import { Download, Loader2, Printer, X } from "lucide-react";
import { toast } from "@/hrms/components/ui/use-toast";
import {
  salaryTemplateService, SalarySlipData, SalaryTemplate,
  CanvasElement, ElementStyle,
} from "@/hrms/services/salaryTemplateService";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const INR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const DEFAULT_CW = 794;
const DEFAULT_CH = 1123;

const getED = (el: CanvasElement, key: string, fallback: string) =>
  (el.extraData?.[key]) || fallback;

// ─── Canvas slip renderer ─────────────────────────────────────────────────────

function resolveData(slip: SalarySlipData): Record<string, string> {
  return {
    employeeName: slip.employeeName,
    employeeId: slip.employeeId,
    designation: slip.designation,
    department: slip.department,
    dateOfJoining: slip.dateOfJoining,
    payPeriod: slip.payPeriod,
    payDate: slip.payDate,
    panNumber: slip.panNumber,
    uanNumber: slip.uanNumber,
    totalDays: String(slip.totalDays),
    presentDays: String(slip.presentDays),
    absentDays: String(slip.absentDays),
    leaveDays: String(slip.leaveDays),
    lopDays: String(slip.lopDays),
    overtimeHours: String(slip.overtimeHours),
    grossSalary: INR(slip.grossSalary),
    totalEarnings: INR(slip.totalEarnings),
    totalDeductions: INR(slip.totalDeductions),
    netPay: INR(slip.netPay),
    bankName: slip.bankName,
    accountNumber: slip.accountNumber,
    ifscCode: slip.ifscCode,
    paymentMode: slip.paymentMode,
  };
}

const SECTION_DEFAULTS: Record<string, string> = {
  companyHeader: "SALARY SLIP", infoGrid: "Employee Information",
  earningsTable: "Earnings", deductionsTable: "Deductions",
  netPayBar: "Net Pay", attendanceGrid: "Attendance Summary",
  leaveTable: "Leave Details", bankGrid: "Bank Details",
};

const sf = (el: CanvasElement, base: number, ref = 11) =>
  el.style.fontSize ? Math.max(6, Math.round(el.style.fontSize * (base / ref))) : base;

function toCSS(s: ElementStyle = {}): React.CSSProperties {
  return {
    fontSize: s.fontSize ? `${s.fontSize}px` : undefined,
    fontWeight: s.fontWeight as any,
    fontStyle: s.fontStyle as any,
    fontFamily: s.fontFamily || undefined,
    color: s.color,
    backgroundColor: s.backgroundColor,
    border: s.borderWidth ? `${s.borderWidth}px ${s.borderStyle || "solid"} ${s.borderColor || "transparent"}` : undefined,
    borderRadius: s.borderRadius !== undefined ? `${s.borderRadius}px` : undefined,
    padding: `${s.paddingTop ?? 0}px ${s.paddingRight ?? 0}px ${s.paddingBottom ?? 0}px ${s.paddingLeft ?? 0}px`,
    textAlign: s.textAlign as any,
    opacity: s.opacity,
    letterSpacing: s.letterSpacing ? `${s.letterSpacing}px` : undefined,
    lineHeight: s.lineHeight,
    overflow: "hidden", width: "100%", height: "100%", boxSizing: "border-box",
  };
}

function SlipElemContent({ el, slip }: { el: CanvasElement; slip: SalarySlipData }) {
  const data = resolveData(slip);
  const cs = toCSS(el.style);

  if (el.type === "text" || el.type === "heading") {
    return <div style={{ ...cs, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{el.content || ""}</div>;
  }

  if (el.type === "dynamicField") {
    return (
      <div style={{ ...cs, display: "flex", alignItems: "center" }}>
        {data[el.dataKey || ""] ?? `{{${el.dataKey}}}`}
      </div>
    );
  }

  if (el.type === "companyHeader") {
    const t = slip.template;
    const titleLabel = el.content || SECTION_DEFAULTS.companyHeader;
    const nameFs = el.style.fontSize || 20;
    const logoSize = sf(el, 52, 20);
    // el.src (set in canvas editor) takes priority over template.companyLogoUrl
    const logoSrc = el.src || t?.companyLogoUrl || "";
    const companyName = getED(el, "companyName", t?.companyName || "Company Name");
    const companyAddress = getED(el, "companyAddress", t?.companyAddress || "");
    return (
      <div style={{ ...cs, display: "flex", alignItems: "center", gap: 14 }}>
        {logoSrc
          ? <img src={logoSrc} alt="Logo"
            style={{ width: logoSize, height: logoSize, borderRadius: 10, objectFit: "contain", flexShrink: 0, background: "rgba(255,255,255,0.2)", padding: 4 }}
            onError={e => (e.currentTarget.style.display = "none")} />
          : <div style={{ width: logoSize, height: logoSize, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: sf(el, 28, 20) }}>🏢</div>
        }
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: "bold", fontSize: nameFs, color: el.style.color || "#fff" }}>{companyName}</div>
          {companyAddress && <div style={{ fontSize: sf(el, 11, 20), opacity: 0.75, marginTop: 3, color: el.style.color || "#fff" }}>{companyAddress}</div>}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: sf(el, 10, 20), opacity: 0.7, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, color: el.style.color || "#fff" }}>{titleLabel}</div>
          <div style={{ fontSize: sf(el, 16, 20), fontWeight: "bold", marginTop: 2, color: el.style.color || "#fff" }}>{slip.payPeriod}</div>
          <div style={{ fontSize: sf(el, 10, 20), opacity: 0.7, marginTop: 1, color: el.style.color || "#fff" }}>Pay Date: {slip.payDate}</div>
        </div>
      </div>
    );
  }

  if (el.type === "infoGrid") {
    const fields: [string, string][] = [
      [getED(el, "f1", "Employee Name"), slip.employeeName],
      [getED(el, "f2", "Employee ID"), slip.employeeId],
      [getED(el, "f3", "Designation"), slip.designation],
      [getED(el, "f4", "Department"), slip.department],
      [getED(el, "f5", "Date of Joining"), slip.dateOfJoining],
      [getED(el, "f6", "Pay Period"), slip.payPeriod],
      [getED(el, "f7", "PAN Number"), slip.panNumber],
      [getED(el, "f8", "Pay Date"), slip.payDate],
    ];
    const title = el.content || SECTION_DEFAULTS.infoGrid;
    return (
      <div style={{ ...cs }}>
        {title && <div style={{ fontSize: sf(el, 9), fontWeight: 700, textTransform: "uppercase", color: el.style.color || "#16a34a", letterSpacing: 1, marginBottom: 8 }}>{title}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px 0" }}>
          {fields.map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: sf(el, 9), textTransform: "uppercase", color: "#94a3b8", fontWeight: 700, letterSpacing: 0.8 }}>{l}</div>
              <div style={{ fontSize: sf(el, 11), fontWeight: 600, color: "#1e293b", marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (el.type === "earningsTable") {
    const title = el.content || SECTION_DEFAULTS.earningsTable;
    const earnColor = el.style.color || "#16a34a";
    const col1 = getED(el, "col1", "Component");
    const col2 = getED(el, "col2", "Amount");
    const totalLabel = getED(el, "total", "Total Earnings");
    return (
      <div style={cs}>
        <div style={{ fontSize: sf(el, 10), fontWeight: 700, textTransform: "uppercase", color: earnColor, letterSpacing: 1, marginBottom: 6 }}>{title}</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: sf(el, 11) }}>
          <thead><tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0", paddingBottom: 4, color: "#64748b", fontWeight: 600 }}>{col1}</th>
            <th style={{ textAlign: "right", borderBottom: "1px solid #e2e8f0", paddingBottom: 4, color: "#64748b", fontWeight: 600 }}>{col2}</th>
          </tr></thead>
          <tbody>
            {slip.earnings.map(e => <tr key={e.label}><td style={{ paddingTop: 3, paddingBottom: 3, color: "#475569" }}>{e.label}</td><td style={{ textAlign: "right", color: "#1e293b", fontWeight: 500 }}>{INR(e.amount)}</td></tr>)}
            <tr style={{ borderTop: "2px solid #e2e8f0" }}>
              <td style={{ paddingTop: 4, fontWeight: 700, color: "#1e293b" }}>{totalLabel}</td>
              <td style={{ textAlign: "right", fontWeight: 700, color: earnColor, paddingTop: 4 }}>{INR(slip.totalEarnings)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (el.type === "deductionsTable") {
    const title = el.content || SECTION_DEFAULTS.deductionsTable;
    const dedColor = el.style.color || "#ef4444";
    const col1 = getED(el, "col1", "Component");
    const col2 = getED(el, "col2", "Amount");
    const totalLabel = getED(el, "total", "Total Deductions");
    return (
      <div style={cs}>
        <div style={{ fontSize: sf(el, 10), fontWeight: 700, textTransform: "uppercase", color: dedColor, letterSpacing: 1, marginBottom: 6 }}>{title}</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: sf(el, 11) }}>
          <thead><tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #fecaca", paddingBottom: 4, color: "#64748b", fontWeight: 600 }}>{col1}</th>
            <th style={{ textAlign: "right", borderBottom: "1px solid #fecaca", paddingBottom: 4, color: "#64748b", fontWeight: 600 }}>{col2}</th>
          </tr></thead>
          <tbody>
            {slip.deductions.length === 0
              ? <tr><td colSpan={2} style={{ textAlign: "center", color: "#94a3b8", fontStyle: "italic", paddingTop: 8 }}>No deductions</td></tr>
              : slip.deductions.map(d => <tr key={d.label}><td style={{ paddingTop: 3, paddingBottom: 3, color: "#475569" }}>{d.label}</td><td style={{ textAlign: "right", color: dedColor, fontWeight: 500 }}>{INR(d.amount)}</td></tr>)
            }
            <tr style={{ borderTop: "2px solid #fecaca" }}>
              <td style={{ paddingTop: 4, fontWeight: 700, color: "#1e293b" }}>{totalLabel}</td>
              <td style={{ textAlign: "right", fontWeight: 700, color: dedColor, paddingTop: 4 }}>{INR(slip.totalDeductions)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (el.type === "netPayBar") {
    const title = el.content || SECTION_DEFAULTS.netPayBar;
    const netColor = el.style.color || "#16a34a";
    const subtitle = getED(el, "subtitle", `Gross ${INR(slip.grossSalary)} − Deductions ${INR(slip.totalDeductions)}`);
    return (
      <div style={{ ...cs, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: sf(el, 11), fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: netColor }}>{title}</div>
          <div style={{ fontSize: sf(el, 10), color: "#64748b", marginTop: 2 }}>{subtitle}</div>
        </div>
        <div style={{ fontSize: sf(el, 26), fontWeight: 900, color: netColor }}>{INR(slip.netPay)}</div>
      </div>
    );
  }

  if (el.type === "attendanceGrid") {
    const stats: [string, number][] = [
      [getED(el, "s1", "Total Days"), slip.totalDays],
      [getED(el, "s2", "Present"), slip.presentDays],
      [getED(el, "s3", "Absent"), slip.absentDays],
      [getED(el, "s4", "Paid Leave"), slip.leaveDays],
      [getED(el, "s5", "LOP"), slip.lopDays],
      [getED(el, "s6", "OT Hours"), slip.overtimeHours],
    ];
    const title = el.content || SECTION_DEFAULTS.attendanceGrid;
    return (
      <div style={{ ...cs }}>
        {title && <div style={{ fontSize: sf(el, 9), fontWeight: 700, textTransform: "uppercase", color: el.style.color || "#16a34a", letterSpacing: 1, marginBottom: 8 }}>{title}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
          {stats.map(([l, v]) => (
            <div key={l} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 4px", textAlign: "center" }}>
              <div style={{ fontSize: sf(el, 16), fontWeight: 700, color: "#1e293b" }}>{v}</div>
              <div style={{ fontSize: sf(el, 9), color: "#94a3b8", marginTop: 2, lineHeight: 1.2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (el.type === "leaveTable") {
    const title = el.content || SECTION_DEFAULTS.leaveTable;
    const leaveColor = el.style.color || "#16a34a";
    const headers = [
      getED(el, "col1", "Leave Type"),
      getED(el, "col2", "Entitled"),
      getED(el, "col3", "Taken"),
      getED(el, "col4", "Balance"),
    ];
    return (
      <div style={cs}>
        <div style={{ fontSize: sf(el, 10), fontWeight: 700, textTransform: "uppercase", color: leaveColor, letterSpacing: 1, marginBottom: 6 }}>{title}</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: sf(el, 11) }}>
          <thead><tr>
            {headers.map((h, i) => (
              <th key={i} style={{ textAlign: i === 0 ? "left" : "right", borderBottom: "1px solid #e2e8f0", paddingBottom: 4, color: "#64748b", fontWeight: 600 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {slip.leaveBalances.length === 0
              ? <tr><td colSpan={4} style={{ textAlign: "center", color: "#94a3b8", fontStyle: "italic", paddingTop: 8 }}>No leave data</td></tr>
              : slip.leaveBalances.map(l => (
                <tr key={l.type}>
                  <td style={{ paddingTop: 3, paddingBottom: 3, color: "#475569" }}>{l.type}</td>
                  <td style={{ textAlign: "right", color: "#475569" }}>{l.entitled}</td>
                  <td style={{ textAlign: "right", color: "#475569" }}>{l.taken}</td>
                  <td style={{ textAlign: "right", fontWeight: 600, color: leaveColor }}>{l.balance}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    );
  }

  if (el.type === "bankGrid") {
    const fields: [string, string][] = [
      [getED(el, "f1", "Bank Name"), slip.bankName],
      [getED(el, "f2", "Account Number"), slip.accountNumber],
      [getED(el, "f3", "IFSC Code"), slip.ifscCode],
      [getED(el, "f4", "Payment Mode"), slip.paymentMode],
    ];
    const title = el.content || SECTION_DEFAULTS.bankGrid;
    return (
      <div style={{ ...cs }}>
        {title && <div style={{ fontSize: sf(el, 9), fontWeight: 700, textTransform: "uppercase", color: el.style.color || "#16a34a", letterSpacing: 1, marginBottom: 8 }}>{title}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px 0" }}>
          {fields.map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: sf(el, 9), textTransform: "uppercase", color: "#94a3b8", fontWeight: 700, letterSpacing: 0.8 }}>{l}</div>
              <div style={{ fontSize: sf(el, 11), fontWeight: 600, color: "#1e293b", marginTop: 2, fontFamily: "monospace" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (el.type === "divider") return <div style={{ width: "100%", height: "100%", backgroundColor: el.style.backgroundColor || "#e2e8f0" }} />;
  if (el.type === "image") return el.src
    ? <img src={el.src} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: el.style.borderRadius || 0 }} />
    : null;
  if (el.type === "rect") return <div style={cs} />;
  return null;
}

// ─── HTML Slip Renderer ───────────────────────────────────────────────────────
// Renders the stored renderedHtml (tokens already substituted by backend).

function HtmlSlipRenderer({ html, canvasWidth, canvasHeight }: {
  html: string;
  canvasWidth?: number;
  canvasHeight?: number;
}) {
  const CW = canvasWidth  || DEFAULT_CW;
  const CH = canvasHeight || DEFAULT_CH;
  const [scale, setScale] = useState(0.9);
  const containerRef = useRef<HTMLDivElement>(null);
  const cwRef = useRef(CW);
  useEffect(() => { cwRef.current = CW; }, [CW]);

  useEffect(() => {
    const obs = new ResizeObserver(([entry]) => {
      setScale(Math.min((entry.contentRect.width - 48) / cwRef.current, 1));
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (containerRef.current)
      setScale(Math.min((containerRef.current.clientWidth - 48) / CW, 1));
  }, [CW]);

  return (
    <div ref={containerRef} className="w-full max-w-4xl mx-auto">
      <div style={{ width: CW * scale, height: CH * scale, position: "relative", margin: "0 auto" }}>
        <div
          id="canvas-slip-root"
          style={{
            width: CW, height: CH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

function CanvasSlipRenderer({ slip, elements, canvasBg, canvasWidth, canvasHeight }: {
  slip: SalarySlipData;
  elements: CanvasElement[];
  canvasBg: string;
  canvasWidth?: number;
  canvasHeight?: number;
}) {
  const CW = canvasWidth || DEFAULT_CW;
  const CH = canvasHeight || DEFAULT_CH;
  const [scale, setScale] = useState(0.9);
  const containerRef = useRef<HTMLDivElement>(null);
  const cwRef = useRef(CW);
  useEffect(() => { cwRef.current = CW; }, [CW]);

  useEffect(() => {
    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setScale(Math.min((w - 48) / cwRef.current, 1));
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      setScale(Math.min((containerRef.current.clientWidth - 48) / CW, 1));
    }
  }, [CW]);

  return (
    <div ref={containerRef} className="w-full">
      <div style={{ width: CW * scale, height: CH * scale, position: "relative", margin: "0 auto" }}>
        <div
          id="canvas-slip-root"
          style={{
            width: CW, height: CH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "absolute",
            background: canvasBg,
            boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          {[...elements].sort((a, b) => a.zIndex - b.zIndex).map(el => (
            <div
              key={el.elId}
              style={{
                position: "absolute", left: el.x, top: el.y,
                width: el.width, height: el.height, zIndex: el.zIndex,
              }}
            >
              <SlipElemContent el={el} slip={slip} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main viewer ──────────────────────────────────────────────────────────────

interface Props {
  payrollId: string;
  onClose: () => void;
  // Defaults to the admin-facing endpoint (any payrollId). The staff
  // self-service page passes salaryTemplateService.getMyPayrollSlip instead,
  // which is scoped server-side to the logged-in employee's own records.
  fetchSlip?: (payrollId: string, templateId?: string) => Promise<SalarySlipData>;
}

export default function SalarySlipViewer({ payrollId, onClose, fetchSlip = salaryTemplateService.getPayrollSlip }: Props) {
  const [slip, setSlip] = useState<SalarySlipData | null>(null);
  const [templates, setTemplates] = useState<SalaryTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("__default__");
  const [isLoading, setIsLoading] = useState(true);
  const slipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const [tmplList, slipData] = await Promise.all([
          salaryTemplateService.getAll(),
          fetchSlip(payrollId),
        ]);
        setTemplates(tmplList);
        setSlip(slipData);
      } catch (err: any) {
        toast({ title: err.message || "Failed to load salary slip", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    })();
  }, [payrollId]);

  const handleTemplateChange = async (val: string) => {
    setSelectedTemplateId(val);
    setIsLoading(true);
    try {
      const templateId = val === "__default__" ? undefined : val;
      const slipData = await fetchSlip(payrollId, templateId);
      setSlip(slipData);
    } catch (err: any) {
      toast({ title: err.message || "Failed to reload slip", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const openPrintWindow = (downloadMode = false) => {
    const t = slip?.template;
    const safeName   = (slip?.employeeName || "Employee").replace(/\s+/g, "_");
    const safePeriod = (slip?.payPeriod    || "Slip").replace(/\s+/g, "_");
    const title      = `Salary_Slip_${safeName}_${safePeriod}`;

    const BASE_CSS = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { width: 794px; background: #fff; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
      @page { margin: 0; size: 794px 1123px; }
      @media print {
        *, *::before, *::after {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;

    const openWin = (bodyHtml: string, extraCss = "") => {
      const win = window.open("", "_blank", "width=900,height=800");
      if (!win) return;
      win.document.write(`<!DOCTYPE html><html><head>
        <title>${title}</title><meta charset="UTF-8"/>
        <style>${BASE_CSS}${extraCss}</style>
      </head><body>${bodyHtml}
      <script>
        window.onload = () => {
          setTimeout(() => {
            window.print();
            ${!downloadMode ? 'window.close();' : ''}
          }, 500);
        };
      </script>
      </body></html>`);
      win.document.close();
      win.focus();
    };

    // ── Priority 1: stored rendered HTML (HTML template path) ──
    if (hasHtml) {
      openWin(htmlContent, `html,body{height:1123px;overflow:hidden;}`);
      return;
    }

    // ── Priority 2: canvas elements path ──
    const isCanvas = !!(t?.elements && t.elements.length > 0);
    if (isCanvas) {
      const canvasRoot = document.getElementById("canvas-slip-root");
      if (!canvasRoot) return;
      const clone = canvasRoot.cloneNode(true) as HTMLElement;
      clone.style.transform      = "none";
      clone.style.transformOrigin = "top left";
      clone.style.position       = "relative";
      clone.style.width          = "794px";
      clone.style.height         = "1123px";
      clone.style.overflow       = "hidden";
      openWin(clone.outerHTML, `html,body{height:1123px;overflow:hidden;}`);
      return;
    }

    // ── Priority 3: legacy structured template ──
    if (!slipRef.current) return;
    const legacyClone = slipRef.current.cloneNode(true) as HTMLElement;
    legacyClone.style.maxWidth    = "none";
    legacyClone.style.width       = "794px";
    legacyClone.style.borderRadius = "0";
    legacyClone.style.boxShadow   = "none";
    legacyClone.style.border      = "none";
    openWin(legacyClone.outerHTML, `@page{margin:10mm 12mm;size:A4 portrait;}body{font-size:12px;color:#1e293b;}`);
  };

  const handlePrint = () => openPrintWindow(false);
  const handleDownloadPdf = () => openPrintWindow(true);

  const t = slip?.template;
  let htmlContent = slip?.renderedHtml || "";
  if (htmlContent) {
    // Force Inter font over whatever the raw HTML generated using !important
    htmlContent = `<style>* { font-family: 'Inter', system-ui, -apple-system, sans-serif !important; }</style>` + htmlContent;
  }
  const hasHtml  = !!htmlContent;
  const isCanvas = !hasHtml && !!(t?.elements && t.elements.length > 0);
  const headerColor = t?.headerColor || "#4F46E5";
  const accentColor = t?.accentColor || "#6366F1";
  const sections = t?.sections ?? {
    earnings: true, deductions: true, attendance: true, leaveDetails: true, bankDetails: true,
  };

  // Rendered via a portal straight into <body> — this component is mounted
  // deep inside DashboardLayout's sidebar wrapper, which (like shadcn's
  // Sidebar primitive generally does) applies a CSS transform for its
  // collapse animation. A transformed ancestor becomes the containing block
  // for any `position: fixed` descendant, so without the portal this overlay
  // was positioning itself relative to that wrapper instead of the real
  // viewport — showing up offset from the top instead of covering the screen.
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-100/80 backdrop-blur-sm">
      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-800">Salary Slip</span>
          {slip && (
            <span className="text-xs text-slate-400 font-medium">
              {slip.employeeName} · {slip.payPeriod}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
            <SelectTrigger className="h-8 text-xs font-semibold rounded-xl bg-slate-50 border-slate-200 w-44">
              <SelectValue placeholder="Select Template" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100 shadow-2xl">
              <SelectItem value="__default__" className="text-xs font-semibold">Default Template</SelectItem>
              {templates.map(tmpl => (
                <SelectItem key={tmpl._id} value={tmpl._id} className="text-xs">
                  {tmpl.name}
                  {tmpl.isDefault && <span className="ml-1 text-emerald-600 text-[10px]">(default)</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="rounded-xl text-xs h-8 border-slate-200 text-slate-600 gap-1.5" onClick={handleDownloadPdf} disabled={isLoading || !slip}>
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl text-xs h-8 border-slate-200 text-slate-600 gap-1.5" onClick={handlePrint} disabled={isLoading || !slip}>
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-slate-500 hover:bg-slate-100" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-slate-100" style={{ padding: "24px 32px" }}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-slate-500">Generating slip…</p>
          </div>
        ) : !slip ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <p className="text-sm text-slate-500">Failed to load salary slip.</p>
          </div>
        ) : hasHtml ? (
          /* ── HTML template rendering (primary path) ── */
          <HtmlSlipRenderer
            html={slip!.renderedHtml!}
            canvasWidth={t?.canvasWidth}
            canvasHeight={t?.canvasHeight}
          />
        ) : isCanvas ? (
          /* ── Canvas elements rendering (fallback for templates without htmlTemplate) ── */
          <div className="w-full max-w-4xl mx-auto">
            <CanvasSlipRenderer
              slip={slip}
              elements={t!.elements!}
              canvasBg={t?.canvasBg || "#ffffff"}
              canvasWidth={t?.canvasWidth}
              canvasHeight={t?.canvasHeight}
            />
          </div>
        ) : (
          /* ── Legacy structured rendering ── */
          <div
            ref={slipRef}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl mx-auto overflow-hidden"
          >
            {/* Company Header */}
            <div className="px-8 py-6 text-white" style={{ background: headerColor }}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {t?.companyLogoUrl && (
                    <img src={t.companyLogoUrl} alt="Logo" className="h-12 w-12 rounded-xl object-contain bg-white/20 p-1" onError={e => (e.currentTarget.style.display = "none")} />
                  )}
                  <div>
                    <h1 className="text-lg font-bold leading-tight">{t?.companyName || "Company Name"}</h1>
                    {t?.companyAddress && <p className="text-xs opacity-80 mt-0.5 max-w-sm leading-relaxed">{t.companyAddress}</p>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs uppercase tracking-widest opacity-70 font-semibold">Salary Slip</p>
                  <p className="text-base font-bold mt-0.5">{slip.payPeriod}</p>
                  <p className="text-xs opacity-70 mt-0.5">Pay Date: {slip.payDate}</p>
                </div>
              </div>
            </div>

            {/* Employee Info */}
            <div className="px-8 py-5 border-b border-slate-100">
              <h2 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: accentColor }}>Employee Information</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
                {[
                  { label: "Employee Name", value: slip.employeeName }, { label: "Employee ID", value: slip.employeeId },
                  { label: "Designation", value: slip.designation }, { label: "Department", value: slip.department },
                  { label: "Date of Joining", value: slip.dateOfJoining }, { label: "Pay Period", value: slip.payPeriod },
                  { label: "PAN Number", value: slip.panNumber }, { label: "UAN Number", value: slip.uanNumber },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wide">{label}</p>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance */}
            {sections.attendance && (
              <div className="px-8 py-5 border-b border-slate-100">
                <h2 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: accentColor }}>Attendance Summary</h2>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {[
                    { label: "Total Days", value: slip.totalDays }, { label: "Present", value: slip.presentDays },
                    { label: "Absent", value: slip.absentDays }, { label: "Paid Leave", value: slip.leaveDays },
                    { label: "LOP", value: slip.lopDays }, { label: "OT Hours", value: slip.overtimeHours },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl bg-slate-50 border border-slate-100 py-2.5 px-3 text-center">
                      <p className="text-base font-bold text-slate-700">{value}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Leave Details */}
            {sections.leaveDetails && slip.leaveBalances.length > 0 && (
              <div className="px-8 py-5 border-b border-slate-100">
                <h2 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: accentColor }}>Leave Details</h2>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-left">
                      {["Leave Type", "Entitled", "Taken", "Balance"].map((h, i) => (
                        <th key={h} className={`pb-2 ${i > 0 ? "text-right pr-4" : "pr-4"} text-slate-500 font-semibold border-b border-slate-200`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {slip.leaveBalances.map(lb => (
                      <tr key={lb.type}>
                        <td className="py-2 pr-4 font-medium text-slate-700">{lb.type}</td>
                        <td className="py-2 pr-4 text-right text-slate-600">{lb.entitled}</td>
                        <td className="py-2 pr-4 text-right text-slate-600">{lb.taken}</td>
                        <td className="py-2 text-right font-semibold" style={{ color: accentColor }}>{lb.balance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Earnings + Deductions */}
            {(sections.earnings || sections.deductions) && (
              <div className="px-8 py-5 border-b border-slate-100">
                <div className="grid grid-cols-2 gap-6">
                  {sections.earnings && (
                    <div>
                      <h2 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: accentColor }}>Earnings</h2>
                      <table className="w-full text-xs border-collapse">
                        <thead><tr className="text-left border-b border-slate-200">
                          <th className="pb-2 text-slate-500 font-semibold">Component</th>
                          <th className="pb-2 text-right text-slate-500 font-semibold">Amount</th>
                        </tr></thead>
                        <tbody>
                          {slip.earnings.map(e => <tr key={e.label}><td className="py-1.5 text-slate-600">{e.label}</td><td className="py-1.5 text-right text-slate-700 font-medium">{INR(e.amount)}</td></tr>)}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-slate-200">
                            <td className="pt-2 font-bold text-slate-800">Total Earnings</td>
                            <td className="pt-2 text-right font-bold" style={{ color: accentColor }}>{INR(slip.totalEarnings)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                  {sections.deductions && (
                    <div>
                      <h2 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: "#ef4444" }}>Deductions</h2>
                      <table className="w-full text-xs border-collapse">
                        <thead><tr className="text-left border-b border-slate-200">
                          <th className="pb-2 text-slate-500 font-semibold">Component</th>
                          <th className="pb-2 text-right text-slate-500 font-semibold">Amount</th>
                        </tr></thead>
                        <tbody>
                          {slip.deductions.length === 0
                            ? <tr><td colSpan={2} className="py-3 text-center text-slate-400 italic">No deductions</td></tr>
                            : slip.deductions.map(d => <tr key={d.label}><td className="py-1.5 text-slate-600">{d.label}</td><td className="py-1.5 text-right text-red-600 font-medium">{INR(d.amount)}</td></tr>)
                          }
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-slate-200">
                            <td className="pt-2 font-bold text-slate-800">Total Deductions</td>
                            <td className="pt-2 text-right font-bold text-red-600">{INR(slip.totalDeductions)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Net Pay */}
            <div className="px-8 py-4 border-b border-slate-100" style={{ background: `${headerColor}12` }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>Net Pay</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Gross {INR(slip.grossSalary)} − Deductions {INR(slip.totalDeductions)}</p>
                </div>
                <p className="text-2xl font-extrabold" style={{ color: headerColor }}>{INR(slip.netPay)}</p>
              </div>
            </div>

            {/* Bank Details */}
            {sections.bankDetails && (
              <div className="px-8 py-5 border-b border-slate-100">
                <h2 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: accentColor }}>Bank Details</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
                  {[
                    { label: "Bank Name", value: slip.bankName }, { label: "Account Number", value: slip.accountNumber },
                    { label: "IFSC Code", value: slip.ifscCode }, { label: "Payment Mode", value: slip.paymentMode },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wide">{label}</p>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5 font-mono">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Fields */}
            {t?.customFields && t.customFields.length > 0 && (
              <div className="px-8 py-5 border-b border-slate-100">
                <h2 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: accentColor }}>Additional Information</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                  {t.customFields.map(f => (
                    <div key={f.fieldKey}>
                      <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wide">{f.label}</p>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5">—</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                {t?.footerNote || "This is a computer-generated salary slip and does not require a signature."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
