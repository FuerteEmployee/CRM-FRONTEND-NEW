import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/hrms/components/ui/button";
import { Input } from "@/hrms/components/ui/input";
import { Label } from "@/hrms/components/ui/label";
import { Slider } from "@/hrms/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/hrms/components/ui/select";
import { toast } from "@/hrms/components/ui/use-toast";
import { Switch } from "@/hrms/components/ui/switch";
import { Textarea } from "@/hrms/components/ui/textarea";
import {
  ChevronLeft, Save, Trash2, Copy, Loader2,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  Type, Hash, Zap, Minus, ImageIcon, Square,
  BarChart2, Calendar, CreditCard, DollarSign, Table,
  ArrowUp, ArrowDown, Lock, Unlock, LayoutTemplate, Upload, RotateCw,
  ChevronUp, ChevronDown, Plus, GripVertical,
  Circle, Tag, Building2,
  Undo2, Redo2, Grid3x3, ZoomIn, ZoomOut,
  AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter,
  AlignStartVertical, AlignEndVertical, AlignStartHorizontal, AlignEndHorizontal,
  Underline, Strikethrough, CaseSensitive,
  Star, PenLine, Stamp, ScanLine,
} from "lucide-react";
import {
  salaryTemplateService, SalaryTemplate, CanvasElement,
  ElementStyle, CanvasElementType,
} from "@/hrms/services/salaryTemplateService";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_CW = 794;
const DEFAULT_CH = 1123;
const INR = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;

const SD = {
  employeeName: "Rajesh Kumar", employeeId: "EMP-001",
  designation: "Senior Engineer", department: "Technology",
  dateOfJoining: "15 Jun 2020", payPeriod: "June 2025", payDate: "30 Jun 2025",
  panNumber: "ABCDE1234F", uanNumber: "100123456789",
  grossSalary: 45000, totalEarnings: 45000, totalDeductions: 6825, netPay: 38175,
  totalDays: 30, presentDays: 26, absentDays: 2, leaveDays: 2, lopDays: 0, overtimeHours: 8,
  bankName: "HDFC Bank", accountNumber: "12345 67890", ifscCode: "HDFC0001234", paymentMode: "Bank Transfer",
};
const SE = [{ label: "Basic Pay", amount: 22500 }, { label: "HRA", amount: 9000 }, { label: "Transport", amount: 1600 }, { label: "Medical", amount: 1250 }, { label: "Special", amount: 10650 }];
const SD2 = [{ label: "PF (Employee)", amount: 2700 }, { label: "ESIC", amount: 338 }, { label: "Prof. Tax", amount: 200 }, { label: "TDS", amount: 3587 }];
const SL = [{ type: "Earned Leave", entitled: 12, taken: 3, balance: 9 }, { type: "Sick Leave", entitled: 7, taken: 2, balance: 5 }];

const DATA_KEYS: [string, string][] = [
  ["employeeName","Employee Name"], ["employeeId","Employee ID"], ["designation","Designation"],
  ["department","Department"], ["dateOfJoining","Date of Joining"], ["payPeriod","Pay Period"], ["monthName", "Month Name"],

  ["payDate","Pay Date"], ["panNumber","PAN Number"], ["uanNumber","UAN Number"],
  ["totalDays","Total Days"], ["presentDays","Present Days"], ["absentDays","Absent Days"],
  ["leaveDays","Leave Days"], ["lopDays","LOP Days"], ["overtimeHours","OT Hours"],
  ["grossSalary","Gross Salary (₹)"], ["totalEarnings","Total Earnings (₹)"],
  ["totalDeductions","Total Deductions (₹)"], ["netPay","Net Pay (₹)"], ["amount", "Amount"],
  ["bankName","Bank Name"], ["accountNumber","Account Number"],
  ["ifscCode","IFSC Code"], ["paymentMode","Payment Mode"],

  // Earnings
  ["earn_Basic Pay", "Earning: Basic Pay"],
  ["earn_HRA", "Earning: HRA"],
  ["earn_Transport", "Earning: Transport"],
  ["earn_Medical", "Earning: Medical"],
  ["earn_Special", "Earning: Special"],

  // Deductions
  ["ded_PF (Employee)", "Deduction: PF (Employee)"],
  ["ded_ESIC", "Deduction: ESIC"],
  ["ded_Prof. Tax", "Deduction: Prof. Tax"],
  ["ded_TDS", "Deduction: TDS"],
];

const getDV = (key: string) => {
  if (!key) return "{ empty_field }";
  return `{ ${key} }`;
};

const SECTION_DEFAULTS: Record<string, string> = {
  companyHeader: "SALARY SLIP",
  infoGrid: "Employee Information",
  earningsTable: "Earnings",
  deductionsTable: "Deductions",
  netPayBar: "Net Pay",
  attendanceGrid: "Attendance Summary",
  leaveTable: "Leave Details",
  bankGrid: "Bank Details",
};

const sf = (el: CanvasElement, base: number, ref = 11) =>
  el.style.fontSize ? Math.max(6, Math.round(el.style.fontSize * (base / ref))) : base;

// Get a value from extraData with a fallback
const getED = (el: CanvasElement, key: string, fallback: string) =>
  (el.extraData?.[key]) || fallback;

// ─── Dynamic Table Rows ────────────────────────────────────────────────────────

interface TableRow {
  id: string;
  label: string;
  required: boolean;
}

const DEFAULT_EARNING_ROWS: TableRow[] = [
  { id: "r1", label: "Basic Salary", required: true },
  { id: "r2", label: "Transportation Allowance", required: false },
  { id: "r3", label: "Meal Allowance", required: false },
  { id: "r4", label: "Overtime Pay", required: false },
];

const DEFAULT_DEDUCTION_ROWS: TableRow[] = [
  { id: "r1", label: "Income Tax", required: true },
  { id: "r2", label: "Time Off Penalty", required: false },
];

const parseRows = (el: CanvasElement, isEarnings: boolean): TableRow[] => {
  try {
    if (el.extraData?.rows) return JSON.parse(el.extraData.rows);
  } catch {}
  return isEarnings ? [...DEFAULT_EARNING_ROWS] : [...DEFAULT_DEDUCTION_ROWS];
};

// ─── Paper sizes ──────────────────────────────────────────────────────────────

const PAPER_SIZES = [
  { label: "A4",     w: 794,  h: 1123 },
  { label: "A5",     w: 559,  h: 794  },
  { label: "Legal",  w: 794,  h: 1302 },
  { label: "Letter", w: 816,  h: 1056 },
  { label: "A3",     w: 1123, h: 1587 },
  { label: "Custom", w: 0,    h: 0    },
];

// ─── Palette ──────────────────────────────────────────────────────────────────

// w/h overrides used for vertical divider
interface PaletteItem { type: CanvasElementType; label: string; icon: any; ow?: number; oh?: number; }

const PALETTE: { group: string; items: PaletteItem[] }[] = [
  {
    group: "Basic", items: [
      { type: "text", label: "Text", icon: Type },
      { type: "heading", label: "Heading", icon: Hash },
      { type: "dynamicField", label: "Dynamic Field", icon: Zap },
      { type: "divider", label: "Divider", icon: Minus },
      { type: "image", label: "Image", icon: ImageIcon },
      { type: "rect", label: "Rectangle", icon: Square },
    ],
  },
  {
    group: "Graphics", items: [
      { type: "circle", label: "Circle", icon: Circle },
      { type: "badge", label: "Badge / Pill", icon: Tag },
      { type: "star", label: "Star", icon: Star },
      { type: "signatureLine", label: "Signature Line", icon: PenLine },
      { type: "watermark", label: "Watermark", icon: Stamp },
      { type: "qrPlaceholder", label: "QR Code", icon: ScanLine },
    ],
  },
  {
    group: "Salary Sections", items: [
      { type: "companyHeader", label: "Company Header", icon: Building2 },
      { type: "infoGrid", label: "Employee Info", icon: Table },
      { type: "earningsTable", label: "Earnings Table", icon: DollarSign },
      { type: "deductionsTable", label: "Deductions Table", icon: CreditCard },
      { type: "netPayBar", label: "Net Pay Bar", icon: BarChart2 },
      { type: "attendanceGrid", label: "Attendance", icon: Calendar },
      { type: "leaveTable", label: "Leave Table", icon: Calendar },
      { type: "bankGrid", label: "Bank Details", icon: CreditCard },
    ],
  },
];

// ─── HTML Serialiser ──────────────────────────────────────────────────────────
// Converts the elements array into a self-contained HTML string with
// {{token}} placeholders that the backend fills with real payroll data.

