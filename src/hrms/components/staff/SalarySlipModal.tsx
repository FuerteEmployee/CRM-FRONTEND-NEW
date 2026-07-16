import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/hrms/components/ui/dialog";
import { Button } from "@/hrms/components/ui/button";
import { Printer, Loader2 } from "lucide-react";
import { staffService } from "@/hrms/services/staffService";
import { employeeApi } from "@/hrms/services/api";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function fmt(n: number): string {
  return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toWords(num: number): string {
  const ones = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
    "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
  const tens = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  function c(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? " "+ones[n%10] : "");
    if (n < 1000) return ones[Math.floor(n/100)]+" Hundred"+(n%100 ? " "+c(n%100) : "");
    if (n < 100000) return c(Math.floor(n/1000))+" Thousand"+(n%1000 ? " "+c(n%1000) : "");
    if (n < 10000000) return c(Math.floor(n/100000))+" Lakh"+(n%100000 ? " "+c(n%100000) : "");
    return c(Math.floor(n/10000000))+" Crore"+(n%10000000 ? " "+c(n%10000000) : "");
  }
  const rupees = Math.floor(num);
  const paise  = Math.round((num - rupees) * 100);
  return (c(rupees) || "Zero") + " Rupees" + (paise > 0 ? " and "+c(paise)+" Paise" : "") + " Only";
}

/* ─── ICON SVGS (inline) ─────────────────────────────────────── */
const ICON_LOC  = `<svg width="10" height="10" viewBox="0 0 24 24" fill="#4B36B1" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`;
const ICON_MAIL = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4B36B1" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>`;
const ICON_TEL  = `<svg width="10" height="10" viewBox="0 0 24 24" fill="#4B36B1" xmlns="http://www.w3.org/2000/svg"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>`;
const ICON_DOC  = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4B36B1" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
const ICON_WALLET = `<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="6" width="20" height="14" rx="2" ry="2"/><path d="M16 14h.01"/><path d="M2 10h20"/><path d="M7 6V4a2 2 0 0 1 4 0v2"/></svg>`;

/* ─── INFO ROW helper ─────────────────────────────────────────── */
function infoRow(l1: string, v1: string, l2: string, v2: string): string {
  const tdLabel = `style="width:18%;font-weight:700;color:#4B36B1;font-size:10.5px;padding:5px 0;white-space:nowrap;"`;
  const tdColon = `style="width:2%;font-weight:700;color:#4B36B1;font-size:10.5px;padding:5px 0;"`;
  const tdVal   = `style="width:30%;font-size:10.5px;padding:5px 8px 5px 2px;border-bottom:0.5px solid #f0f0f0;"`;
  return `<tr>
    <td ${tdLabel}>${l1}</td><td ${tdColon}>:</td><td ${tdVal}>${v1}</td>
    <td ${tdLabel}>${l2}</td><td ${tdColon}>:</td><td ${tdVal}>${v2}</td>
  </tr>`;
}

/* ─── YTD ROW helper ──────────────────────────────────────────── */
function ytdRow(label: string, amount: number): string {
  return `<tr>
    <td style="font-size:10.5px;color:#333;padding:4px 0;">${label}</td>
    <td style="font-size:10.5px;color:#333;text-align:right;padding:4px 0;font-weight:600;">&#8377; ${fmt(amount)}</td>
  </tr>`;
}

/* ══════════════════════════════════════════════════════════════
   BUILD FULL A4 HTML
══════════════════════════════════════════════════════════════ */
interface SlipParams {
  logoUrl: string;
  storeName: string;
  storeAddress: string;
  storeEmail: string;
  storePhone: string;
  storeGstin: string;
  monthName: string;
  year: number;
  empName: string;
  empCode: string;
  designation: string;
  department: string;
  joiningDate: string;
  pan: string;
  bankName: string;
  accountNo: string;
  uan: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  paidAt: string;
  payableDays: number;
  presentDays: number;
  earnings: { label: string; amount: number }[];
  deductions: { label: string; amount: number }[];
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  ytdEarnings: number;
  ytdDeductions: number;
  ytdNetPay: number;
  employerPf: number;
  employerEsic: number;
  totalEmployerContrib: number;
}

function buildSlipHTML(p: SlipParams): string {
  const maxRows = Math.max(p.earnings.length, p.deductions.length, 5);
  const earRows = [...p.earnings];
  const dedRows = [...p.deductions];
  while (earRows.length < maxRows) earRows.push({ label: "", amount: 0 });
  while (dedRows.length < maxRows) dedRows.push({ label: "", amount: 0 });

  const earBodyRows = earRows.map(e => `
    <tr>
      <td style="font-size:10.5px;padding:6px 10px;border-bottom:0.5px solid #f4f0ff;color:#333;">${e.label}</td>
      <td style="font-size:10.5px;padding:6px 10px;text-align:right;border-bottom:0.5px solid #f4f0ff;color:#333;">${e.amount > 0 ? fmt(e.amount) : ""}</td>
    </tr>`).join("");

  const dedBodyRows = dedRows.map(d => `
    <tr>
      <td style="font-size:10.5px;padding:6px 10px;border-bottom:0.5px solid #fff4ec;color:#333;">${d.label}</td>
      <td style="font-size:10.5px;padding:6px 10px;text-align:right;border-bottom:0.5px solid #fff4ec;color:#333;">${d.amount > 0 ? fmt(d.amount) : ""}</td>
    </tr>`).join("");

  const contactInfo = [
    p.storeAddress && `<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">${ICON_LOC}<span style="font-size:9.5px;color:#444;">${p.storeAddress}</span></div>`,
    p.storeEmail   && `<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">${ICON_MAIL}<span style="font-size:9.5px;color:#444;">${p.storeEmail}</span></div>`,
    p.storePhone   && `<div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">${ICON_TEL}<span style="font-size:9.5px;color:#444;">${p.storePhone}</span></div>`,
    p.storeGstin   && `<div style="display:flex;align-items:center;gap:5px;">${ICON_DOC}<span style="font-size:9.5px;color:#444;">GSTIN: ${p.storeGstin}</span></div>`,
  ].filter(Boolean).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Salary Slip – ${p.monthName} ${p.year}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  @page { size: A4 portrait; margin: 0; }
  *, *::before, *::after { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html { height: 100%; }
  body {
    margin: 0; padding: 0;
    font-family: 'Outfit', Arial, Helvetica, sans-serif;
    font-size: 12px; color: #1a1a2e; background: #fff;
    min-height: 100%;
    overflow-y: auto;
  }
  table { border-collapse: collapse; }

  /* ── STICKY HEADER ── */
  #slip-header {
    position: sticky;
    top: 0;
    background: #fff;
    z-index: 200;
    padding: 18px 28px 0;
    box-shadow: 0 3px 12px rgba(75,54,177,0.09);
  }

  /* ── MAIN CONTENT ── */
  #slip-main { padding: 12px 28px; }

  /* ── STICKY FOOTER ── */
  #slip-footer {
    position: sticky;
    bottom: 0;
    background: #fff;
    z-index: 200;
    padding: 0 28px;
    box-shadow: 0 -3px 12px rgba(75,54,177,0.07);
  }

  /* ── PRINT: fixed header + footer, body margins ── */
  @media print {
    html, body { height: auto; overflow: visible; }
    #slip-header {
      position: fixed; top: 0; left: 0; right: 0;
      background: white; z-index: 1000;
      padding: 18px 28px 0;
      box-shadow: none;
    }
    #slip-main { margin-top: 148px; margin-bottom: 88px; }
    #slip-footer {
      position: fixed; bottom: 0; left: 0; right: 0;
      background: white; z-index: 1000;
      padding: 0 28px;
      box-shadow: none;
    }
  }
</style>
</head>
<body>