function serializeElementsToHtml(
  elements: CanvasElement[],
  canvasBg: string,
  canvasW: number,
  canvasH: number,
): string {
  const esc = (s: string) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const ss = (s: ElementStyle, extra = ""): string => {
    const p: string[] = [];
    if (s.fontSize)             p.push(`font-size:${s.fontSize}px`);
    if (s.fontWeight)           p.push(`font-weight:${s.fontWeight}`);
    if (s.fontStyle)            p.push(`font-style:${s.fontStyle}`);
    if (s.fontFamily)           p.push(`font-family:${s.fontFamily}`);
    if (s.color)                p.push(`color:${s.color}`);
    if (s.backgroundColor)      p.push(`background-color:${s.backgroundColor}`);
    if (s.borderWidth)          p.push(`border:${s.borderWidth}px ${s.borderStyle||"solid"} ${s.borderColor||"transparent"}`);
    if (s.borderRadius != null) p.push(`border-radius:${s.borderRadius}px`);
    p.push(`padding:${s.paddingTop??0}px ${s.paddingRight??0}px ${s.paddingBottom??0}px ${s.paddingLeft??0}px`);
    if (s.textAlign)            p.push(`text-align:${s.textAlign}`);
    if (s.opacity != null && s.opacity !== 1) p.push(`opacity:${s.opacity}`);
    if (s.letterSpacing)        p.push(`letter-spacing:${s.letterSpacing}px`);
    if (s.lineHeight)           p.push(`line-height:${s.lineHeight}`);
    if (s.textDecoration)       p.push(`text-decoration:${s.textDecoration}`);
    if (s.textTransform)        p.push(`text-transform:${s.textTransform}`);
    if (extra) p.push(extra);
    return p.join(";");
  };

  const pos = (el: CanvasElement) =>
    `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;z-index:${el.zIndex};overflow:hidden;box-sizing:border-box;`;

  const gED = (el: CanvasElement, key: string, fb: string) => el.extraData?.[key] || fb;

  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  const html = sorted.map(el => {
    const p = pos(el);
    const s = ss(el.style);

    if (el.type === "text" || el.type === "heading") {
      const c = esc(el.content || (el.type === "heading" ? "Heading" : "Text"));
      return `<div style="${p}${s};white-space:pre-wrap;word-break:break-word;">${c}</div>`;
    }

    if (el.type === "dynamicField") {
      return `<div style="${p}${s};display:flex;align-items:center;">{{${el.dataKey||"field"}}}</div>`;
    }

    if (el.type === "image") {
      const br = el.style.borderRadius ?? 0;
      const inner = el.src
        ? `<img src="${esc(el.src)}" style="width:100%;height:100%;object-fit:contain;border-radius:${br}px;" />`
        : "";
      return `<div style="${p}">${inner}</div>`;
    }

    if (el.type === "divider") {
      const bg = el.style.backgroundColor || el.style.borderColor || "#e2e8f0";
      return `<div style="${p}background-color:${bg};"></div>`;
    }

    if (el.type === "rect")
      return `<div style="${p}${s}"></div>`;

    if (el.type === "circle") {
      const bg = el.style.backgroundColor || "#6366f1";
      const border = el.style.borderWidth
        ? `border:${el.style.borderWidth}px ${el.style.borderStyle||"solid"} ${el.style.borderColor||"transparent"};`
        : "";
      return `<div style="${p}background-color:${bg};border-radius:50%;${border}box-sizing:border-box;"></div>`;
    }

    if (el.type === "badge")
      return `<div style="${p}${s};display:flex;align-items:center;justify-content:center;white-space:nowrap;">${esc(el.content||"BADGE")}</div>`;

    if (el.type === "watermark")
      return `<div style="${p}${s};display:flex;align-items:center;justify-content:center;transform:rotate(-25deg);white-space:nowrap;">${esc(el.content||"CONFIDENTIAL")}</div>`;

    if (el.type === "signatureLine") {
      const label = esc(gED(el, "label", "Authorized Signature"));
      const lc = el.style.borderColor || "#94a3b8";
      const fc = el.style.color || "#64748b";
      const fs = el.style.fontSize || 10;
      const ta = el.style.textAlign || "center";
      return `<div style="${p}display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:2px;padding-left:4px;padding-right:4px;">
  <div style="border-bottom:1.5px dashed ${lc};margin-bottom:4px;"></div>
  <div style="font-size:${fs}px;color:${fc};text-align:${ta};font-style:italic;">${label}</div>
</div>`;
    }

    if (el.type === "companyHeader") {
      const cName = esc(gED(el, "companyName", "{{COMPANY_NAME}}"));
      const cAddr = esc(gED(el, "companyAddress", "{{COMPANY_ADDRESS}}"));
      const bg   = el.style.backgroundColor || "#16a34a";
      const fc   = el.style.color || "#ffffff";
      const nfs  = el.style.fontSize || 20;
      const lsz  = Math.round(nfs * 2.6);
      const pt   = el.style.paddingTop ?? 24;  const pb = el.style.paddingBottom ?? 24;
      const pl   = el.style.paddingLeft ?? 36; const pr = el.style.paddingRight ?? 36;
      return `<div style="${p}background-color:${bg};display:flex;align-items:center;gap:14px;padding:${pt}px ${pr}px ${pb}px ${pl}px;box-sizing:border-box;">
  <div style="width:${lsz}px;height:${lsz}px;border-radius:10px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:${Math.round(lsz*0.54)}px;">🏢</div>
  <div style="flex:1;">
    <div style="font-weight:bold;font-size:${nfs}px;color:${fc};">${cName}</div>
    <div style="font-size:${Math.max(9,Math.round(nfs*0.55))}px;opacity:0.75;margin-top:3px;color:${fc};">${cAddr}</div>
  </div>
  <div style="text-align:right;flex-shrink:0;">
    <div style="font-size:${Math.round(nfs*0.5)}px;opacity:0.7;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;color:${fc};">SALARY SLIP</div>
    <div style="font-size:${Math.round(nfs*0.8)}px;font-weight:bold;margin-top:2px;color:${fc};">{{payPeriod}}</div>
    <div style="font-size:${Math.round(nfs*0.5)}px;opacity:0.7;margin-top:1px;color:${fc};">Pay Date: {{payDate}}</div>
  </div>
</div>`;
    }

    if (el.type === "infoGrid") {
      const bc  = el.style.borderColor || "#e2e8f0";
      const hbg = el.style.backgroundColor || "#f8fafc";
      const br  = el.style.borderRadius ?? 10;
      const bw  = el.style.borderWidth ?? 1;
      const fs  = el.style.fontSize || 11;
      const lc  = el.style.color || "#64748b";
      const pt  = el.style.paddingTop ?? 16; const pb = el.style.paddingBottom ?? 16;
      const pl  = el.style.paddingLeft ?? 16; const pr = el.style.paddingRight ?? 16;
      const fields: [string, string][] = [
        [esc(gED(el,"f1","Employee Name")), "{{employeeName}}"],
        [esc(gED(el,"f2","Employee ID")),   "{{employeeId}}"],
        [esc(gED(el,"f3","Designation")),   "{{designation}}"],
        [esc(gED(el,"f4","Department")),    "{{department}}"],
        [esc(gED(el,"f5","Date of Joining")),"{{dateOfJoining}}"],
        [esc(gED(el,"f6","Pay Period")),    "{{payPeriod}}"],
        [esc(gED(el,"f7","PAN Number")),    "{{panNumber}}"],
        [esc(gED(el,"f8","Pay Date")),      "{{payDate}}"],
      ];
      const rows = [fields.slice(0,4), fields.slice(4)];
      const tRows = rows.map((row, ri) => {
        const tds = row.map(([l, v], ci) =>
          `<td style="padding:6px 10px;${ci<3?`border-right:1px solid ${bc};`:""}background:${hbg};width:25%;"><div style="font-size:${Math.round(fs*0.77)}px;text-transform:uppercase;color:${lc};font-weight:600;letter-spacing:0.6px;opacity:0.8;">${l}</div><div style="font-size:${fs}px;font-weight:700;color:#1e293b;margin-top:2px;">${v}</div></td>`
        ).join("");
        return `<tr${ri>0?` style="border-top:1px solid ${bc}"`:""}>${tds}</tr>`;
      }).join("");
      return `<div style="${p}background-color:${hbg};border:${bw}px solid ${bc};border-radius:${br}px;padding:${pt}px ${pr}px ${pb}px ${pl}px;box-sizing:border-box;"><table style="width:100%;border-collapse:collapse;font-size:${fs}px;border:1px solid ${bc};">${tRows}</table></div>`;
    }

    if (el.type === "earningsTable") {
      const title = esc(el.content || "Earnings");
      const col1  = esc(gED(el,"col1","Component"));
      const col2  = esc(gED(el,"col2","Amount"));
      const tot   = esc(gED(el,"total","Total Earnings"));
      const ac    = el.style.color || "#15803d";
      const bc    = el.style.borderColor || "#bbf7d0";
      const hbg   = el.style.backgroundColor || "#ffffff";
      const br    = el.style.borderRadius ?? 8;
      const bw    = el.style.borderWidth ?? 1;
      const pt    = el.style.paddingTop ?? 10; const pl = el.style.paddingLeft ?? 10;
      return `<div style="${p}background-color:${hbg};border:${bw}px solid ${bc};border-radius:${br}px;overflow:hidden;box-sizing:border-box;">
  <div style="font-size:9.5px;font-weight:700;text-transform:uppercase;color:${ac};letter-spacing:1px;padding:${pt}px ${pl}px 6px;background:${ac}18;border-bottom:1px solid ${bc};">${title}</div>
  <table style="width:100%;border-collapse:collapse;font-size:11px;">
    <thead><tr style="background:${ac}18;"><th style="text-align:left;padding:5px 10px;border:1px solid ${bc};color:${ac};font-weight:700;font-size:10px;">${col1}</th><th style="text-align:right;padding:5px 10px;border:1px solid ${bc};color:${ac};font-weight:700;font-size:10px;width:35%;">${col2}</th></tr></thead>
    <tbody>{{EARNINGS_ROWS}}</tbody>
    <tfoot><tr style="background:${ac}18;"><td style="padding:6px 10px;border:1px solid ${bc};font-weight:700;color:${ac};">${tot}</td><td style="text-align:right;padding:6px 10px;border:1px solid ${bc};font-weight:800;color:${ac};font-size:12px;">{{totalEarnings}}</td></tr></tfoot>
  </table>
</div>`;
    }

    if (el.type === "deductionsTable") {
      const title = esc(el.content || "Deductions");
      const col1  = esc(gED(el,"col1","Component"));
      const col2  = esc(gED(el,"col2","Amount"));
      const tot   = esc(gED(el,"total","Total Deductions"));
      const dc    = el.style.color || "#dc2626";
      const bc    = el.style.borderColor || "#fecaca";
      const hbg   = el.style.backgroundColor || "#fff8f8";
      const br    = el.style.borderRadius ?? 8;
      const bw    = el.style.borderWidth ?? 1;
      const pt    = el.style.paddingTop ?? 10; const pl = el.style.paddingLeft ?? 10;
      return `<div style="${p}background-color:${hbg};border:${bw}px solid ${bc};border-radius:${br}px;overflow:hidden;box-sizing:border-box;">
  <div style="font-size:9.5px;font-weight:700;text-transform:uppercase;color:${dc};letter-spacing:1px;padding:${pt}px ${pl}px 6px;background:${dc}12;border-bottom:1px solid ${bc};">${title}</div>
  <table style="width:100%;border-collapse:collapse;font-size:11px;">
    <thead><tr style="background:${dc}12;"><th style="text-align:left;padding:5px 10px;border:1px solid ${bc};color:${dc};font-weight:700;font-size:10px;">${col1}</th><th style="text-align:right;padding:5px 10px;border:1px solid ${bc};color:${dc};font-weight:700;font-size:10px;width:35%;">${col2}</th></tr></thead>
    <tbody>{{DEDUCTIONS_ROWS}}</tbody>
    <tfoot><tr style="background:${dc}12;"><td style="padding:6px 10px;border:1px solid ${bc};font-weight:700;color:${dc};">${tot}</td><td style="text-align:right;padding:6px 10px;border:1px solid ${bc};font-weight:800;color:${dc};font-size:12px;">{{totalDeductions}}</td></tr></tfoot>
  </table>
</div>`;
    }

    if (el.type === "netPayBar") {
      const title    = esc(el.content || "NET PAY");
      const subtitle = esc(gED(el, "subtitle", "Gross {{grossSalary}} − Deductions {{totalDeductions}}"));
      const nc       = el.style.color || "#15803d";
      const bg       = el.style.backgroundColor || "#f0fdf4";
      const bc       = el.style.borderColor || nc;
      const bw       = el.style.borderWidth ?? 1;
      const br       = el.style.borderRadius ?? 12;
      const pt       = el.style.paddingTop ?? 16; const pb = el.style.paddingBottom ?? 16;
      const pl       = el.style.paddingLeft ?? 20; const pr = el.style.paddingRight ?? 20;
      return `<div style="${p}background-color:${bg};border:${bw}px solid ${bc};border-radius:${br}px;display:flex;justify-content:space-between;align-items:center;padding:${pt}px ${pr}px ${pb}px ${pl}px;box-sizing:border-box;">
  <div><div style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${nc};opacity:0.8;">${title}</div><div style="font-size:10.5px;color:#475569;font-weight:500;margin-top:3px;">${subtitle}</div></div>
  <div style="text-align:right;"><div style="font-size:8px;text-transform:uppercase;color:${nc};opacity:0.7;letter-spacing:1px;font-weight:600;">Net Pay</div><div style="font-size:28px;font-weight:900;color:${nc};line-height:1.1;">{{netPay}}</div></div>
</div>`;
    }

    if (el.type === "attendanceGrid") {
      const title = esc(el.content || "Attendance Summary");
      const ac    = el.style.color || "#0369a1";
      const bc    = el.style.borderColor || "#bae6fd";
      const hbg   = el.style.backgroundColor || "#f8fafc";
      const br    = el.style.borderRadius ?? 8;
      const pt    = el.style.paddingTop ?? 12; const pl = el.style.paddingLeft ?? 12;
      const stats: [string, string, string][] = [
        [esc(gED(el,"s1","Total Days")),  "{{totalDays}}",    "#1e293b"],
        [esc(gED(el,"s2","Present")),     "{{presentDays}}",  "#15803d"],
        [esc(gED(el,"s3","Absent")),      "{{absentDays}}",   "#dc2626"],
        [esc(gED(el,"s4","Paid Leave")),  "{{leaveDays}}",    "#d97706"],
        [esc(gED(el,"s5","LOP")),         "{{lopDays}}",      "#9333ea"],
        [esc(gED(el,"s6","OT Hours")),    "{{overtimeHours}}","#0369a1"],
      ];
      const tds = stats.map(([l, v, vc]) =>
        `<td style="border:1px solid ${bc};padding:8px 4px;text-align:center;background:${hbg};"><div style="font-size:17px;font-weight:800;color:${vc};line-height:1;">${v}</div><div style="font-size:8.5px;color:#64748b;margin-top:3px;line-height:1.2;font-weight:600;">${l}</div></td>`
      ).join("");
      return `<div style="${p}background-color:${hbg};border-radius:${br}px;overflow:hidden;box-sizing:border-box;">${title?`<div style="font-size:9.5px;font-weight:700;text-transform:uppercase;color:${ac};letter-spacing:1px;padding:${pt}px ${pl}px 6px;border-bottom:1px solid ${bc};">${title}</div>`:""}<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tbody><tr>${tds}</tr></tbody></table></div>`;
    }

    if (el.type === "bankGrid") {
      const title = esc(el.content || "Bank Details");
      const ac    = el.style.color || "#0369a1";
      const bc    = el.style.borderColor || "#e2e8f0";
      const hbg   = el.style.backgroundColor || "#f8fafc";
      const br    = el.style.borderRadius ?? 8;
      const pt    = el.style.paddingTop ?? 12; const pl = el.style.paddingLeft ?? 12;
      const fields: [string, string][] = [
        [esc(gED(el,"f1","Bank Name")),       "{{bankName}}"],
        [esc(gED(el,"f2","Account Number")),  "{{accountNumber}}"],
        [esc(gED(el,"f3","IFSC Code")),       "{{ifscCode}}"],
        [esc(gED(el,"f4","Payment Mode")),    "{{paymentMode}}"],
      ];
      const tds = fields.map(([l, v]) =>
        `<td style="border:1px solid ${bc};padding:8px 10px;background:${hbg};"><div style="font-size:8.5px;text-transform:uppercase;color:#94a3b8;font-weight:600;letter-spacing:0.6px;margin-bottom:3px;">${l}</div><div style="font-size:11px;font-weight:700;color:#1e293b;font-family:monospace;word-break:break-all;">${v}</div></td>`
      ).join("");
      return `<div style="${p}background-color:${hbg};border-radius:${br}px;overflow:hidden;box-sizing:border-box;">${title?`<div style="font-size:9.5px;font-weight:700;text-transform:uppercase;color:${ac};letter-spacing:1px;padding:${pt}px ${pl}px 6px;border-bottom:1px solid ${bc};">${title}</div>`:""}<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tbody><tr>${tds}</tr></tbody></table></div>`;
    }

    if (el.type === "leaveTable") {
      const title = esc(el.content || "Leave Details");
      const lc    = el.style.color || "#7c3aed";
      const bc    = el.style.borderColor || "#ddd6fe";
      const hbg   = el.style.backgroundColor || "#ffffff";
      const bw    = el.style.borderWidth ?? 1;
      const br    = el.style.borderRadius ?? 8;
      const pt    = el.style.paddingTop ?? 10; const pl = el.style.paddingLeft ?? 10;
      const headers = [
        esc(gED(el,"col1","Leave Type")),
        esc(gED(el,"col2","Entitled")),
        esc(gED(el,"col3","Taken")),
        esc(gED(el,"col4","Balance")),
      ];
      const thHtml = headers.map((h, i) =>
        `<th style="text-align:${i===0?"left":"center"};padding:5px 8px;border:1px solid ${bc};color:${lc};font-weight:700;font-size:10px;">${h}</th>`
      ).join("");
      return `<div style="${p}background-color:${hbg};border:${bw}px solid ${bc};border-radius:${br}px;overflow:hidden;box-sizing:border-box;"><div style="font-size:9.5px;font-weight:700;text-transform:uppercase;color:${lc};letter-spacing:1px;padding:${pt}px ${pl}px 6px;background:${lc}12;border-bottom:1px solid ${bc};">${title}</div><table style="width:100%;border-collapse:collapse;font-size:11px;"><thead><tr style="background:${lc}12;">${thHtml}</tr></thead><tbody>{{LEAVE_ROWS}}</tbody></table></div>`;
    }

    return "";
  }).filter(Boolean).join("\n");

  return `<div style="width:${canvasW}px;height:${canvasH}px;position:relative;background:${canvasBg};font-family:Arial,Helvetica,sans-serif;overflow:hidden;">\n${html}\n</div>`;
}

// ─── Element factory ──────────────────────────────────────────────────────────