<!-- ═══ STICKY HEADER ═══ -->
<div id="slip-header">
  <table style="width:100%;">
    <tr>
      <td style="width:37%;padding:0 18px 14px 0;border-right:2px solid #4B36B1;vertical-align:middle;">
        <img src="${p.logoUrl}" style="max-height:88px;max-width:195px;object-fit:contain;display:block;" onerror="this.style.display='none'" />
      </td>
      <td style="width:63%;padding:0 0 14px 20px;vertical-align:top;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="vertical-align:top;width:55%;">
              <div style="font-size:13px;font-weight:700;color:#4B36B1;margin-bottom:7px;">${p.storeName || "Screen Time General Electronics"}</div>
              ${contactInfo || `<div style="font-size:9.5px;color:#888;">No contact info available</div>`}
            </td>
            <td style="text-align:right;vertical-align:top;">
              <div style="font-size:23px;font-weight:900;color:#4B36B1;letter-spacing:0.5px;line-height:1.1;">SALARY SLIP</div>
              <div style="font-size:10.5px;color:#555;margin-top:3px;">For the Month of ${p.monthName} ${p.year}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <div style="border-top:1.5px solid #4B36B1;"></div>
</div>

<!-- ═══ MAIN CONTENT ═══ -->
<div id="slip-main">

<!-- EMPLOYEE INFO -->
<table style="width:100%;border-collapse:collapse;margin-bottom:11px;margin-top:2px;">
  ${infoRow("Employee Name",   p.empName,     "Pay Period",    p.payPeriodStart+" &ndash; "+p.payPeriodEnd)}
  ${infoRow("Employee ID",     p.empCode,     "Payment Date",  p.paidAt)}
  ${infoRow("Designation",     p.designation, "Pay Mode",      "Bank Transfer")}
  ${infoRow("Department",      p.department,  "Bank Name",     p.bankName)}
  ${infoRow("Date of Joining", p.joiningDate, "Account No.",   p.accountNo)}
  ${infoRow("PAN",             p.pan,         "UAN",           p.uan)}
</table>

<div style="border-top:1.5px solid #4B36B1;margin-bottom:12px;"></div>

<!-- EARNINGS / DEDUCTIONS -->
<table style="width:100%;border-collapse:separate;border-spacing:0;margin-bottom:12px;">
  <tr>
    <td style="width:49.5%;vertical-align:top;padding-right:8px;">
      <div style="border-radius:8px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#4B36B1;">
              <th style="padding:8px 10px;color:white;font-size:10.5px;font-weight:700;text-align:left;">EARNINGS</th>
              <th style="padding:8px 10px;color:white;font-size:10.5px;font-weight:700;text-align:right;">AMOUNT (&#8377;)</th>
            </tr>
          </thead>
          <tbody>${earBodyRows}</tbody>
          <tfoot>
            <tr style="background:#EEE9FF;">
              <td style="padding:8px 10px;font-size:11px;font-weight:700;color:#4B36B1;">TOTAL EARNINGS</td>
              <td style="padding:8px 10px;font-size:11px;font-weight:700;color:#1a1a2e;text-align:right;">${fmt(p.totalEarnings)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </td>
    <td style="width:49.5%;vertical-align:top;padding-left:8px;">
      <div style="border-radius:8px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#E07020;">
              <th style="padding:8px 10px;color:white;font-size:10.5px;font-weight:700;text-align:left;">DEDUCTIONS</th>
              <th style="padding:8px 10px;color:white;font-size:10.5px;font-weight:700;text-align:right;">AMOUNT (&#8377;)</th>
            </tr>
          </thead>
          <tbody>${dedBodyRows}</tbody>
          <tfoot>
            <tr style="background:#FFF1E5;">
              <td style="padding:8px 10px;font-size:11px;font-weight:700;color:#E07020;">TOTAL DEDUCTIONS</td>
              <td style="padding:8px 10px;font-size:11px;font-weight:700;color:#1a1a2e;text-align:right;">${fmt(p.totalDeductions)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </td>
  </tr>
</table>

<!-- NET PAY -->
<div style="border:1.5px solid #e0daff;border-radius:10px;overflow:hidden;margin-bottom:12px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="width:22%;background:#4B36B1;padding:14px 8px;text-align:center;vertical-align:middle;">
        <div style="margin-bottom:5px;">${ICON_WALLET}</div>
        <div style="color:white;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">NET PAY</div>
        <div style="color:rgba(255,255,255,0.75);font-size:9.5px;margin-top:2px;">(In Words)</div>
      </td>
      <td style="width:44%;padding:14px 20px;vertical-align:middle;border-right:1px solid #eee;">
        <div style="font-size:22px;font-weight:900;color:#4B36B1;margin-bottom:5px;">&#8377; ${fmt(p.netPay)}</div>
        <div style="font-size:9.5px;color:#666;font-style:italic;line-height:1.5;">(${toWords(p.netPay)})</div>
      </td>
      <td style="width:34%;padding:10px 14px;vertical-align:middle;background:#f9f7ff;">
        <div style="font-size:10.5px;font-weight:700;color:#4B36B1;text-align:center;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.3px;">Salary Summary</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:10px;color:#555;padding:3px 0;">Total Earnings</td>
            <td style="font-size:10px;color:#333;text-align:right;padding:3px 0;font-weight:500;">&#8377; ${fmt(p.totalEarnings)}</td>
          </tr>
          <tr>
            <td style="font-size:10px;color:#555;padding:3px 0;">Total Deductions</td>
            <td style="font-size:10px;color:#333;text-align:right;padding:3px 0;font-weight:500;">&#8377; ${fmt(p.totalDeductions)}</td>
          </tr>
        </table>
        <div style="border-top:1px solid #ddd;margin:6px 0;"></div>
        <div style="background:#4B36B1;border-radius:5px;padding:5px 8px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:10.5px;font-weight:700;color:white;">Net Pay</span>
          <span style="font-size:10.5px;font-weight:700;color:white;">&#8377; ${fmt(p.netPay)}</span>
        </div>
      </td>
    </tr>
  </table>
</div>

<!-- YTD -->
<div style="border-top:1.5px solid #4B36B1;margin-bottom:12px;"></div>
<table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
  <tr>
    <td style="width:49%;vertical-align:top;padding-right:16px;border-right:1px solid #e0e0e0;">
      <div style="font-size:10.5px;font-weight:700;color:#4B36B1;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:8px;">Year to Date (YTD)</div>
      <table style="width:100%;border-collapse:collapse;">
        ${ytdRow("YTD Earnings",   p.ytdEarnings)}
        ${ytdRow("YTD Deductions", p.ytdDeductions)}
        ${ytdRow("YTD Net Pay",    p.ytdNetPay)}
      </table>
    </td>
    <td style="width:49%;vertical-align:top;padding-left:16px;">
      <div style="font-size:10.5px;font-weight:700;color:#4B36B1;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:8px;">Employer Contribution (YTD)</div>
      <table style="width:100%;border-collapse:collapse;">
        ${ytdRow("Employer PF",                 p.employerPf)}
        ${ytdRow("ESIC Employer",               p.employerEsic)}
        ${ytdRow("Total Employer Contribution", p.totalEmployerContrib)}
      </table>
    </td>
  </tr>
</table>

</div><!-- end #slip-main -->

<!-- ═══ STICKY FOOTER ═══ -->
<div id="slip-footer">
  <div style="border-top:1px solid #ddd;margin-bottom:9px;"></div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:9px;">
    <tr>
      <td style="vertical-align:bottom;">
        <div style="font-size:9px;color:#aaa;margin-bottom:3px;">This is a computer generated document and does not require any signature.</div>
        <div style="font-size:10px;font-weight:700;color:#4B36B1;">Thank you for your hard work and dedication!</div>
      </td>
      <td style="text-align:right;vertical-align:bottom;">
        <div style="font-size:10.5px;font-weight:700;color:#4B36B1;letter-spacing:0.3px;">Authorized Signatory</div>
      </td>
    </tr>
  </table>
  <svg viewBox="0 0 794 36" xmlns="http://www.w3.org/2000/svg" style="display:block;width:calc(100% + 56px);margin-left:-28px;">
    <path d="M0,18 C120,4 260,34 420,18 C560,4 680,32 794,18 L794,36 L0,36 Z" fill="#E07020"/>
    <path d="M0,25 C140,10 310,38 500,24 C640,14 730,32 794,25 L794,36 L0,36 Z" fill="#4B36B1" opacity="0.85"/>
  </svg>
</div>

</body>
</html>`;
}

/* ══════════════════════════════════════════════════════════════
   MODAL COMPONENT
══════════════════════════════════════════════════════════════ */
interface SalarySlipModalProps {
  record: any;
  storeName?: string;
  storeAddress?: string;
  storeEmail?: string;
  storePhone?: string;
  storeGstin?: string;
  onClose: () => void;
}

export const SalarySlipModal = ({
  record,
  storeName = "",
  storeAddress = "",
  storeEmail = "",
  storePhone = "",
  storeGstin = "",
  onClose,
}: SalarySlipModalProps) => {
  const [employee,  setEmployee]  = useState<any>(null);
  const [ytdData,   setYtdData]   = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const empId = typeof record.employeeId === "object"
    ? (record.employeeId._id || record.employeeId.id || "")
    : String(record.employeeId || "");

  useEffect(() => {
    Promise.all([
      empId ? staffService.getById(empId).catch(() => null) : Promise.resolve(null),
      empId
        ? employeeApi.getPayroll({ year: record.year, employeeId: empId } as any).catch(() => [])
        : Promise.resolve([]),
    ]).then(([emp, ytd]) => {
      setEmployee(emp);
      setYtdData(Array.isArray(ytd) ? ytd : []);
    }).finally(() => setLoading(false));
  }, [empId, record.year]);

  /* ── Compute derived values ── */
  const monthName      = MONTHS[record.month - 1] || "";
  const totalDaysInMon = new Date(record.year, record.month, 0).getDate();
  const payableDays    = record.payableDays ?? totalDaysInMon;
  const presentDays    = record.presentDays ?? payableDays;
  const factor         = payableDays / totalDaysInMon;
  const snap           = record.salaryStructureSnapshot || {};

  const earnings = [
    { label: "Basic Salary",               amount: Math.round((snap.basic             || 0) * factor) },
    { label: "House Rent Allowance (HRA)", amount: Math.round((snap.hra               || 0) * factor) },
    { label: "Special Allowance",          amount: Math.round((snap.specialAllowance  || 0) * factor) },
    { label: "Conveyance Allowance",       amount: Math.round((snap.conveyance        || 0) * factor) },
    { label: "Medical Allowance",          amount: Math.round((snap.medicalAllowance  || 0) * factor) },
  ].filter(e => e.amount > 0);

  const deductions: { label: string; amount: number }[] = record.deductions || [];
  const totalEarnings   = record.grossSalary ?? earnings.reduce((s, e) => s + e.amount, 0);
  const totalDeductions = deductions.reduce((s, d) => s + (d.amount || 0), 0);
  const netPay          = record.netSalary ?? (totalEarnings - totalDeductions);

  /* ── YTD (all months up to & including current month in this year) ── */
  const ytdRecords = ytdData.filter((r: any) => r.month <= record.month);
  const ytdEarnings   = ytdRecords.reduce((s: number, r: any) => s + (r.grossSalary  || 0), 0);
  const ytdDeductions = ytdRecords.reduce((s: number, r: any) =>
    s + (r.deductions || []).reduce((x: number, d: any) => x + (d.amount || 0), 0), 0);
  const ytdNetPay = ytdRecords.reduce((s: number, r: any) => s + (r.netSalary || 0), 0);

  /* ── Employer contributions ── */
  // YTD employer contributions
  const employerPf = ytdRecords.reduce((s: number, r: any) => {
    const rSnap = r.salaryStructureSnapshot || {};
    const rDays = r.payableDays ?? new Date(r.year, r.month, 0).getDate();
    const rTotal = new Date(r.year, r.month, 0).getDate();
    const rFactor = rDays / rTotal;
    const rBasic = Math.round((rSnap.basic || 0) * rFactor);
    const rPf = (r.deductions || []).find((d: any) => /pf/i.test(d.label));
    return s + (rPf ? rPf.amount : Math.round(rBasic * 0.12));
  }, 0);
  const employerEsic = ytdRecords.reduce((s: number, r: any) => {
    const rEsic = (r.deductions || []).find((d: any) => /esic/i.test(d.label));
    return s + (rEsic ? Math.round((r.grossSalary || 0) * 0.0325) : 0);
  }, 0);
  const totalEmployerContrib = employerPf + employerEsic;

  /* ── Employee fields ── */
  const empName     = employee?.name         || record.employeeId?.name         || "—";
  const empCode     = employee?.employeeCode || record.employeeId?.employeeCode || "—";
  const designation = typeof employee?.designation === "object"
    ? (employee?.designation?.name || "—") : (employee?.designation || "—");
  const department  = typeof employee?.department === "object"
    ? (employee?.department?.name  || "—") : (employee?.department  || "—");
  const joiningDate = employee?.joiningDate
    ? new Date(employee.joiningDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
  const pan       = employee?.legalDocuments?.panNumber || "—";
  const bankName  = employee?.bankDetails?.bankName     || "—";
  const accRaw    = employee?.bankDetails?.accountNumber || "";
  const accountNo = accRaw ? `XXXX XXXX ${String(accRaw).slice(-4)}` : "—";
  const uan       = employee?.legalDocuments?.uan || employee?.uan || "—";
  const paidAt    = record.paidAt
    ? new Date(record.paidAt).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : `${totalDaysInMon} ${monthName} ${record.year}`;
  const payPeriodStart = `01 ${monthName} ${record.year}`;
  const payPeriodEnd   = `${totalDaysInMon} ${monthName} ${record.year}`;

  const logoUrl = `${window.location.origin}/logo-half-2.png`;

  const slipHtml = !loading
    ? buildSlipHTML({
        logoUrl, storeName, storeAddress, storeEmail, storePhone, storeGstin,
        monthName, year: record.year,
        empName, empCode, designation, department, joiningDate, pan,
        bankName, accountNo, uan, payPeriodStart, payPeriodEnd, paidAt,
        payableDays, presentDays, earnings, deductions,
        totalEarnings, totalDeductions, netPay,
        ytdEarnings, ytdDeductions, ytdNetPay,
        employerPf, employerEsic, totalEmployerContrib,
      })
    : "";

  const handlePrint = () => iframeRef.current?.contentWindow?.print();

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[870px] w-full max-h-[95vh] overflow-hidden p-0 gap-0 rounded-2xl">
        {/* Action bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white shrink-0">
          <div>
            <p className="text-sm font-bold text-slate-800">Salary Slip</p>
            <p className="text-xs text-slate-400">{empName} &middot; {monthName} {record.year}</p>
          </div>
          <Button onClick={handlePrint} disabled={loading} className="gap-2 rounded-xl h-9 px-4 text-sm font-semibold">
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
            <p className="text-xs text-slate-400">Loading salary slip…</p>
          </div>
        ) : (
          <div className="overflow-y-auto" style={{ maxHeight: "calc(95vh - 58px)" }}>
            <iframe
              ref={iframeRef}
              srcDoc={slipHtml}
              title="Salary Slip Preview"
              style={{ width: "100%", height: "1090px", border: "none", display: "block" }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