const makeEl = (type: CanvasElementType, x: number, y: number, n: number): CanvasElement => {
  const id = `el_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const defs: Record<string, Partial<CanvasElement> & { extraData?: Record<string, string> }> = {
    text: { width: 300, height: 36, content: "Text Block", style: { fontSize: 13, color: "#1e293b", paddingTop: 4, paddingLeft: 4, paddingRight: 4, paddingBottom: 4 } },
    heading: { width: 420, height: 52, content: "Heading Text", style: { fontSize: 24, color: "#1e293b", fontWeight: "bold", paddingTop: 4, paddingLeft: 4, paddingRight: 4, paddingBottom: 4 } },
    dynamicField: { width: 220, height: 38, dataKey: "employeeName", content: "{ employeeName }", style: { fontSize: 13, color: "#16a34a", fontWeight: "600", paddingTop: 6, paddingLeft: 10, paddingRight: 10, paddingBottom: 6, backgroundColor: "#f0fdf4", borderRadius: 6 } },
    companyHeader: {
      width: 794, height: 110,
      extraData: { companyName: "Company Name", companyAddress: "123 Business Street, City · contact@company.com" },
      style: { backgroundColor: "#16a34a", color: "#ffffff", fontSize: 20, fontWeight: "bold", paddingTop: 24, paddingLeft: 36, paddingRight: 36, paddingBottom: 24 },
    },
    infoGrid: {
      width: 730, height: 120,
      extraData: { f1: "Employee Name", f2: "Employee ID", f3: "Designation", f4: "Department", f5: "Date of Joining", f6: "Pay Period", f7: "PAN Number", f8: "Pay Date" },
      style: { backgroundColor: "#f8fafc", borderColor: "#e2e8f0", borderWidth: 1, borderRadius: 10, paddingTop: 16, paddingLeft: 16, paddingRight: 16, paddingBottom: 16 },
    },
    earningsTable: {
      width: 355, height: 220,
      extraData: {
        col1: "Component", col2: "Amount", total: "Total Earnings",
        rows: JSON.stringify(DEFAULT_EARNING_ROWS),
      },
      style: { backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderWidth: 1, borderRadius: 8, paddingTop: 10, paddingLeft: 10, paddingRight: 10, paddingBottom: 10 },
    },
    deductionsTable: {
      width: 355, height: 220,
      extraData: {
        col1: "Component", col2: "Amount", total: "Total Deductions",
        rows: JSON.stringify(DEFAULT_DEDUCTION_ROWS),
      },
      style: { backgroundColor: "#fff8f8", borderColor: "#fecaca", borderWidth: 1, borderRadius: 8, paddingTop: 10, paddingLeft: 10, paddingRight: 10, paddingBottom: 10 },
    },
    netPayBar: {
      width: 730, height: 68,
      extraData: { subtitle: "Gross {{grossSalary}} − Deductions {{totalDeductions}}" },
      style: { backgroundColor: "#f0fdf4", borderColor: "#16a34a", borderWidth: 1, borderRadius: 12, paddingTop: 16, paddingLeft: 20, paddingRight: 20, paddingBottom: 16 },
    },
    attendanceGrid: {
      width: 730, height: 96,
      extraData: { s1: "Total Days", s2: "Present", s3: "Absent", s4: "Paid Leave", s5: "LOP", s6: "OT Hours" },
      style: { backgroundColor: "#f8fafc", borderRadius: 8, paddingTop: 12, paddingLeft: 12, paddingRight: 12, paddingBottom: 12 },
    },
    leaveTable: {
      width: 730, height: 140,
      extraData: { col1: "Leave Type", col2: "Entitled", col3: "Taken", col4: "Balance" },
      style: { backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderWidth: 1, borderRadius: 8, paddingTop: 10, paddingLeft: 10, paddingRight: 10, paddingBottom: 10 },
    },
    bankGrid: {
      width: 730, height: 96,
      extraData: { f1: "Bank Name", f2: "Account Number", f3: "IFSC Code", f4: "Payment Mode" },
      style: { backgroundColor: "#f8fafc", borderRadius: 8, paddingTop: 12, paddingLeft: 12, paddingRight: 12, paddingBottom: 12 },
    },
    divider: { width: 730, height: 2, style: { backgroundColor: "#e2e8f0" } },
    image: { width: 80, height: 80, src: "", style: { borderRadius: 8 } },
    rect: { width: 200, height: 80, style: { backgroundColor: "#f0fdf4", borderRadius: 8 } },
    circle: { width: 80, height: 80, style: { backgroundColor: "#6366f1" } },
    badge: {
      width: 110, height: 28, content: "BADGE",
      style: { backgroundColor: "#dcfce7", color: "#16a34a", fontSize: 11, fontWeight: "700", borderRadius: 999, paddingTop: 4, paddingLeft: 12, paddingRight: 12, paddingBottom: 4, textAlign: "center" },
    },
    star: { width: 60, height: 60, style: { color: "#f59e0b" } },
    signatureLine: {
      width: 260, height: 60,
      extraData: { label: "Authorized Signature" },
      style: { color: "#475569", fontSize: 10 },
    },
    watermark: {
      width: 500, height: 120, content: "CONFIDENTIAL",
      style: { fontSize: 64, fontWeight: "900", color: "#e2e8f0", textAlign: "center", opacity: 0.18, letterSpacing: 8 },
    },
    qrPlaceholder: {
      width: 80, height: 80,
      extraData: { label: "QR Code" },
      style: { borderColor: "#cbd5e1", borderWidth: 2, borderRadius: 6, backgroundColor: "#f8fafc" },
    },
  };
  const d = defs[type] || {};
  return {
    elId: id, type, x, y,
    width: d.width ?? 200, height: d.height ?? 40,
    zIndex: n + 1, locked: false,
    content: (d as any).content,
    dataKey: (d as any).dataKey,
    src: (d as any).src,
    extraData: (d as any).extraData,
    style: d.style ?? {},
  };
};

// ─── CSS converter ────────────────────────────────────────────────────────────

const toCSS = (s: ElementStyle = {}): React.CSSProperties => ({
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
  textDecoration: s.textDecoration as any,
  textTransform: s.textTransform as any,
  boxShadow: s.boxShadow,
  overflow: "hidden", width: "100%", height: "100%", boxSizing: "border-box",
});

// ─── Element preview ──────────────────────────────────────────────────────────

function ElemPreview({ el, editingId, editingRef, onTextBlur }: {
  el: CanvasElement;
  editingId: string | null;
  editingRef: React.MutableRefObject<HTMLDivElement | null>;
  onTextBlur: (id: string, text: string) => void;
}) {
  const cs = toCSS(el.style);
  const isTE = editingId === el.elId && (el.type === "text" || el.type === "heading");

  if (el.type === "text" || el.type === "heading") {
    if (isTE) {
      return (
        <div
          ref={editingRef as any}
          contentEditable suppressContentEditableWarning
          style={{ ...cs, outline: "none", whiteSpace: "pre-wrap", wordBreak: "break-word", cursor: "text" }}
          onBlur={e => onTextBlur(el.elId, e.currentTarget.textContent || "")}
        >{el.content || ""}</div>
      );
    }
    return <div style={{ ...cs, whiteSpace: "pre-wrap", wordBreak: "break-word", userSelect: "none" }}>{el.content || (el.type === "heading" ? "Heading" : "Text Block")}</div>;
  }

  if (el.type === "dynamicField") {
    return (
      <div style={{ ...cs, userSelect: "none", display: "flex", alignItems: "center" }}>
        {getDV(el.dataKey || "")}
      </div>
    );
  }

  if (el.type === "companyHeader") {
    const titleLabel = el.content || SECTION_DEFAULTS.companyHeader;
    const companyName = getED(el, "companyName", "Company Name");
    const companyAddress = getED(el, "companyAddress", "123 Business Street, City · contact@company.com");
    const nameFs = el.style.fontSize || 20;
    const logoSize = sf(el, 52, 20);
    return (
      <div style={{ ...cs, display: "flex", alignItems: "center", gap: 14, userSelect: "none" }}>
        {/* Logo */}
        {el.src ? (
          <img src={el.src} alt="logo" style={{ width: logoSize, height: logoSize, objectFit: "contain", borderRadius: 8, flexShrink: 0, background: "rgba(255,255,255,0.15)" }} />
        ) : (
          <div style={{ width: logoSize, height: logoSize, borderRadius: 10, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: sf(el, 28, 20) }}>🏢</div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: "bold", fontSize: nameFs, color: el.style.color || "#fff" }}>{companyName}</div>
          <div style={{ fontSize: sf(el, 11, 20), opacity: 0.75, marginTop: 3, color: el.style.color || "#fff" }}>{companyAddress}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: sf(el, 10, 20), opacity: 0.7, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 700, color: el.style.color || "#fff" }}>{titleLabel}</div>
          <div style={{ fontSize: sf(el, 16, 20), fontWeight: "bold", marginTop: 2, color: el.style.color || "#fff" }}>June 2025</div>
          <div style={{ fontSize: sf(el, 10, 20), opacity: 0.7, marginTop: 1, color: el.style.color || "#fff" }}>Pay Date: 30 Jun 2025</div>
        </div>
      </div>
    );
  }

  if (el.type === "infoGrid") {
    const bc   = el.style.borderColor || "#e2e8f0";
    const hbg  = el.style.backgroundColor || "#f8fafc";
    const lc   = el.style.color || "#64748b";
    const vc   = "#1e293b";
    const fields: [string, string][] = [
      [getED(el, "f1", "Employee Name"), SD.employeeName],
      [getED(el, "f2", "Employee ID"), SD.employeeId],
      [getED(el, "f3", "Designation"), SD.designation],
      [getED(el, "f4", "Department"), SD.department],
      [getED(el, "f5", "Date of Joining"), SD.dateOfJoining],
      [getED(el, "f6", "Pay Period"), SD.payPeriod],
      [getED(el, "f7", "PAN Number"), SD.panNumber],
      [getED(el, "f8", "Pay Date"), SD.payDate],
    ];
    const rows2: [string, string][][] = [];
    for (let i = 0; i < fields.length; i += 4) rows2.push(fields.slice(i, i + 4) as [string, string][]);
    return (
      <div style={{ ...cs, userSelect: "none", padding: 0 }}>
        {(el.content || SECTION_DEFAULTS.infoGrid) && (
          <div style={{ fontSize: sf(el, 9), fontWeight: 700, textTransform: "uppercase", color: lc, letterSpacing: 1, marginBottom: 0, padding: `${(cs.paddingTop ?? 10)}px ${cs.paddingLeft ?? 12}px 6px` }}>{el.content || SECTION_DEFAULTS.infoGrid}</div>
        )}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: sf(el, 11), border: `1px solid ${bc}` }}>
          <tbody>
            {rows2.map((row, ri) => (
              <tr key={ri} style={{ borderTop: ri > 0 ? `1px solid ${bc}` : undefined }}>
                {row.map(([l, v], ci) => (
                  <td key={l} style={{
                    padding: "6px 10px",
                    borderRight: ci < row.length - 1 ? `1px solid ${bc}` : undefined,
                    background: hbg,
                    width: "25%",
                  }}>
                    <div style={{ fontSize: sf(el, 8.5), textTransform: "uppercase", color: lc, fontWeight: 600, letterSpacing: 0.6, opacity: 0.8 }}>{l}</div>
                    <div style={{ fontSize: sf(el, 11), fontWeight: 700, color: vc, marginTop: 2 }}>{v}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (el.type === "earningsTable") {
    const title       = el.content || SECTION_DEFAULTS.earningsTable;
    const col1        = getED(el, "col1", "Earnings Component");
    const col2        = getED(el, "col2", "Amount (₹)");
    const totalLabel  = getED(el, "total", "Total Earnings");
    const bc          = el.style.borderColor || "#bbf7d0";
    const ac          = el.style.color || "#15803d";
    const hbg         = `${ac}18`;
    const rows        = parseRows(el, true);
    const EARN_AMT    = [22500, 9000, 1600, 1250, 10650, 3000, 2000, 1500];
    const sampleTotal = rows.reduce((s, _, i) => s + (EARN_AMT[i] ?? 1000), 0);
    return (
      <div style={{ ...cs, userSelect: "none", overflow: "hidden", padding: 0 }}>
        {/* Section title */}
        <div style={{ fontSize: sf(el, 9.5), fontWeight: 700, textTransform: "uppercase", color: ac, letterSpacing: 1, padding: `${(cs.paddingTop ?? 10)}px ${cs.paddingLeft ?? 12}px 6px`, background: hbg, borderBottom: `1px solid ${bc}` }}>{title}</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: sf(el, 11) }}>
          <thead>
            <tr style={{ background: hbg }}>
              <th style={{ textAlign: "left", padding: "5px 10px", border: `1px solid ${bc}`, color: ac, fontWeight: 700, fontSize: sf(el, 10) }}>{col1}</th>
              <th style={{ textAlign: "right", padding: "5px 10px", border: `1px solid ${bc}`, color: ac, fontWeight: 700, fontSize: sf(el, 10), width: "35%" }}>{col2}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} style={{ background: i % 2 === 1 ? "#f0fdf4" : "transparent" }}>
                <td style={{ padding: "4px 10px", border: `1px solid ${bc}`, color: "#374151" }}>
                  {row.label}{row.required && <span style={{ color: "#ef4444", fontSize: "0.75em", marginLeft: 3 }}>*</span>}
                </td>
                <td style={{ textAlign: "right", padding: "4px 10px", border: `1px solid ${bc}`, color: "#1e293b", fontWeight: 500 }}>
                  {INR(EARN_AMT[i] ?? 1000)}
                </td>
              </tr>
            ))}
            <tr style={{ background: hbg }}>
              <td style={{ padding: "6px 10px", border: `1px solid ${bc}`, fontWeight: 700, color: ac }}>{totalLabel}</td>
              <td style={{ textAlign: "right", padding: "6px 10px", border: `1px solid ${bc}`, fontWeight: 800, color: ac, fontSize: sf(el, 12) }}>{INR(sampleTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (el.type === "deductionsTable") {
    const title       = el.content || SECTION_DEFAULTS.deductionsTable;
    const col1        = getED(el, "col1", "Deductions Component");
    const col2        = getED(el, "col2", "Amount (₹)");
    const totalLabel  = getED(el, "total", "Total Deductions");
    const dc          = el.style.color || "#dc2626";
    const bc          = el.style.borderColor || "#fecaca";
    const hbg         = `${dc}12`;
    const rows        = parseRows(el, false);
    const DED_AMT     = [2700, 338, 200, 3587, 500, 300, 250];
    const sampleTotal = rows.reduce((s, _, i) => s + (DED_AMT[i] ?? 300), 0);
    return (
      <div style={{ ...cs, userSelect: "none", overflow: "hidden", padding: 0 }}>
        <div style={{ fontSize: sf(el, 9.5), fontWeight: 700, textTransform: "uppercase", color: dc, letterSpacing: 1, padding: `${(cs.paddingTop ?? 10)}px ${cs.paddingLeft ?? 12}px 6px`, background: hbg, borderBottom: `1px solid ${bc}` }}>{title}</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: sf(el, 11) }}>
          <thead>
            <tr style={{ background: hbg }}>
              <th style={{ textAlign: "left", padding: "5px 10px", border: `1px solid ${bc}`, color: dc, fontWeight: 700, fontSize: sf(el, 10) }}>{col1}</th>
              <th style={{ textAlign: "right", padding: "5px 10px", border: `1px solid ${bc}`, color: dc, fontWeight: 700, fontSize: sf(el, 10), width: "35%" }}>{col2}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} style={{ background: i % 2 === 1 ? "#fff5f5" : "transparent" }}>
                <td style={{ padding: "4px 10px", border: `1px solid ${bc}`, color: "#374151" }}>
                  {row.label}{row.required && <span style={{ color: "#ef4444", fontSize: "0.75em", marginLeft: 3 }}>*</span>}
                </td>
                <td style={{ textAlign: "right", padding: "4px 10px", border: `1px solid ${bc}`, color: dc, fontWeight: 500 }}>
                  {INR(DED_AMT[i] ?? 300)}
                </td>
              </tr>
            ))}
            <tr style={{ background: hbg }}>
              <td style={{ padding: "6px 10px", border: `1px solid ${bc}`, fontWeight: 700, color: dc }}>{totalLabel}</td>
              <td style={{ textAlign: "right", padding: "6px 10px", border: `1px solid ${bc}`, fontWeight: 800, color: dc, fontSize: sf(el, 12) }}>{INR(sampleTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (el.type === "netPayBar") {
    const title    = el.content || SECTION_DEFAULTS.netPayBar;
    const nc       = el.style.color || "#15803d";
    const bc       = el.style.borderColor || nc;
    const subtitle = getED(el, "subtitle", `Gross ${INR(SD.totalEarnings)} − Deductions ${INR(SD.totalDeductions)}`);
    return (
      <div style={{ ...cs, display: "flex", justifyContent: "space-between", alignItems: "center", userSelect: "none" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: sf(el, 9.5), fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: nc, opacity: 0.8 }}>{title}</div>
          <div style={{ fontSize: sf(el, 10.5), color: "#475569", fontWeight: 500 }}>{subtitle}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: sf(el, 8), textTransform: "uppercase", color: nc, opacity: 0.7, letterSpacing: 1, fontWeight: 600 }}>Net Pay</div>
          <div style={{ fontSize: sf(el, 28), fontWeight: 900, color: nc, lineHeight: 1.1 }}>{INR(SD.netPay)}</div>
        </div>
      </div>
    );
  }

  if (el.type === "attendanceGrid") {
    const title  = el.content || SECTION_DEFAULTS.attendanceGrid;
    const ac     = el.style.color || "#0369a1";
    const bc     = el.style.borderColor || "#bae6fd";
    const hbg    = el.style.backgroundColor || "#f0f9ff";
    const stats: [string, number, string][] = [
      [getED(el, "s1", "Total Days"),  SD.totalDays,    "#1e293b"],
      [getED(el, "s2", "Present"),     SD.presentDays,  "#15803d"],
      [getED(el, "s3", "Absent"),      SD.absentDays,   "#dc2626"],
      [getED(el, "s4", "Paid Leave"),  SD.leaveDays,    "#d97706"],
      [getED(el, "s5", "LOP"),         SD.lopDays,      "#9333ea"],
      [getED(el, "s6", "OT Hours"),    SD.overtimeHours,"#0369a1"],
    ];
    return (
      <div style={{ ...cs, userSelect: "none", overflow: "hidden", padding: 0 }}>
        {title && (
          <div style={{ fontSize: sf(el, 9.5), fontWeight: 700, textTransform: "uppercase", color: ac, letterSpacing: 1, padding: `${(cs.paddingTop ?? 10)}px ${cs.paddingLeft ?? 12}px 6px`, background: hbg, borderBottom: `1px solid ${bc}` }}>{title}</div>
        )}
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <tbody>
            <tr>
              {stats.map(([l, v, vc]) => (
                <td key={l} style={{ border: `1px solid ${bc}`, padding: "8px 4px", textAlign: "center", background: hbg }}>
                  <div style={{ fontSize: sf(el, 17), fontWeight: 800, color: vc, lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: sf(el, 8.5), color: "#64748b", marginTop: 3, lineHeight: 1.2, fontWeight: 600 }}>{l}</div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (el.type === "leaveTable") {
    const title      = el.content || SECTION_DEFAULTS.leaveTable;
    const lc         = el.style.color || "#7c3aed";
    const bc         = el.style.borderColor || "#ddd6fe";
    const hbg        = `${lc}12`;
    const headers    = [
      getED(el, "col1", "Leave Type"),
      getED(el, "col2", "Entitled"),
      getED(el, "col3", "Taken"),
      getED(el, "col4", "Balance"),
    ];
    return (
      <div style={{ ...cs, userSelect: "none", overflow: "hidden", padding: 0 }}>
        <div style={{ fontSize: sf(el, 9.5), fontWeight: 700, textTransform: "uppercase", color: lc, letterSpacing: 1, padding: `${(cs.paddingTop ?? 10)}px ${cs.paddingLeft ?? 12}px 6px`, background: hbg, borderBottom: `1px solid ${bc}` }}>{title}</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: sf(el, 11) }}>
          <thead>
            <tr style={{ background: hbg }}>
              {headers.map((h, i) => (
                <th key={i} style={{ textAlign: i === 0 ? "left" : "center", padding: "5px 8px", border: `1px solid ${bc}`, color: lc, fontWeight: 700, fontSize: sf(el, 10) }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SL.map((l, i) => (
              <tr key={l.type} style={{ background: i % 2 === 1 ? "#faf5ff" : "transparent" }}>
                <td style={{ padding: "5px 8px", border: `1px solid ${bc}`, color: "#374151" }}>{l.type}</td>
                <td style={{ textAlign: "center", padding: "5px 8px", border: `1px solid ${bc}`, color: "#475569" }}>{l.entitled}</td>
                <td style={{ textAlign: "center", padding: "5px 8px", border: `1px solid ${bc}`, color: "#dc2626" }}>{l.taken}</td>
                <td style={{ textAlign: "center", padding: "5px 8px", border: `1px solid ${bc}`, fontWeight: 700, color: lc }}>{l.balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (el.type === "bankGrid") {
    const title  = el.content || SECTION_DEFAULTS.bankGrid;
    const ac     = el.style.color || "#0369a1";
    const bc     = el.style.borderColor || "#e2e8f0";
    const hbg    = el.style.backgroundColor || "#f8fafc";
    const fields: [string, string][] = [
      [getED(el, "f1", "Bank Name"),       SD.bankName],
      [getED(el, "f2", "Account Number"),  SD.accountNumber],
      [getED(el, "f3", "IFSC Code"),       SD.ifscCode],
      [getED(el, "f4", "Payment Mode"),    SD.paymentMode],
    ];
    return (
      <div style={{ ...cs, userSelect: "none", overflow: "hidden", padding: 0 }}>
        {title && (
          <div style={{ fontSize: sf(el, 9.5), fontWeight: 700, textTransform: "uppercase", color: ac, letterSpacing: 1, padding: `${(cs.paddingTop ?? 10)}px ${cs.paddingLeft ?? 12}px 6px`, background: hbg, borderBottom: `1px solid ${bc}` }}>{title}</div>
        )}
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
          <tbody>
            <tr>
              {fields.map(([l, v]) => (
                <td key={l} style={{ border: `1px solid ${bc}`, padding: "8px 10px", background: hbg }}>
                  <div style={{ fontSize: sf(el, 8.5), textTransform: "uppercase", color: "#94a3b8", fontWeight: 600, letterSpacing: 0.6, marginBottom: 3 }}>{l}</div>
                  <div style={{ fontSize: sf(el, 11), fontWeight: 700, color: "#1e293b", fontFamily: "monospace", wordBreak: "break-all" }}>{v}</div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (el.type === "star") {
    const starColor = el.style.color || "#f59e0b";
    const size = Math.min(el.width, el.height);
    const pts = Array.from({ length: 5 }, (_, i) => {
      const outer = (i * 72 - 90) * (Math.PI / 180);
      const inner = ((i * 72 + 36) - 90) * (Math.PI / 180);
      const r = size / 2; const ri = r * 0.4;
      const cx = el.width / 2; const cy = el.height / 2;
      return `${cx + r * Math.cos(outer)},${cy + r * Math.sin(outer)} ${cx + ri * Math.cos(inner)},${cy + ri * Math.sin(inner)}`;
    }).join(" ");
    return (
      <svg width={el.width} height={el.height} style={{ overflow: "visible", userSelect: "none", opacity: el.style.opacity }}>
        <polygon points={pts} fill={starColor} stroke={el.style.borderColor || "none"} strokeWidth={el.style.borderWidth || 0} />
      </svg>
    );
  }

  if (el.type === "signatureLine") {
    const label = getED(el, "label", "Authorized Signature");
    const lineColor = el.style.borderColor || "#94a3b8";
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 2, paddingLeft: 4, paddingRight: 4, userSelect: "none" }}>
        <div style={{ borderBottom: `1.5px dashed ${lineColor}`, marginBottom: 4, opacity: el.style.opacity ?? 1 }} />
        <div style={{ fontSize: sf(el, 10, 10), color: el.style.color || "#64748b", textAlign: (el.style.textAlign || "center") as any, fontStyle: "italic" }}>{label}</div>
      </div>
    );
  }

  if (el.type === "watermark") {
    return (
      <div style={{
        ...cs,
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: "rotate(-25deg)",
        userSelect: "none",
        whiteSpace: "nowrap",
      }}>
        {el.content || "CONFIDENTIAL"}
      </div>
    );
  }

  if (el.type === "qrPlaceholder") {
    const label = getED(el, "label", "QR Code");
    const qrColor = el.style.borderColor || "#94a3b8";
    return (
      <div style={{ ...cs, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, userSelect: "none" }}>
        {/* Mini QR pattern */}
        <svg width={Math.min(el.width - 16, 48)} height={Math.min(el.height - 20, 48)} viewBox="0 0 48 48">
          <rect x="2" y="2" width="18" height="18" rx="2" fill="none" stroke={qrColor} strokeWidth="2.5"/>
          <rect x="7" y="7" width="8" height="8" rx="1" fill={qrColor}/>
          <rect x="28" y="2" width="18" height="18" rx="2" fill="none" stroke={qrColor} strokeWidth="2.5"/>
          <rect x="33" y="7" width="8" height="8" rx="1" fill={qrColor}/>
          <rect x="2" y="28" width="18" height="18" rx="2" fill="none" stroke={qrColor} strokeWidth="2.5"/>
          <rect x="7" y="33" width="8" height="8" rx="1" fill={qrColor}/>
          <rect x="28" y="28" width="4" height="4" fill={qrColor}/>
          <rect x="34" y="28" width="4" height="4" fill={qrColor}/>
          <rect x="40" y="28" width="6" height="4" fill={qrColor}/>
          <rect x="28" y="34" width="6" height="4" fill={qrColor}/>
          <rect x="36" y="34" width="4" height="4" fill={qrColor}/>
          <rect x="28" y="40" width="4" height="6" fill={qrColor}/>
          <rect x="34" y="40" width="8" height="6" fill={qrColor}/>
        </svg>
        <div style={{ fontSize: sf(el, 8, 8), color: qrColor, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      </div>
    );
  }

  if (el.type === "circle") {
    const circleBorder = el.style.borderWidth
      ? `${el.style.borderWidth}px ${el.style.borderStyle || "solid"} ${el.style.borderColor || "transparent"}`
      : undefined;
    return (
      <div style={{
        width: "100%", height: "100%",
        borderRadius: "50%",
        backgroundColor: el.style.backgroundColor || "#6366f1",
        border: circleBorder,
        opacity: el.style.opacity,
        userSelect: "none",
        boxSizing: "border-box",
      }} />
    );
  }

  if (el.type === "badge") {
    return (
      <div style={{
        ...cs,
        display: "flex", alignItems: "center", justifyContent: "center",
        whiteSpace: "nowrap", overflow: "hidden",
        userSelect: "none",
      }}>
        {el.content || "BADGE"}
      </div>
    );
  }

  if (el.type === "divider") return <div style={{ width: "100%", height: "100%", backgroundColor: el.style.backgroundColor || el.style.borderColor || "#e2e8f0" }} />;
  if (el.type === "image") return el.src
    ? <img src={el.src} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: el.style.borderRadius || 0 }} alt="" />
    : <div style={{ width: "100%", height: "100%", background: "#f1f5f9", border: "2px dashed #cbd5e1", borderRadius: el.style.borderRadius || 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#94a3b8", flexDirection: "column", gap: 4, userSelect: "none" }}>
        <span style={{ fontSize: 18 }}>🖼️</span>
        <span>Upload or paste URL</span>
      </div>;
  if (el.type === "rect") return <div style={{ ...cs, userSelect: "none" }} />;
  return null;
}

// ─── Resize handles ───────────────────────────────────────────────────────────

type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const HANDLES: Handle[] = ["nw","n","ne","e","se","s","sw","w"];

function ResizeHandles({ onMD }: { onMD: (h: Handle, e: React.MouseEvent) => void }) {
  return (
    <>
      {HANDLES.map(h => {
        const s: React.CSSProperties = {
          position: "absolute", width: 8, height: 8,
          background: "#16a34a", border: "2px solid #fff",
          borderRadius: 2, zIndex: 10000, cursor: `${h}-resize`,
          boxShadow: "0 0 0 1px #16a34a",
        };
        if (h.includes("n")) s.top = -4; else if (h.includes("s")) s.bottom = -4; else s.top = "calc(50% - 4px)";
        if (h.includes("w")) s.left = -4; else if (h.includes("e")) s.right = -4; else s.left = "calc(50% - 4px)";
        return <div key={h} style={s} onMouseDown={e => { e.stopPropagation(); onMD(h, e); }} />;
      })}
    </>
  );
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function NumInput({ label, value, onChange, min, max, step = 1 }: {
  label: string; value: number | undefined; onChange: (v: number) => void; min?: number; max?: number; step?: number;
}) {
  return (
    <div>
      <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">{label}</Label>
      <Input type="number" value={value ?? ""} min={min} max={max} step={step}
        className="h-7 text-xs rounded-lg border-slate-200 bg-white text-slate-800 font-mono"
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function EdField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-[10px] text-slate-400 block mb-0.5">{label}</Label>
      <Input
        className="h-6 text-[11px] rounded-md border-slate-200 bg-white text-slate-800 px-2"
        value={value} placeholder={placeholder || label}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 pb-3 last:border-0">
      <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">{label}</p>
      {children}
    </div>
  );
}

// ─── Rows Editor ─────────────────────────────────────────────────────────────

function RowsEditor({ el, onRowsChange }: {
  el: CanvasElement;
  onRowsChange: (rows: TableRow[]) => void;
}) {
  const isEarnings = el.type === "earningsTable";
  const rows = parseRows(el, isEarnings);

  const addRow = () => {
    const newRow: TableRow = {
      id: `r_${Date.now()}`,
      label: isEarnings ? "New Allowance" : "New Deduction",
      required: false,
    };
    onRowsChange([...rows, newRow]);
  };

  const updateRow = (id: string, updates: Partial<TableRow>) =>
    onRowsChange(rows.map(r => r.id === id ? { ...r, ...updates } : r));

  const deleteRow = (id: string) => onRowsChange(rows.filter(r => r.id !== id));

  const moveRow = (id: string, dir: -1 | 1) => {
    const idx = rows.findIndex(r => r.id === id);
    if (idx < 0) return;
    const next = [...rows];
    const [moved] = next.splice(idx, 1);
    next.splice(Math.max(0, Math.min(next.length, idx + dir)), 0, moved);
    onRowsChange(next);
  };

  return (
    <Section label={isEarnings ? "Earning Rows" : "Deduction Rows"}>
      <p className="text-[10px] text-slate-400 mb-2">
        <span className="text-red-500 font-bold">*</span> Required fields always show on payslip · Optional fields can be skipped
      </p>
      <div className="space-y-1.5">
        {rows.map((row, idx) => (
          <div key={row.id} className="flex items-center gap-1">
            {/* Reorder */}
            <div className="flex flex-col gap-0">
              <button
                disabled={idx === 0}
                className="text-slate-300 hover:text-slate-500 disabled:opacity-20 transition-colors"
                onClick={() => moveRow(row.id, -1)}
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                disabled={idx === rows.length - 1}
                className="text-slate-300 hover:text-slate-500 disabled:opacity-20 transition-colors"
                onClick={() => moveRow(row.id, 1)}
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
            {/* Label */}
            <Input
              className="flex-1 h-6 text-[11px] rounded-md border-slate-200 bg-white text-slate-800 px-2 min-w-0"
              value={row.label}
              onChange={e => updateRow(row.id, { label: e.target.value })}
            />
            {/* Required toggle */}
            <button
              title={row.required ? "Required — click to make Optional" : "Optional — click to make Required"}
              className={`flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded font-bold transition-colors ${row.required
                ? "bg-red-100 text-red-600 hover:bg-red-200"
                : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
              onClick={() => updateRow(row.id, { required: !row.required })}
            >
              {row.required ? "Req" : "Opt"}
            </button>
            {/* Delete */}
            <button
              className="flex-shrink-0 text-slate-300 hover:text-red-400 transition-colors"
              onClick={() => deleteRow(row.id)}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <button
        className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-slate-300 hover:border-green-400 hover:bg-green-50 text-slate-500 hover:text-green-700 text-xs font-medium transition-colors"
        onClick={addRow}
      >
        <Plus className="h-3.5 w-3.5" /> Add Row
      </button>
    </Section>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

interface Props {
  template?: SalaryTemplate | null;
  initialBgImage?: string;
  initialElements?: CanvasElement[];
  initialCanvasBg?: string;
  onBack: () => void;
  onSaved: (t: SalaryTemplate) => void;
}

export default function SalaryTemplateCanvasEditor({ template, initialBgImage, initialElements, initialCanvasBg, onBack, onSaved }: Props) {
  const [elements, setElements] = useState<CanvasElement[]>(template?.elements ?? initialElements ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState(template?.name ?? "Imported Template");
  const [canvasBg, setCanvasBg] = useState(template?.canvasBg ?? initialCanvasBg ?? "#ffffff");
  const [isDefault, setIsDefault] = useState(template?.isDefault ?? false);
  const [bgImage, setBgImage] = useState(template?.bgImage ?? initialBgImage ?? "");
  const [bgOpacity, setBgOpacity] = useState(template?.bgOpacity ?? (initialBgImage ? 1 : 0.5));
  // Show import helper panel when this is a freshly-imported template
  const [showImportHelper, setShowImportHelper] = useState(!template && (!!initialBgImage || !!initialElements?.length));
  const [isSaving, setIsSaving] = useState(false);
  const [scale, setScale] = useState(0.9);

  // Dynamic canvas dimensions (paper size)
  const [canvasW, setCanvasW] = useState(template?.canvasWidth ?? DEFAULT_CW);
  const [canvasH, setCanvasH] = useState(template?.canvasHeight ?? DEFAULT_CH);
  const [paperSize, setPaperSize] = useState<string>(() => {
    const cw = template?.canvasWidth ?? DEFAULT_CW;
    const ch = template?.canvasHeight ?? DEFAULT_CH;
    return PAPER_SIZES.find(p => p.w === cw && p.h === ch)?.label ?? "Custom";
  });

  // Grid & display
  const [showGrid, setShowGrid] = useState(false);
  const [snapGrid, setSnapGrid] = useState(false);
  const snapGridRef = useRef(false);
  useEffect(() => { snapGridRef.current = snapGrid; }, [snapGrid]);
  const GRID = 10;

  // Undo / redo
  const histRef = useRef<CanvasElement[][]>([]);
  const futRef  = useRef<CanvasElement[][]>([]);
  const elRef   = useRef<CanvasElement[]>(elements);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  useEffect(() => { elRef.current = elements; }, [elements]);

  const pushUndo = useCallback(() => {
    histRef.current = [...histRef.current.slice(-50), [...elRef.current]];
    futRef.current  = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    if (!histRef.current.length) return;
    setElements(prev => {
      futRef.current = [[...prev], ...futRef.current.slice(0, 49)];
      const snapshot = histRef.current[histRef.current.length - 1];
      histRef.current = histRef.current.slice(0, -1);
      setCanUndo(histRef.current.length > 0);
      setCanRedo(true);
      return snapshot;
    });
  }, []);

  const redo = useCallback(() => {
    if (!futRef.current.length) return;
    setElements(prev => {
      histRef.current = [...histRef.current.slice(-49), [...prev]];
      const snapshot = futRef.current[0];
      futRef.current = futRef.current.slice(1);
      setCanUndo(true);
      setCanRedo(futRef.current.length > 0);
      return snapshot;
    });
  }, []);

  const canvasRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const editingDivRef = useRef<HTMLDivElement | null>(null);
  const canvasWRef = useRef(canvasW);

  const dragRef = useRef<{ elId: string; smx: number; smy: number; sex: number; sey: number } | null>(null);
  const resizeRef = useRef<{ elId: string; handle: Handle; smx: number; smy: number; sex: number; sey: number; sew: number; seh: number } | null>(null);

  const selectedEl = elements.find(e => e.elId === selectedId) ?? null;

  // Sync canvasWRef
  useEffect(() => { canvasWRef.current = canvasW; }, [canvasW]);

  // Scale: width-only so canvas scrolls vertically
  useEffect(() => {
    const ws = workspaceRef.current;
    if (!ws) return;
    const obs = new ResizeObserver(([entry]) => {
      const { width } = entry.contentRect;
      setScale(Math.min((width - 64) / canvasWRef.current, 1));
    });
    obs.observe(ws);
    return () => obs.disconnect();
  }, []);

  // Recalculate scale when canvas width changes
  useEffect(() => {
    if (workspaceRef.current) {
      const w = workspaceRef.current.clientWidth;
      setScale(Math.min((w - 64) / canvasW, 1));
    }
  }, [canvasW]);

  // Document drag/resize
  useEffect(() => {
    const getScale = () => canvasRef.current ? canvasRef.current.getBoundingClientRect().width / canvasWRef.current : scale;

    const snapV = (v: number) => snapGridRef.current ? Math.round(v / GRID) * GRID : v;
    const onMove = (e: MouseEvent) => {
      const s = getScale();
      if (dragRef.current) {
        const { elId, smx, smy, sex, sey } = dragRef.current;
        setElements(prev => prev.map(el =>
          el.elId === elId
            ? { ...el, x: snapV(Math.max(0, sex + (e.clientX - smx) / s)), y: snapV(Math.max(0, sey + (e.clientY - smy) / s)) }
            : el
        ));
      }
      if (resizeRef.current) {
        const { elId, handle: h, smx, smy, sex, sey, sew, seh } = resizeRef.current;
        const dx = (e.clientX - smx) / s;
        const dy = (e.clientY - smy) / s;
        let x = sex, y = sey, w = sew, hh = seh;
        if (h.includes("e")) w = Math.max(40, snapV(sew + dx));
        if (h.includes("s")) hh = Math.max(8, snapV(seh + dy));
        if (h.includes("w")) { x = snapV(sex + dx); w = Math.max(40, sew - dx); }
        if (h.includes("n")) { y = snapV(sey + dy); hh = Math.max(8, seh - dy); }
        setElements(prev => prev.map(el =>
          el.elId === elId ? { ...el, x, y, width: w, height: hh } : el
        ));
      }
    };
    const onUp = () => { dragRef.current = null; resizeRef.current = null; };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingTextId) return;

      // Ctrl+Z undo / Ctrl+Y or Ctrl+Shift+Z redo (work even with inputs focused)
      if (e.ctrlKey && e.key === "z") { e.preventDefault(); undo(); return; }
      if (e.ctrlKey && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); redo(); return; }

      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        if (elements.find(el => el.elId === selectedId)?.locked) return;
        pushUndo();
        setElements(prev => prev.filter(el => el.elId !== selectedId));
        setSelectedId(null);
      }
      if (e.key === "Escape") { setSelectedId(null); setEditingTextId(null); }
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key) && selectedId) {
        const step = e.shiftKey ? 10 : 1;
        const [dx, dy] = { ArrowUp: [0,-step], ArrowDown: [0,step], ArrowLeft: [-step,0], ArrowRight: [step,0] }[e.key]!;
        setElements(prev => prev.map(el =>
          el.elId === selectedId ? { ...el, x: el.x + dx, y: el.y + dy } : el
        ));
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, editingTextId, elements, undo, redo, pushUndo]);

  // ─── Operations ─────────────────────────────────────────────────────────────

  const addElement = (type: CanvasElementType, ow?: number, oh?: number) => {
    pushUndo();
    const el = makeEl(type, Math.round(canvasW / 2 - 150), Math.round(elements.length * 20 + 40), elements.length);
    if (ow !== undefined) el.width = ow;
    if (oh !== undefined) el.height = oh;
    setElements(prev => [...prev, el]);
    setSelectedId(el.elId);
  };

  const updateEl = useCallback((id: string, updates: Partial<CanvasElement>) => {
    pushUndo();
    setElements(prev => prev.map(el => el.elId === id ? { ...el, ...updates } : el));
  }, [pushUndo]);

  const updateStyle = useCallback((id: string, su: Partial<ElementStyle>) => {
    pushUndo();
    setElements(prev => prev.map(el => el.elId === id ? { ...el, style: { ...el.style, ...su } } : el));
  }, [pushUndo]);

  const updateED = useCallback((id: string, key: string, value: string) => {
    pushUndo();
    setElements(prev => prev.map(el =>
      el.elId === id ? { ...el, extraData: { ...(el.extraData || {}), [key]: value } } : el
    ));
  }, [pushUndo]);

  const duplicateEl = (id: string) => {
    pushUndo();
    const el = elements.find(e => e.elId === id);
    if (!el) return;
    const copy = { ...el, elId: `el_${Date.now()}`, x: el.x + 16, y: el.y + 16, zIndex: elements.length + 1 };
    setElements(prev => [...prev, copy]);
    setSelectedId(copy.elId);
  };

  // Align to canvas helpers
  const alignEl = (axis: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom") => {
    if (!selectedId) return;
    pushUndo();
    setElements(prev => prev.map(el => {
      if (el.elId !== selectedId) return el;
      let x = el.x, y = el.y;
      if (axis === "left")    x = 0;
      if (axis === "hcenter") x = Math.round((canvasW - el.width) / 2);
      if (axis === "right")   x = canvasW - el.width;
      if (axis === "top")     y = 0;
      if (axis === "vcenter") y = Math.round((canvasH - el.height) / 2);
      if (axis === "bottom")  y = canvasH - el.height;
      return { ...el, x, y };
    }));
  };

  const handleImageUpload = (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      // Optimistically show the image while uploading
      updateEl(id, { src: base64 });
      try {
        const cloudUrl = await salaryTemplateService.uploadImage(base64);
        if (cloudUrl) updateEl(id, { src: cloudUrl });
      } catch {
        // Cloudinary unavailable — keep the preview but warn
        toast({ title: "Image stored locally — Cloudinary upload failed", variant: "destructive" });
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePaperSizeChange = (label: string) => {
    setPaperSize(label);
    const ps = PAPER_SIZES.find(p => p.label === label);
    if (ps && ps.w > 0) {
      setCanvasW(ps.w);
      setCanvasH(ps.h);
    }
  };

  const handleSave = async () => {
    if (!templateName.trim()) { toast({ title: "Template name is required", variant: "destructive" }); return; }
    setIsSaving(true);
    try {
      const htmlTemplate = serializeElementsToHtml(elements, canvasBg, canvasW, canvasH);
      const payload = {
        name: templateName, isDefault, canvasBg, bgImage, bgOpacity,
        canvasWidth: canvasW, canvasHeight: canvasH, elements, htmlTemplate,
        companyName: "", companyAddress: "", companyLogoUrl: "",
        headerColor: "#16a34a", accentColor: "#22c55e",
        sections: { earnings: true, deductions: true, attendance: true, leaveDetails: true, bankDetails: true },
        customFields: [], footerNote: "",
      };
      const saved = template?._id
        ? await salaryTemplateService.update(template._id, payload)
        : await salaryTemplateService.create(payload);
      toast({ title: template?._id ? "Template updated" : "Template created" });
      onSaved(saved);
    } catch (err: any) {
      toast({ title: err.message || "Save failed", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const isTextType = selectedEl?.type === "text" || selectedEl?.type === "heading" || selectedEl?.type === "badge";
  const isSectionType = selectedEl ? Object.keys(SECTION_DEFAULTS).includes(selectedEl.type) : false;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-100">

      {/* ── Toolbar ── */}
      <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white border-b border-slate-200 shadow-sm flex-wrap min-h-[52px]">
        <Button variant="ghost" size="sm"
          className="text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg h-8 gap-1.5 text-xs font-medium flex-shrink-0"
          onClick={onBack}
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <div className="w-px h-5 bg-slate-200" />

        {/* Template name + default */}
        <input
          className="border border-slate-300 rounded-lg px-3 h-8 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-green-500 bg-white w-40"
          value={templateName}
          onChange={e => setTemplateName(e.target.value)}
          placeholder="Template Name"
        />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 font-medium">Default</span>
          <Switch checked={isDefault} onCheckedChange={setIsDefault} />
        </div>
        <div className="w-px h-5 bg-slate-200" />

        {/* Paper Size */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-500 font-medium">Page</span>
          <Select value={paperSize} onValueChange={handlePaperSizeChange}>
            <SelectTrigger className="h-7 text-xs rounded-lg border-slate-200 bg-white w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl z-[200]">
              {PAPER_SIZES.map(ps => (
                <SelectItem key={ps.label} value={ps.label} className="text-xs">{ps.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {paperSize === "Custom" && (
            <div className="flex items-center gap-1">
              <Input type="number" min={200} max={2000}
                className="h-7 w-12 text-xs font-mono border-slate-200 rounded-lg"
                value={canvasW} onChange={e => setCanvasW(Number(e.target.value))}
              />
              <span className="text-[10px] text-slate-400">×</span>
              <Input type="number" min={200} max={3000}
                className="h-7 w-12 text-xs font-mono border-slate-200 rounded-lg"
                value={canvasH} onChange={e => setCanvasH(Number(e.target.value))}
              />
            </div>
          )}
        </div>
        <div className="w-px h-5 bg-slate-200" />

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            title="Undo (Ctrl+Z)"
            disabled={!canUndo}
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            onClick={undo}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            title="Redo (Ctrl+Y)"
            disabled={!canRedo}
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            onClick={redo}
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="w-px h-5 bg-slate-200" />

        {/* Zoom */}
        <div className="flex items-center gap-0.5">
          <button
            title="Zoom out"
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            onClick={() => setScale(s => Math.max(0.25, s - 0.1))}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-[10px] text-slate-500 font-mono w-9 text-center">{Math.round(scale * 100)}%</span>
          <button
            title="Zoom in"
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            onClick={() => setScale(s => Math.min(2, s + 0.1))}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="w-px h-5 bg-slate-200" />

        {/* Grid */}
        <div className="flex items-center gap-1">
          <button
            title="Toggle grid"
            className={`h-7 px-2 flex items-center gap-1 rounded-lg text-xs font-medium transition-colors ${showGrid ? "bg-indigo-100 text-indigo-700" : "hover:bg-slate-100 text-slate-500"}`}
            onClick={() => setShowGrid(g => !g)}
          >
            <Grid3x3 className="h-3.5 w-3.5" /> Grid
          </button>
          <button
            title="Snap to grid"
            className={`h-7 px-2 flex items-center gap-1 rounded-lg text-xs font-medium transition-colors ${snapGrid ? "bg-green-100 text-green-700" : "hover:bg-slate-100 text-slate-500"}`}
            onClick={() => setSnapGrid(s => !s)}
          >
            Snap
          </button>
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-medium">BG</span>
            <input type="color" value={canvasBg} onChange={e => setCanvasBg(e.target.value)}
              className="h-7 w-7 rounded-md cursor-pointer border border-slate-300 p-0.5 bg-white"
            />
          </div>
          <label className="cursor-pointer h-7 px-2.5 flex items-center gap-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium">
            <Upload className="w-3 h-3" /> {bgImage ? "Bg ✓" : "BG Img"}
            <input type="file" accept="image/*" className="hidden" onChange={e => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = ev => setBgImage(ev.target?.result as string);
                reader.readAsDataURL(file);
              }
            }} />
          </label>
          {bgImage && (
            <button onClick={() => setBgImage("")} className="text-red-400 hover:text-red-600 text-xs font-bold" title="Remove BG image">✕</button>
          )}
          <div className="w-px h-5 bg-slate-200" />
          <Button size="sm" className="gradient-primary text-white rounded-lg h-8 gap-1.5 text-xs px-4 font-semibold flex-shrink-0" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ── Left Panel: Palette ── */}
        <div className="flex-shrink-0 w-48 bg-white border-r border-slate-200 overflow-y-auto py-3 shadow-sm">
          {PALETTE.map(group => (
            <div key={group.group} className="mb-4">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 px-3 mb-1.5">{group.group}</p>
              <div className="space-y-0.5 px-2">
                {group.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-green-50 hover:text-green-700 text-slate-600 transition-colors text-xs font-medium text-left group"
                      onClick={() => addElement(item.type, item.ow, item.oh)}
                    >
                      <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 group-hover:text-green-600 transition-colors" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="px-3 mt-1">
            <div className="border-t border-slate-100 pt-3">
              <p className="text-[10px] text-slate-400 leading-relaxed">Click to add · Drag to move · Corner handles to resize</p>
              <p className="text-[10px] text-slate-400 mt-1">Double-click text to edit · Del to delete</p>
            </div>
          </div>
        </div>

        {/* ── Canvas Workspace ── */}
        <div
          ref={workspaceRef}
          className="flex-1 overflow-auto flex flex-col"
          style={{ background: "#dde1e7" }}
          onClick={() => { setSelectedId(null); setEditingTextId(null); }}
        >
          {/* Import Helper Banner */}
          {showImportHelper && (
            <div
              className="flex-shrink-0 flex items-start gap-3 px-4 py-3 bg-indigo-600 text-white text-xs"
              onClick={e => e.stopPropagation()}
            >
              <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Upload className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                {initialElements?.length ? (
                  <>
                    <p className="font-bold text-sm mb-0.5">Template elements generated from your salary slip!</p>
                    <p className="text-white/80 leading-relaxed">
                      All standard salary sections have been created as <strong className="text-white">real editable elements</strong>.
                      Drag to reposition, resize, or click any element to customise its style, color, and content.
                      Add or remove sections from the left palette as needed, then save.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-sm mb-0.5">Your salary slip is loaded as the background</p>
                    <p className="text-white/80 leading-relaxed">
                      Now <strong className="text-white">add Dynamic Field elements</strong> from the left panel and
                      position them over the correct spots. Use the <strong className="text-white">opacity slider</strong> to dim the image while you work.
                    </p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <button
                  className="text-xs font-semibold bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 transition-colors"
                  onClick={() => { if (!initialElements?.length) setBgOpacity(0.35); setShowImportHelper(false); }}
                >
                  {initialElements?.length ? "Got It" : "Dim & Start"}
                </button>
                <button
                  className="text-white/60 hover:text-white text-lg leading-none px-1"
                  onClick={() => setShowImportHelper(false)}
                  title="Dismiss"
                >×</button>
              </div>
            </div>
          )}

          <div style={{ padding: 32, flex: 1 }}>
          <div style={{ width: canvasW * scale, height: canvasH * scale, position: "relative", margin: "0 auto" }}>
            <div
              ref={canvasRef}
              style={{
                width: canvasW, height: canvasH,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                position: "absolute",
                background: canvasBg,
                boxShadow: "0 4px 32px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.08)",
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Grid overlay */}
              {showGrid && (
                <div style={{
                  position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
                  backgroundImage: `linear-gradient(to right, #cbd5e122 1px, transparent 1px), linear-gradient(to bottom, #cbd5e122 1px, transparent 1px)`,
                  backgroundSize: `${GRID}px ${GRID}px`,
                }} />
              )}
              {bgImage && (
                <div style={{
                  position: "absolute", inset: 0,
                  backgroundImage: `url(${bgImage})`,
                  backgroundSize: "contain",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  opacity: bgOpacity,
                  pointerEvents: "none",
                  zIndex: 0
                }} />
              )}
              {[...elements].sort((a, b) => a.zIndex - b.zIndex).map(el => {
                const isSelected = el.elId === selectedId;
                return (
                  <div
                    key={el.elId}
                    style={{
                      position: "absolute", left: el.x, top: el.y, width: el.width, height: el.height,
                      zIndex: el.zIndex,
                      cursor: el.locked ? "default" : "move",
                      outline: isSelected ? "2px solid #16a34a" : "none",
                      outlineOffset: 1,
                    }}
                    onClick={e => { e.stopPropagation(); setSelectedId(el.elId); }}
                    onDoubleClick={() => {
                      if ((el.type === "text" || el.type === "heading") && !el.locked) {
                        setEditingTextId(el.elId);
                        setTimeout(() => {
                          editingDivRef.current?.focus();
                          const range = document.createRange();
                          const sel = window.getSelection();
                          if (editingDivRef.current) {
                            range.selectNodeContents(editingDivRef.current);
                            range.collapse(false);
                            sel?.removeAllRanges();
                            sel?.addRange(range);
                          }
                        }, 10);
                      }
                    }}
                    onMouseDown={e => {
                      if (el.locked || editingTextId === el.elId) return;
                      e.stopPropagation();
                      pushUndo();
                      setSelectedId(el.elId);
                      dragRef.current = { elId: el.elId, smx: e.clientX, smy: e.clientY, sex: el.x, sey: el.y };
                    }}
                  >
                    <ElemPreview
                      el={el}
                      editingId={editingTextId}
                      editingRef={editingDivRef}
                      onTextBlur={(id, text) => { updateEl(id, { content: text }); setEditingTextId(null); }}
                    />
                    {isSelected && !el.locked && (
                      <ResizeHandles
                        onMD={(h, e) => {
                          resizeRef.current = { elId: el.elId, handle: h, smx: e.clientX, smy: e.clientY, sex: el.x, sey: el.y, sew: el.width, seh: el.height };
                        }}
                      />
                    )}
                    {isSelected && el.locked && (
                      <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-amber-500 rounded-full w-4 h-4 flex items-center justify-center" style={{ zIndex: 10001 }}>
                        <Lock style={{ width: 8, height: 8, color: "#fff" }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          </div>{/* end padding wrapper */}
        </div>

        {/* ── Right Panel: Properties ── */}
        <div className="flex-shrink-0 w-64 bg-white border-l border-slate-200 overflow-y-auto shadow-sm">
          {!selectedEl ? (
            <div className="p-4 mt-2 space-y-4">
              <div className="flex flex-col items-center justify-center text-center mb-6">
                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                  <LayoutTemplate className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-xs font-semibold text-slate-500">No element selected</p>
                <p className="text-[11px] text-slate-400 mt-1">Click an element to edit its properties</p>
              </div>

              <Section label="Canvas Background Image">
                <label className="block cursor-pointer mb-3">
                  <input
                    type="file" accept="image/*" className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = ev => setBgImage(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                      e.target.value = "";
                    }}
                  />
                  <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border-2 border-dashed border-slate-300 hover:border-green-400 hover:bg-green-50 text-slate-500 hover:text-green-700 transition-colors text-xs font-medium">
                    <Upload className="h-3.5 w-3.5" />
                    {bgImage ? "Change Background" : "Upload Background"}
                  </div>
                </label>
                
                {bgImage && (
                  <>
                    <div className="mb-3 rounded-lg overflow-hidden border border-slate-200 h-24 flex items-center justify-center bg-slate-50 relative">
                      <img src={bgImage} className="max-h-20 max-w-full object-contain" alt="canvas bg" />
                      <button className="absolute top-1 right-1 bg-inherit hover:bg-red-50 text-slate-500 hover:text-red-500 rounded p-1"
                        onClick={() => setBgImage("")}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">
                        Opacity — {Math.round(bgOpacity * 100)}%
                      </Label>
                      <Slider min={0.05} max={1} step={0.05} value={[bgOpacity]}
                        onValueChange={([v]) => setBgOpacity(v)} className="mt-1" />
                    </div>
                  </>
                )}
              </Section>
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between py-1">
                <p className="text-xs font-bold text-slate-700 capitalize">{selectedEl.type.replace(/([A-Z])/g, " $1")}</p>
                <div className="flex items-center gap-1">
                  <button title={selectedEl.locked ? "Unlock" : "Lock"}
                    className={`p-1.5 rounded-lg text-xs ${selectedEl.locked ? "bg-amber-100 text-amber-600" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"}`}
                    onClick={() => updateEl(selectedEl.elId, { locked: !selectedEl.locked })}>
                    {selectedEl.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  </button>
                  <button title="Duplicate" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    onClick={() => duplicateEl(selectedEl.elId)}><Copy className="h-3.5 w-3.5" /></button>
                  <button title="Delete" className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
                    onClick={() => { setElements(prev => prev.filter(e => e.elId !== selectedEl.elId)); setSelectedId(null); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Position & Size */}
              <Section label="Position & Size">
                <div className="grid grid-cols-2 gap-2">
                  <NumInput label="X" value={Math.round(selectedEl.x)} onChange={v => updateEl(selectedEl.elId, { x: v })} min={0} />
                  <NumInput label="Y" value={Math.round(selectedEl.y)} onChange={v => updateEl(selectedEl.elId, { y: v })} min={0} />
                  <NumInput label="Width" value={Math.round(selectedEl.width)} onChange={v => updateEl(selectedEl.elId, { width: Math.max(8, v) })} min={8} />
                  <NumInput label="Height" value={Math.round(selectedEl.height)} onChange={v => updateEl(selectedEl.elId, { height: Math.max(2, v) })} min={2} />
                </div>
                <div className="mt-2 flex gap-1.5">
                  <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs text-slate-600 font-medium"
                    onClick={() => setElements(prev => prev.map(e => e.elId === selectedEl.elId ? { ...e, zIndex: Math.max(0, e.zIndex - 1) } : e))}>
                    <ArrowDown className="h-3 w-3" /> Back
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs text-slate-600 font-medium"
                    onClick={() => setElements(prev => prev.map(e => e.elId === selectedEl.elId ? { ...e, zIndex: e.zIndex + 1 } : e))}>
                    <ArrowUp className="h-3 w-3" /> Front
                  </button>
                </div>
              </Section>

              {/* Align to Canvas */}
              <Section label="Align to Canvas">
                <div className="grid grid-cols-3 gap-1">
                  {([
                    { axis: "left",    icon: AlignStartVertical,          title: "Align Left" },
                    { axis: "hcenter", icon: AlignHorizontalJustifyCenter, title: "Center Horizontally" },
                    { axis: "right",   icon: AlignEndVertical,            title: "Align Right" },
                    { axis: "top",     icon: AlignStartHorizontal,        title: "Align Top" },
                    { axis: "vcenter", icon: AlignVerticalJustifyCenter,  title: "Center Vertically" },
                    { axis: "bottom",  icon: AlignEndHorizontal,          title: "Align Bottom" },
                  ] as const).map(({ axis, icon: Icon, title }) => (
                    <button
                      key={axis}
                      title={title}
                      className="h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-green-50 hover:text-green-700 text-slate-600 transition-colors"
                      onClick={() => alignEl(axis)}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </Section>

              {/* Section Label — editable heading for salary section blocks */}
              {isSectionType && (
                <Section label="Section Label">
                  <Input
                    className="h-7 text-xs rounded-lg border-slate-200 bg-white text-slate-800"
                    value={selectedEl.content || ""}
                    placeholder={SECTION_DEFAULTS[selectedEl.type] || "Section title…"}
                    onChange={e => updateEl(selectedEl.elId, { content: e.target.value })}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Leave empty to use default</p>
                </Section>
              )}

              {/* Section Content — editable internal text for each section type */}
              {selectedEl.type === "companyHeader" && (
                <Section label="Company Info">
                  {/* Logo upload */}
                  <label className="block cursor-pointer mb-2">
                    <input
                      type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(selectedEl.elId, file);
                        e.target.value = "";
                      }}
                    />
                    <div className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border-2 border-dashed border-slate-300 hover:border-green-400 hover:bg-green-50 text-slate-500 hover:text-green-700 transition-colors text-xs font-medium">
                      <Upload className="h-3.5 w-3.5" />
                      {selectedEl.src ? "Change Logo" : "Upload Logo"}
                    </div>
                  </label>
                  {selectedEl.src && (
                    <div className="flex items-center justify-between mb-2 p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                      <img src={selectedEl.src} className="h-8 max-w-[80px] object-contain" alt="logo" />
                      <button className="text-slate-400 hover:text-red-400 text-xs" onClick={() => updateEl(selectedEl.elId, { src: undefined })}>✕ Remove</button>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <EdField label="Company Name" value={getED(selectedEl, "companyName", "")} onChange={v => updateED(selectedEl.elId, "companyName", v)} placeholder="Company Name" />
                    <EdField label="Address / Tagline" value={getED(selectedEl, "companyAddress", "")} onChange={v => updateED(selectedEl.elId, "companyAddress", v)} placeholder="Street, City · email" />
                  </div>
                </Section>
              )}

              {selectedEl.type === "infoGrid" && (
                <Section label="Field Labels">
                  <div className="grid grid-cols-2 gap-1.5">
                    {[["f1","Employee Name"],["f2","Employee ID"],["f3","Designation"],["f4","Department"],["f5","Date of Joining"],["f6","Pay Period"],["f7","PAN Number"],["f8","Pay Date"]].map(([k, def]) => (
                      <EdField key={k} label={def} value={getED(selectedEl, k, "")} onChange={v => updateED(selectedEl.elId, k, v)} placeholder={def} />
                    ))}
                  </div>
                </Section>
              )}

              {(selectedEl.type === "earningsTable" || selectedEl.type === "deductionsTable") && (
                <>
                  <Section label="Column Labels">
                    <div className="space-y-1.5">
                      <EdField label="Column 1 (Component)" value={getED(selectedEl, "col1", "")} onChange={v => updateED(selectedEl.elId, "col1", v)} placeholder="Component" />
                      <EdField label="Column 2 (Amount)" value={getED(selectedEl, "col2", "")} onChange={v => updateED(selectedEl.elId, "col2", v)} placeholder="Amount" />
                      <EdField
                        label="Total Row Label"
                        value={getED(selectedEl, "total", "")}
                        onChange={v => updateED(selectedEl.elId, "total", v)}
                        placeholder={selectedEl.type === "earningsTable" ? "Total Earnings" : "Total Deductions"}
                      />
                    </div>
                  </Section>
                  <RowsEditor
                    el={selectedEl}
                    onRowsChange={rows => updateED(selectedEl.elId, "rows", JSON.stringify(rows))}
                  />
                </>
              )}

              {selectedEl.type === "netPayBar" && (
                <Section label="Subtitle Text">
                  <EdField label="Subtitle" value={getED(selectedEl, "subtitle", "")} onChange={v => updateED(selectedEl.elId, "subtitle", v)} placeholder="Gross {{grossSalary}} − Deductions {{totalDeductions}}" />
                  <p className="text-[10px] text-slate-400 mt-1">Use {`{{grossSalary}}`} and {`{{totalDeductions}}`} for values</p>
                </Section>
              )}

              {selectedEl.type === "attendanceGrid" && (
                <Section label="Stat Labels">
                  <div className="grid grid-cols-2 gap-1.5">
                    {[["s1","Total Days"],["s2","Present"],["s3","Absent"],["s4","Paid Leave"],["s5","LOP"],["s6","OT Hours"]].map(([k, def]) => (
                      <EdField key={k} label={def} value={getED(selectedEl, k, "")} onChange={v => updateED(selectedEl.elId, k, v)} placeholder={def} />
                    ))}
                  </div>
                </Section>
              )}

              {selectedEl.type === "leaveTable" && (
                <Section label="Column Headers">
                  <div className="grid grid-cols-2 gap-1.5">
                    <EdField label="Column 1" value={getED(selectedEl, "col1", "")} onChange={v => updateED(selectedEl.elId, "col1", v)} placeholder="Leave Type" />
                    <EdField label="Column 2" value={getED(selectedEl, "col2", "")} onChange={v => updateED(selectedEl.elId, "col2", v)} placeholder="Entitled" />
                    <EdField label="Column 3" value={getED(selectedEl, "col3", "")} onChange={v => updateED(selectedEl.elId, "col3", v)} placeholder="Taken" />
                    <EdField label="Column 4" value={getED(selectedEl, "col4", "")} onChange={v => updateED(selectedEl.elId, "col4", v)} placeholder="Balance" />
                  </div>
                </Section>
              )}

              {selectedEl.type === "bankGrid" && (
                <Section label="Field Labels">
                  <div className="grid grid-cols-2 gap-1.5">
                    <EdField label="Field 1" value={getED(selectedEl, "f1", "")} onChange={v => updateED(selectedEl.elId, "f1", v)} placeholder="Bank Name" />
                    <EdField label="Field 2" value={getED(selectedEl, "f2", "")} onChange={v => updateED(selectedEl.elId, "f2", v)} placeholder="Account Number" />
                    <EdField label="Field 3" value={getED(selectedEl, "f3", "")} onChange={v => updateED(selectedEl.elId, "f3", v)} placeholder="IFSC Code" />
                    <EdField label="Field 4" value={getED(selectedEl, "f4", "")} onChange={v => updateED(selectedEl.elId, "f4", v)} placeholder="Payment Mode" />
                  </div>
                </Section>
              )}

              {/* Typography — all types except divider, image, rect, circle, star, qrPlaceholder */}
              {!["divider","image","rect","circle","star","qrPlaceholder"].includes(selectedEl.type) && (
                <Section label="Typography">
                  {/* Font family */}
                  <div className="mb-2">
                    <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Font Family</Label>
                    <Select value={selectedEl.style.fontFamily || "_default"} onValueChange={v => updateStyle(selectedEl.elId, { fontFamily: v === "_default" ? undefined : v })}>
                      <SelectTrigger className="h-7 text-xs rounded-lg border-slate-200 bg-white text-slate-800"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl z-[200]">
                        <SelectItem value="_default" className="text-xs">Default (System Sans)</SelectItem>
                        <SelectItem value="Arial, sans-serif" className="text-xs">Arial</SelectItem>
                        <SelectItem value="'Times New Roman', serif" className="text-xs font-serif">Times New Roman</SelectItem>
                        <SelectItem value="Georgia, serif" className="text-xs font-serif">Georgia</SelectItem>
                        <SelectItem value="'Courier New', monospace" className="text-xs font-mono">Courier New</SelectItem>
                        <SelectItem value="Verdana, sans-serif" className="text-xs">Verdana</SelectItem>
                        <SelectItem value="Trebuchet MS, sans-serif" className="text-xs">Trebuchet MS</SelectItem>
                        <SelectItem value="Tahoma, sans-serif" className="text-xs">Tahoma</SelectItem>
                        <SelectItem value="serif" className="text-xs font-serif">Serif</SelectItem>
                        <SelectItem value="monospace" className="text-xs font-mono">Monospace</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Size + Weight + Italic row */}
                  <NumInput label="Font Size (px)" value={selectedEl.style.fontSize} onChange={v => updateStyle(selectedEl.elId, { fontSize: v })} min={6} max={240} />
                  <div className="mt-2 flex gap-1">
                    <button
                      title="Bold"
                      className={`flex-1 h-7 rounded-lg text-xs flex items-center justify-center font-bold transition-colors ${(selectedEl.style.fontWeight === "bold" || selectedEl.style.fontWeight === "700") ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                      onClick={() => updateStyle(selectedEl.elId, { fontWeight: (selectedEl.style.fontWeight === "bold" || selectedEl.style.fontWeight === "700") ? "normal" : "bold" })}>
                      <Bold className="h-3 w-3" />
                    </button>
                    <button
                      title="Italic"
                      className={`flex-1 h-7 rounded-lg text-xs flex items-center justify-center italic transition-colors ${selectedEl.style.fontStyle === "italic" ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                      onClick={() => updateStyle(selectedEl.elId, { fontStyle: selectedEl.style.fontStyle === "italic" ? "normal" : "italic" })}>
                      <Italic className="h-3 w-3" />
                    </button>
                    <button
                      title="Underline"
                      className={`flex-1 h-7 rounded-lg text-xs flex items-center justify-center underline transition-colors ${selectedEl.style.textDecoration === "underline" ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                      onClick={() => updateStyle(selectedEl.elId, { textDecoration: selectedEl.style.textDecoration === "underline" ? "none" : "underline" })}>
                      <Underline className="h-3 w-3" />
                    </button>
                    <button
                      title="Strikethrough"
                      className={`flex-1 h-7 rounded-lg text-xs flex items-center justify-center line-through transition-colors ${selectedEl.style.textDecoration === "line-through" ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                      onClick={() => updateStyle(selectedEl.elId, { textDecoration: selectedEl.style.textDecoration === "line-through" ? "none" : "line-through" })}>
                      <Strikethrough className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Text align */}
                  <div className="mt-1.5 flex gap-1">
                    {(["left","center","right"] as const).map(a => {
                      const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
                      return (
                        <button key={a}
                          className={`flex-1 h-7 rounded-lg flex items-center justify-center transition-colors ${selectedEl.style.textAlign === a ? "bg-green-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                          onClick={() => updateStyle(selectedEl.elId, { textAlign: a })}>
                          <Icon className="h-3.5 w-3.5" />
                        </button>
                      );
                    })}
                  </div>

                  {/* Text transform */}
                  <div className="mt-1.5">
                    <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Transform</Label>
                    <div className="flex gap-1">
                      {([
                        { v: "none",       label: "aA" },
                        { v: "uppercase",  label: "AA" },
                        { v: "lowercase",  label: "aa" },
                        { v: "capitalize", label: "Aa" },
                      ] as const).map(({ v, label }) => (
                        <button key={v}
                          className={`flex-1 h-7 rounded-lg text-[10px] font-bold transition-colors ${(selectedEl.style.textTransform || "none") === v ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                          onClick={() => updateStyle(selectedEl.elId, { textTransform: v })}
                        >{label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Text color */}
                  <div className="mt-2">
                    <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Text Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={selectedEl.style.color || "#000000"} onChange={e => updateStyle(selectedEl.elId, { color: e.target.value })}
                        className="h-7 w-7 rounded-md cursor-pointer border border-slate-300 p-0.5 bg-white flex-shrink-0" />
                      <Input className="h-7 text-xs rounded-lg border-slate-200 bg-white text-slate-800 font-mono flex-1" value={selectedEl.style.color || "#000000"}
                        onChange={e => updateStyle(selectedEl.elId, { color: e.target.value })} />
                    </div>
                  </div>

                  {/* Letter spacing + Line height */}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Letter Spacing</Label>
                      <Input type="number" step="0.5" min={-2} max={20} value={selectedEl.style.letterSpacing ?? 0}
                        className="h-7 text-xs rounded-lg border-slate-200 bg-white text-slate-800 font-mono"
                        onChange={e => updateStyle(selectedEl.elId, { letterSpacing: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Line Height</Label>
                      <Input type="number" step="0.1" min={0.8} max={4} value={selectedEl.style.lineHeight ?? 1.4}
                        className="h-7 text-xs rounded-lg border-slate-200 bg-white text-slate-800 font-mono"
                        onChange={e => updateStyle(selectedEl.elId, { lineHeight: Number(e.target.value) })} />
                    </div>
                  </div>
                </Section>
              )}

              {/* Circle — fill color */}
              {selectedEl.type === "circle" && (
                <Section label="Circle Fill">
                  <div className="flex items-center gap-2">
                    <input type="color"
                      value={selectedEl.style.backgroundColor || "#6366f1"}
                      onChange={e => updateStyle(selectedEl.elId, { backgroundColor: e.target.value })}
                      className="h-7 w-7 rounded-md cursor-pointer border border-slate-300 p-0.5 bg-white flex-shrink-0"
                    />
                    <Input
                      className="h-7 text-xs rounded-lg border-slate-200 bg-white text-slate-800 font-mono flex-1"
                      value={selectedEl.style.backgroundColor || "#6366f1"}
                      onChange={e => updateStyle(selectedEl.elId, { backgroundColor: e.target.value })}
                    />
                  </div>
                  <div className="mt-2">
                    <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">
                      Opacity — {Math.round((selectedEl.style.opacity ?? 1) * 100)}%
                    </Label>
                    <Slider min={0} max={1} step={0.01} value={[selectedEl.style.opacity ?? 1]}
                      onValueChange={([v]) => updateStyle(selectedEl.elId, { opacity: v })} className="mt-1" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">Tip: hold Shift while resizing to keep a square</p>
                </Section>
              )}

              {/* Star — color */}
              {selectedEl.type === "star" && (
                <Section label="Star Color">
                  <div className="flex items-center gap-2 mb-2">
                    <input type="color"
                      value={selectedEl.style.color || "#f59e0b"}
                      onChange={e => updateStyle(selectedEl.elId, { color: e.target.value })}
                      className="h-7 w-7 rounded-md cursor-pointer border border-slate-300 p-0.5 bg-white flex-shrink-0"
                    />
                    <Input
                      className="h-7 text-xs rounded-lg border-slate-200 bg-white text-slate-800 font-mono flex-1"
                      value={selectedEl.style.color || "#f59e0b"}
                      onChange={e => updateStyle(selectedEl.elId, { color: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {["#f59e0b","#ef4444","#3b82f6","#10b981","#8b5cf6","#f43f5e","#06b6d4","#1e293b"].map(c => (
                      <button key={c} title={c}
                        className="h-6 w-6 rounded-full border-2 border-white shadow ring-1 ring-black/10 hover:scale-110 transition-transform"
                        style={{ background: c, outline: selectedEl.style.color === c ? `2px solid ${c}` : "none", outlineOffset: 2 }}
                        onClick={() => updateStyle(selectedEl.elId, { color: c })}
                      />
                    ))}
                  </div>
                  <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mt-2 mb-1">
                    Opacity — {Math.round((selectedEl.style.opacity ?? 1) * 100)}%
                  </Label>
                  <Slider min={0} max={1} step={0.01} value={[selectedEl.style.opacity ?? 1]}
                    onValueChange={([v]) => updateStyle(selectedEl.elId, { opacity: v })} className="mt-1" />
                </Section>
              )}

              {/* Signature Line */}
              {selectedEl.type === "signatureLine" && (
                <Section label="Signature Line">
                  <EdField label="Label Text" value={getED(selectedEl, "label", "")} onChange={v => updateED(selectedEl.elId, "label", v)} placeholder="Authorized Signature" />
                  <div className="mt-2">
                    <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Line Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color"
                        value={selectedEl.style.borderColor || "#94a3b8"}
                        onChange={e => updateStyle(selectedEl.elId, { borderColor: e.target.value })}
                        className="h-7 w-7 rounded-md cursor-pointer border border-slate-300 p-0.5 bg-white flex-shrink-0"
                      />
                      <Input
                        className="h-7 text-xs rounded-lg border-slate-200 bg-white text-slate-800 font-mono flex-1"
                        value={selectedEl.style.borderColor || "#94a3b8"}
                        onChange={e => updateStyle(selectedEl.elId, { borderColor: e.target.value })}
                      />
                    </div>
                  </div>
                </Section>
              )}

              {/* Watermark */}
              {selectedEl.type === "watermark" && (
                <Section label="Watermark Text">
                  <Input
                    className="h-7 text-xs rounded-lg border-slate-200 bg-white text-slate-800"
                    value={selectedEl.content || ""}
                    placeholder="CONFIDENTIAL"
                    onChange={e => { pushUndo(); setElements(prev => prev.map(el => el.elId === selectedEl.elId ? { ...el, content: e.target.value } : el)); }}
                  />
                  <div className="mt-2">
                    <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={selectedEl.style.color || "#e2e8f0"}
                        onChange={e => updateStyle(selectedEl.elId, { color: e.target.value })}
                        className="h-7 w-7 rounded-md cursor-pointer border border-slate-300 p-0.5 bg-white flex-shrink-0" />
                      <Input className="h-7 text-xs rounded-lg border-slate-200 bg-white text-slate-800 font-mono flex-1"
                        value={selectedEl.style.color || "#e2e8f0"}
                        onChange={e => updateStyle(selectedEl.elId, { color: e.target.value })} />
                    </div>
                  </div>
                  <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mt-2 mb-1">
                    Opacity — {Math.round((selectedEl.style.opacity ?? 0.18) * 100)}%
                  </Label>
                  <Slider min={0.02} max={1} step={0.02} value={[selectedEl.style.opacity ?? 0.18]}
                    onValueChange={([v]) => updateStyle(selectedEl.elId, { opacity: v })} />
                </Section>
              )}

              {/* QR Placeholder */}
              {selectedEl.type === "qrPlaceholder" && (
                <Section label="QR Code Label">
                  <EdField label="Label" value={getED(selectedEl, "label", "")} onChange={v => updateED(selectedEl.elId, "label", v)} placeholder="QR Code" />
                  <div className="mt-2">
                    <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={selectedEl.style.borderColor || "#94a3b8"}
                        onChange={e => updateStyle(selectedEl.elId, { borderColor: e.target.value })}
                        className="h-7 w-7 rounded-md cursor-pointer border border-slate-300 p-0.5 bg-white flex-shrink-0" />
                      <Input className="h-7 text-xs rounded-lg border-slate-200 bg-white text-slate-800 font-mono flex-1"
                        value={selectedEl.style.borderColor || "#94a3b8"}
                        onChange={e => updateStyle(selectedEl.elId, { borderColor: e.target.value })} />
                    </div>
                  </div>
                </Section>
              )}

              {/* Divider — color + rotate */}
              {selectedEl.type === "divider" && (
                <Section label="Divider">
                  <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Color</Label>
                  <div className="flex items-center gap-2 mb-2">
                    <input type="color"
                      value={selectedEl.style.backgroundColor || "#e2e8f0"}
                      onChange={e => updateStyle(selectedEl.elId, { backgroundColor: e.target.value })}
                      className="h-7 w-7 rounded-md cursor-pointer border border-slate-300 p-0.5 bg-white flex-shrink-0"
                    />
                    <Input
                      className="h-7 text-xs rounded-lg border-slate-200 bg-white text-slate-800 font-mono flex-1"
                      value={selectedEl.style.backgroundColor || "#e2e8f0"}
                      onChange={e => updateStyle(selectedEl.elId, { backgroundColor: e.target.value })}
                    />
                  </div>
                  <button
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-100 hover:bg-green-50 hover:text-green-700 text-slate-600 text-xs font-medium transition-colors"
                    onClick={() => updateEl(selectedEl.elId, { width: selectedEl.height, height: selectedEl.width })}
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    Rotate 90° {selectedEl.width < selectedEl.height ? "(→ Horizontal)" : "(→ Vertical)"}
                  </button>
                </Section>
              )}

              {/* Background */}
              {selectedEl.type !== "divider" && selectedEl.type !== "circle" && (
                <Section label="Background">
                  <div className="flex items-center gap-2">
                    <input type="color" value={selectedEl.style.backgroundColor || "#ffffff"} onChange={e => updateStyle(selectedEl.elId, { backgroundColor: e.target.value })}
                      className="h-7 w-7 rounded-md cursor-pointer border border-slate-300 p-0.5 bg-white flex-shrink-0" />
                    <Input className="h-7 text-xs rounded-lg border-slate-200 bg-white text-slate-800 font-mono flex-1" value={selectedEl.style.backgroundColor || ""}
                      placeholder="transparent" onChange={e => updateStyle(selectedEl.elId, { backgroundColor: e.target.value || undefined })} />
                    <button className="text-slate-400 hover:text-red-400 text-xs w-5 h-7 flex items-center justify-center flex-shrink-0"
                      title="Clear" onClick={() => updateStyle(selectedEl.elId, { backgroundColor: undefined })}>✕</button>
                  </div>
                  <div className="mt-2">
                    <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">
                      Opacity — {Math.round((selectedEl.style.opacity ?? 1) * 100)}%
                    </Label>
                    <Slider min={0} max={1} step={0.01} value={[selectedEl.style.opacity ?? 1]}
                      onValueChange={([v]) => updateStyle(selectedEl.elId, { opacity: v })} className="mt-1" />
                  </div>
                </Section>
              )}

              {/* Border */}
              <Section label="Border">
                <div className="grid grid-cols-2 gap-2">
                  <NumInput label="Width (px)" value={selectedEl.style.borderWidth} onChange={v => updateStyle(selectedEl.elId, { borderWidth: v })} min={0} max={20} />
                  <NumInput label="Radius (px)" value={selectedEl.style.borderRadius} onChange={v => updateStyle(selectedEl.elId, { borderRadius: v })} min={0} max={9999} />
                </div>
                {selectedEl.type !== "circle" && (
                  <div className="mt-2">
                    <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1.5">Radius Presets</Label>
                    <div className="flex flex-wrap gap-1">
                      {([
                        { label: "None", value: 0, preview: "□" },
                        { label: "4px", value: 4, preview: "⬜" },
                        { label: "8px", value: 8, preview: "▢" },
                        { label: "16px", value: 16, preview: "◱" },
                        { label: "Pill", value: 999, preview: "⬭" },
                        { label: "Full", value: 9999, preview: "○" },
                      ] as const).map(({ label, value }) => {
                        const active = (selectedEl.style.borderRadius ?? 0) === value;
                        return (
                          <button
                            key={value}
                            title={`Border radius: ${label}`}
                            className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                              active
                                ? "bg-green-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-green-50 hover:text-green-700"
                            }`}
                            style={{ borderRadius: Math.min(value, 8) || 4 }}
                            onClick={() => updateStyle(selectedEl.elId, { borderRadius: value })}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="mt-2">
                  <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Border Color</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={selectedEl.style.borderColor || "#e2e8f0"} onChange={e => updateStyle(selectedEl.elId, { borderColor: e.target.value })}
                      className="h-7 w-7 rounded-md cursor-pointer border border-slate-300 p-0.5 bg-white flex-shrink-0" />
                    <Input className="h-7 text-xs rounded-lg border-slate-200 bg-white text-slate-800 font-mono flex-1" value={selectedEl.style.borderColor || ""}
                      placeholder="#e2e8f0" onChange={e => updateStyle(selectedEl.elId, { borderColor: e.target.value })} />
                  </div>
                </div>
                <div className="mt-2">
                  <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Border Style</Label>
                  <Select value={selectedEl.style.borderStyle || "solid"} onValueChange={v => updateStyle(selectedEl.elId, { borderStyle: v })}>
                    <SelectTrigger className="h-7 text-xs rounded-lg border-slate-200 bg-white text-slate-800"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl z-[200]">
                      {["solid","dashed","dotted","double"].map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </Section>

              {/* Box Shadow */}
              {selectedEl.type !== "divider" && selectedEl.type !== "star" && (
                <Section label="Box Shadow">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {([
                      { label: "None",   value: "none" },
                      { label: "Soft",   value: "0 2px 8px rgba(0,0,0,0.10)" },
                      { label: "Medium", value: "0 4px 16px rgba(0,0,0,0.15)" },
                      { label: "Strong", value: "0 8px 32px rgba(0,0,0,0.22)" },
                      { label: "Inner",  value: "inset 0 2px 6px rgba(0,0,0,0.12)" },
                    ] as const).map(({ label, value }) => {
                      const active = (selectedEl.style.boxShadow || "none") === value;
                      return (
                        <button key={label}
                          className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${active ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-green-50 hover:text-green-700"}`}
                          onClick={() => updateStyle(selectedEl.elId, { boxShadow: value === "none" ? undefined : value })}
                        >{label}</button>
                      );
                    })}
                  </div>
                  <Input
                    className="h-7 text-xs rounded-lg border-slate-200 bg-white text-slate-800 font-mono"
                    value={selectedEl.style.boxShadow || ""}
                    placeholder="0 4px 12px rgba(0,0,0,0.1)"
                    onChange={e => updateStyle(selectedEl.elId, { boxShadow: e.target.value || undefined })}
                  />
                </Section>
              )}

              {/* Padding */}
              <Section label="Padding">
                <div className="grid grid-cols-2 gap-2">
                  <NumInput label="Top" value={selectedEl.style.paddingTop} onChange={v => updateStyle(selectedEl.elId, { paddingTop: v })} min={0} />
                  <NumInput label="Right" value={selectedEl.style.paddingRight} onChange={v => updateStyle(selectedEl.elId, { paddingRight: v })} min={0} />
                  <NumInput label="Bottom" value={selectedEl.style.paddingBottom} onChange={v => updateStyle(selectedEl.elId, { paddingBottom: v })} min={0} />
                  <NumInput label="Left" value={selectedEl.style.paddingLeft} onChange={v => updateStyle(selectedEl.elId, { paddingLeft: v })} min={0} />
                </div>
              </Section>

              {/* Text Content */}
              {isTextType && (
                <Section label="Content">
                  <Textarea
                    className="text-xs rounded-lg border-slate-200 bg-white text-slate-800 resize-none min-h-[64px]"
                    value={selectedEl.content || ""}
                    onChange={e => updateEl(selectedEl.elId, { content: e.target.value })}
                    placeholder={selectedEl.type === "badge" ? "Badge label…" : "Enter text…"}
                  />
                  {selectedEl.type !== "badge" && (
                    <div className="mt-2">
                      <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Available Variables</Label>
                      <div className="flex flex-wrap gap-1 max-h-48 overflow-y-auto p-1.5 border border-slate-200 rounded-lg bg-slate-50">
                        {DATA_KEYS.map(([k, l]) => (
                          <button
                            key={k}
                            title={l}
                            className="text-[10px] bg-white border border-slate-200 text-slate-600 hover:border-green-400 hover:text-green-700 rounded px-1.5 py-0.5 cursor-pointer transition-colors"
                            onClick={() => {
                              const val = selectedEl.content || "";
                              updateEl(selectedEl.elId, { content: val + (val && !val.endsWith(" ") ? " " : "") + `{ ${k} }` });
                            }}
                          >
                            {`{ ${k} }`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </Section>
              )}

              {/* Dynamic field data key */}
              {selectedEl.type === "dynamicField" && (
                <Section label="Data Binding">
                  <Select value={selectedEl.dataKey || ""} onValueChange={v => updateEl(selectedEl.elId, { dataKey: v, content: `{ ${v} }` })}>
                    <SelectTrigger className="h-8 text-xs rounded-lg border-slate-200 bg-white text-slate-800"><SelectValue placeholder="Select field…" /></SelectTrigger>
                    <SelectContent className="rounded-xl z-[200] max-h-64 overflow-y-auto">
                      {DATA_KEYS.map(([k, l]) => <SelectItem key={k} value={k} className="text-xs">{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Section>
              )}

              {/* Image — upload or URL */}
              {selectedEl.type === "image" && (
                <Section label="Image">
                  <label className="block cursor-pointer mb-2">
                    <input
                      type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(selectedEl.elId, file);
                        e.target.value = "";
                      }}
                    />
                    <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border-2 border-dashed border-slate-300 hover:border-green-400 hover:bg-green-50 text-slate-500 hover:text-green-700 transition-colors text-xs font-medium">
                      <Upload className="h-3.5 w-3.5" />
                      Upload Image
                    </div>
                  </label>
                  <Label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block mb-1">Or paste URL</Label>
                  <Input
                    className="h-7 text-xs rounded-lg border-slate-200 bg-white text-slate-800"
                    value={selectedEl.src || ""}
                    placeholder="https://…"
                    onChange={e => updateEl(selectedEl.elId, { src: e.target.value })}
                  />
                  {selectedEl.src && (
                    <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 h-16 flex items-center justify-center bg-slate-50">
                      <img src={selectedEl.src} className="max-h-14 max-w-full object-contain" alt="preview" onError={() => {}} />
                    </div>
                  )}
                </Section>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Status bar ── */}
      <div className="flex-shrink-0 h-6 flex items-center justify-between px-4 bg-white border-t border-slate-200">
        <p className="text-[10px] text-slate-400">
          {elements.length} element{elements.length !== 1 ? "s" : ""} · {paperSize} {canvasW}×{canvasH}px · {Math.round(scale * 100)}%
          {showGrid && " · Grid"}{snapGrid && " · Snap"}
          {selectedEl ? ` · ${selectedEl.type} (${Math.round(selectedEl.x)}, ${Math.round(selectedEl.y)})` : " · Click to select"}
        </p>
        <p className="text-[10px] text-slate-300">Ctrl+Z undo · Ctrl+Y redo · Del to delete · ↑↓←→ nudge</p>
      </div>
    </div>
  );
}
