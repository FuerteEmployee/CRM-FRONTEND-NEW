import type { CSSProperties } from "react";
import { EKAGRA_COMPANY_INFO, getPlaceOfSupply, amountToWords, getDefaultTermsText } from "@/lib/ekagraTaxInvoice";

// Single source of truth for each non-default invoice PDF format's visual
// layout. Both the "View" preview (DocumentPreviewDialog.tsx, rendered live
// as JSX) and the Print/Download actions (Invoices.tsx, rendered to a static
// HTML string via ReactDOMServer.renderToStaticMarkup) use these exact same
// components, so the two can never drift apart.

// Ekagra Engineering's Tax Invoice layout — mirrors their existing
// Tally-printed invoice format exactly (GSTIN/PAN header, M/s buyer box,
// HSN-coded item table, CGST/SGST or IGST split, amount in words).
export function EkagraTaxInvoiceLayout({ data, date, bankDetail, compCity }: { data: any; date: string; bankDetail?: any; compCity?: string }) {
  const client = data.client || {};
  const items = data.items || [];
  const subtotal = Number(data.subtotal || 0);
  const cgst = Number(data.total_cgst || 0);
  const sgst = Number(data.total_sgst || 0);
  const igst = Number(data.total_igst || 0);
  const cgstPct = subtotal > 0 ? (cgst / subtotal) * 100 : 0;
  const sgstPct = subtotal > 0 ? (sgst / subtotal) * 100 : 0;
  const igstPct = subtotal > 0 ? (igst / subtotal) * 100 : 0;
  const money = (n: number) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const na = (v: any) => (v === undefined || v === null || v === "" ? "-" : v);
  const buyerAddressLine = data.partyAddress || [client.address, client.city].filter(Boolean).join(", ");
  const buyerLocationLine = [client.state, client.zip].filter(Boolean).join(" ");

  const cell: CSSProperties = { border: "1px solid #000", padding: "6px 10px" };
  const row: CSSProperties = { display: "flex" };

  return (
    <div style={{ border: "1.5px solid #000", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", color: "#111" }}>
      <div style={{ ...cell, textAlign: "center", borderTop: "none" }}>
        <div style={{ fontWeight: "bold", fontSize: "20px", letterSpacing: "0.5px" }}>{EKAGRA_COMPANY_INFO.name}</div>
        {EKAGRA_COMPANY_INFO.addressLines.map((l) => (
          <div key={l} style={{ fontSize: "11.5px" }}>{l}</div>
        ))}
      </div>
      <div style={row}>
        <div style={{ ...cell, flex: 1 }}>GSTIN No. : {EKAGRA_COMPANY_INFO.gstin}</div>
        <div style={{ ...cell, flex: 1, borderLeft: "none" }}>State : {EKAGRA_COMPANY_INFO.state} &nbsp; State Code : {EKAGRA_COMPANY_INFO.stateCode}</div>
        <div style={{ ...cell, flex: 1, borderLeft: "none" }}>PAN No. : {EKAGRA_COMPANY_INFO.pan}</div>
      </div>

      <div style={row}>
        <div style={{ ...cell, flex: 1, fontWeight: "bold" }}>{data.voucherType || "Debit Memo"}</div>
        <div style={{ ...cell, flex: 2, borderLeft: "none", fontWeight: "bold", textAlign: "center", fontSize: "16px" }}>Tax Invoice</div>
        <div style={{ ...cell, flex: 1, borderLeft: "none", textAlign: "right" }}>ORIGINAL</div>
      </div>

      <div style={row}>
        <div style={{ ...cell, flex: 2 }}>
          <div style={{ fontWeight: "bold" }}>M/s.&nbsp;&nbsp;{na(client.company)}</div>
          <div>{na(buyerAddressLine)}</div>
          <div>{na(buyerLocationLine)}</div>
          <div>{na(client.country)}</div>
          <div style={{ marginTop: "6px" }}>GSTIN No. : {na(data.gstin || client.gst_number)}</div>
          <div>Place of Supply : {getPlaceOfSupply(client.state)}</div>
          <div>PAN No. : {na(client.pan_number)}</div>
        </div>
        <div style={{ ...cell, flex: 1, borderLeft: "none" }}>
          <div><b>Invoice No.</b> &nbsp;: {na(data.number)}</div>
          <div><b>Invoice Date</b> : {na(date)}</div>
          <div><b>Party Group</b> &nbsp;: {na(data.partyGroup)}</div>
          <div><b>Terms of Payment</b> : {na(data.termsOfPayment)}</div>
          <div><b>Sales Person</b> : {na(data.salesPerson)}</div>
          <div><b>Branch</b> &nbsp;&nbsp;&nbsp;&nbsp;: {na(typeof data.branch === "object" ? data.branch?.name : data.branch)}</div>
        </div>
      </div>

      <table className="printable-table" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ ...cell, width: "6%" }}>Sr.</th>
            <th style={{ ...cell, wordBreak: "break-word" }}>Particular</th>
            <th style={{ ...cell, width: "12%" }}>HSN Code</th>
            <th style={{ ...cell, width: "10%" }}>Quantity</th>
            <th style={{ ...cell, width: "8%" }}>Unit</th>
            <th style={{ ...cell, width: "12%", textAlign: "right" }}>Rate</th>
            <th style={{ ...cell, width: "14%", textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, i: number) => (
            <tr key={i}>
              <td style={{ ...cell, textAlign: "center" }}>{i + 1}</td>
              <td style={{ ...cell, wordBreak: "break-word" }}>{na(item.description || item.name)}</td>
              <td style={{ ...cell, textAlign: "center" }}>{na(item.itemHSN)}</td>
              <td style={{ ...cell, textAlign: "right" }}>{Number(item.qty || item.quantity || 0).toLocaleString("en-IN")}</td>
              <td style={{ ...cell, textAlign: "center" }}>{na(item.unit)}</td>
              <td style={{ ...cell, textAlign: "right" }}>{money(item.rate || item.price || 0)}</td>
              <td style={{ ...cell, textAlign: "right" }}>{money(item.amount ?? ((item.qty || 0) * (item.rate || 0)))}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 3 - items.length) }).map((_, i) => (
            <tr key={`blank-${i}`}>
              <td style={{ ...cell, textAlign: "center" }}>&nbsp;</td>
              <td style={cell}></td><td style={cell}></td><td style={cell}></td><td style={cell}></td><td style={cell}></td><td style={cell}></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={row}>
        <div style={{ ...cell, flex: 2, borderTop: "none" }}>&nbsp;</div>
        <div style={{ ...cell, flex: 1, borderTop: "none", borderLeft: "none", padding: 0 }}>
          <div style={{ ...row, borderBottom: "1px solid #000" }}>
            <div style={{ flex: 1, padding: "6px 10px" }}>Sub Total</div>
            <div style={{ flex: 1, padding: "6px 10px", textAlign: "right" }}>{money(subtotal)}</div>
          </div>
          {igst > 0 ? (
            <div style={{ ...row, borderBottom: "1px solid #000" }}>
              <div style={{ flex: 1, padding: "6px 10px" }}>IGST {igstPct.toFixed(2)} %</div>
              <div style={{ flex: 1, padding: "6px 10px", textAlign: "right" }}>{money(igst)}</div>
            </div>
          ) : (
            <>
              <div style={{ ...row, borderBottom: "1px solid #000" }}>
                <div style={{ flex: 1, padding: "6px 10px" }}>CGST {cgstPct.toFixed(2)} %</div>
                <div style={{ flex: 1, padding: "6px 10px", textAlign: "right" }}>{money(cgst)}</div>
              </div>
              <div style={{ ...row, borderBottom: "1px solid #000" }}>
                <div style={{ flex: 1, padding: "6px 10px" }}>SGST {sgstPct.toFixed(2)} %</div>
                <div style={{ flex: 1, padding: "6px 10px", textAlign: "right" }}>{money(sgst)}</div>
              </div>
            </>
          )}
          <div style={{ ...row, fontWeight: "bold" }}>
            <div style={{ flex: 1, padding: "6px 10px" }}>Grand Total</div>
            <div style={{ flex: 1, padding: "6px 10px", textAlign: "right" }}>{money(data.total)}</div>
          </div>
        </div>
      </div>

      <div style={{ ...cell, borderTop: "none" }}>
        <b>Rs. In Words</b> &nbsp;: {amountToWords(Number(data.total || 0))}
      </div>

      <div style={{ ...cell, borderTop: "none" }}>
        <b>Payment / Bank Details</b>
        <div>{bankDetail ? `${na(bankDetail.accountHolderName)} — Bank: ${na(bankDetail.bankName)}` : "-"}</div>
        {bankDetail && (
          <div>A/C No: {na(bankDetail.accountNumber)} &nbsp; IFSC: {na(bankDetail.ifscCode)}{bankDetail.branch?.name ? ` · Branch: ${bankDetail.branch.name}` : ""}</div>
        )}
      </div>

      <div style={row}>
        <div style={{ ...cell, flex: 1, borderTop: "none" }}>
          <div style={{ fontWeight: "bold" }}>Terms &amp; Conditions</div>
          <div>{data.notes || data.adminnote || getDefaultTermsText(compCity)}</div>
        </div>
        <div style={{ ...cell, flex: 1, borderTop: "none", borderLeft: "none", textAlign: "right" }}>
          <div style={{ fontWeight: "bold" }}>For, {EKAGRA_COMPANY_INFO.name}</div>
          <div style={{ marginTop: "36px" }}>Authorised Signatory</div>
        </div>
      </div>
    </div>
  );
}

export interface LetterheadCompany {
  name: string;
  phone?: string;
  email?: string;
  gstin?: string;
  logoUrl?: string;
  logoWidth?: number;
}

// "Letterhead" Invoice / Proforma Invoice format — logo + company block,
// Bill-to block with buyer GSTIN, navy item table with HSN, bank details and
// GST totals. Everything comes from Settings (company), the customer, the
// invoice and its selected bank account; `title` switches INVOICE / PROFORMA.
export function LetterheadInvoiceLayout({ data, title, company, bankDetail }: { data: any; title: string; company: LetterheadCompany; bankDetail?: any }) {
  const client = data.client && typeof data.client === "object" ? data.client : {};
  const items: any[] = data.items || [];
  const subtotal = Number(data.subtotal || 0);
  // total_tax is sent by the invoice form; invoices created elsewhere (import,
  // API) may only carry the CGST/SGST/IGST split the backend calculates.
  const totalTax = Number(data.total_tax || 0) || Number(data.total_cgst || 0) + Number(data.total_sgst || 0) + Number(data.total_igst || 0);
  const withTax = subtotal + totalTax;
  const discount = Number(data.discount_total || 0);
  const adjustment = Number(data.adjustment || 0) - discount;
  const taxPct = subtotal > 0 ? Math.round((totalTax / subtotal) * 10000) / 100 : 0;
  const money = (n: number) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const qty = (n: number) => Number(n || 0).toFixed(2);
  const shortDate = (v: any) => {
    const dt = v ? new Date(v) : null;
    if (!dt || isNaN(dt.getTime())) return "-";
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(dt.getDate())}-${p(dt.getMonth() + 1)}-${String(dt.getFullYear()).slice(-2)}`;
  };
  const billAddress = data.partyAddress || [client.billing_street || client.address, client.billing_city || client.city].filter(Boolean).join(", ");
  const billGstin = data.gstin || data.vat || client.vat || client.gst_number || "";
  const billPhone = client.phonenumber || client.phone || "";
  const branch = bankDetail?.branch && typeof bankDetail.branch === "object" ? bankDetail.branch : null;
  const branchPlace = branch ? [branch.city, branch.state, branch.pincode].filter(Boolean).join(" ").toUpperCase() : "";

  const NAVY = "#0f2a5f";
  const sans = "'Poppins', Arial, Helvetica, sans-serif";
  const serif = "'EB Garamond', Garamond, 'Times New Roman', serif";
  const th: CSSProperties = { background: NAVY, color: "#fff", fontFamily: serif, fontWeight: 700, fontSize: "12.5px", padding: "7px 6px", border: "1px solid #fff", borderBottom: `1px solid ${NAVY}`, textAlign: "center", letterSpacing: "0.2px" };
  const td: CSSProperties = { border: "1px solid #000", padding: "4px 6px", fontFamily: serif, fontSize: "12.5px", height: "24px" };
  const labelTd: CSSProperties = { fontFamily: serif, fontWeight: 700, textAlign: "right", padding: "1px 6px 1px 0", whiteSpace: "nowrap", verticalAlign: "top" };
  const valueTd: CSSProperties = { fontFamily: serif, padding: "1px 0", verticalAlign: "top" };
  const totalLabel: CSSProperties = { border: "1px solid #000", padding: "4px 8px", fontFamily: serif, fontSize: "12.5px", textAlign: "center" };
  const totalValue: CSSProperties = { border: "1px solid #000", padding: "4px 8px", fontFamily: serif, fontSize: "12.5px", textAlign: "right" };
  const bankLine: CSSProperties = { fontFamily: sans, fontSize: "13px", color: "#333", fontWeight: 500, lineHeight: "26px", letterSpacing: "0.2px" };
  const blankRows = Math.max(0, 8 - items.length);

  return (
    <div style={{ border: "2px solid #000", padding: "16px 40px 40px", background: "#fff", color: "#111", fontFamily: serif, position: "relative" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;600;700&family=Poppins:wght@400;500;600;700;800&display=swap" />

      {/* Logo + title */}
      <div style={{ position: "relative", minHeight: company.logoUrl ? "150px" : "auto", marginBottom: "8px" }}>
        {company.logoUrl && (
          <img src={company.logoUrl} alt={company.name} style={{ position: "absolute", left: "-30px", top: "4px", width: `${company.logoWidth || 200}px`, height: "auto" }} />
        )}
        <div style={{ textAlign: "center", fontFamily: sans, fontWeight: 800, fontSize: "40px", lineHeight: 1.1, letterSpacing: "1px", color: "#000" }}>{title}</div>
      </div>

      {/* Company + Bill-to */}
      <table className="printable-table" style={{ width: "100%", borderCollapse: "collapse", marginBottom: "40px" }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: "top", width: "50%", paddingLeft: "20px" }}>
              <div style={{ fontFamily: sans, fontWeight: 600, fontSize: "22px", color: "#111", marginBottom: "6px" }}>{company.name}</div>
              {company.phone && <div style={{ fontSize: "13px", paddingLeft: "12px", marginBottom: "6px" }}>Mo.{company.phone}</div>}
              {company.email && <div style={{ fontSize: "13px", paddingLeft: "12px", marginBottom: "6px" }}>{company.email}</div>}
              {company.gstin && <div style={{ fontFamily: sans, fontWeight: 600, fontSize: "12px", paddingLeft: "12px" }}>GSTIN No. : {company.gstin}</div>}
            </td>
            <td style={{ verticalAlign: "top", width: "50%" }}>
              <table className="printable-table" style={{ borderCollapse: "collapse", fontSize: "13px" }}>
                <tbody>
                  <tr><td style={labelTd}>Invoice :</td><td style={valueTd}>{data.number || "-"}</td></tr>
                  <tr><td style={{ ...labelTd, paddingTop: "8px" }}>Invoice date:</td><td style={{ ...valueTd, paddingTop: "8px" }}>{shortDate(data.date)}</td></tr>
                  <tr><td style={labelTd}>Bill to:</td><td style={{ ...valueTd, fontWeight: 700 }}>{client.company || data.contact_name || "-"}</td></tr>
                  <tr><td style={labelTd}>Address:</td><td style={{ ...valueTd, fontWeight: 700 }}>{billAddress || "-"}</td></tr>
                  <tr><td style={labelTd}>GSTIN No. :</td><td style={{ ...valueTd, fontFamily: sans, fontWeight: 600, fontSize: "12px" }}>{billGstin}</td></tr>
                  <tr><td style={labelTd}>Phone:</td><td style={valueTd}>{billPhone}</td></tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Items */}
      <table className="printable-table" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", border: `2px solid ${NAVY}` }}>
        <thead>
          <tr>
            <th style={{ ...th, width: "9%" }}>No.</th>
            <th style={{ ...th, width: "32%" }}>DESCRIPTION OF WORK</th>
            <th style={{ ...th, width: "13%" }}>HSN CODE</th>
            <th style={{ ...th, width: "11%" }}>QTY.Kg</th>
            <th style={{ ...th, width: "17%" }}>RATE PER UNIT</th>
            <th style={{ ...th, width: "18%" }}>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const amount = item.amount ?? Number(item.qty || item.quantity || 0) * Number(item.rate || item.price || 0);
            return (
              <tr key={i}>
                <td style={{ ...td, fontWeight: 700, paddingLeft: "18px" }}>{i + 1}</td>
                <td style={{ ...td, fontSize: "11.5px", paddingLeft: "16px", wordBreak: "break-word" }}>{item.description || item.name || ""}</td>
                <td style={{ ...td, textAlign: "right" }}>{item.itemHSN || ""}</td>
                <td style={{ ...td, textAlign: "right" }}>{qty(item.qty ?? item.quantity)}</td>
                <td style={{ ...td, textAlign: "right" }}>₹ {money(item.rate ?? item.price)}</td>
                <td style={{ ...td, textAlign: "right" }}>₹ {money(amount)}</td>
              </tr>
            );
          })}
          {Array.from({ length: blankRows }).map((_, i) => (
            <tr key={`blank-${i}`}>
              <td style={td}></td><td style={td}></td><td style={td}></td><td style={td}></td><td style={td}></td>
              <td style={{ ...td, textAlign: "right" }}>₹ 0.00</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Bank details + totals */}
      <table className="printable-table" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <tbody>
          <tr>
            <td style={{ width: "65%", verticalAlign: "top", padding: 0 }}>
              {bankDetail && (
                <div style={{ paddingLeft: "76px", paddingTop: "22px" }}>
                  <div style={{ ...bankLine, color: "#111" }}>Account Details</div>
                  <div style={{ ...bankLine, color: "#111" }}>NAME- {bankDetail.accountHolderName || company.name}</div>
                  {bankDetail.bankName && <div style={bankLine}>{bankDetail.bankName}</div>}
                  {bankDetail.accountNumber && <div style={bankLine}>A/C NO. :- {bankDetail.accountNumber}</div>}
                  {bankDetail.ifscCode && <div style={bankLine}>IFSC :- {bankDetail.ifscCode}</div>}
                  {branch?.name && <div style={bankLine}>BRANCH NAME – {String(branch.name).toUpperCase()}</div>}
                  {branchPlace && <div style={bankLine}>{branchPlace}</div>}
                </div>
              )}
            </td>
            <td style={{ width: "35%", verticalAlign: "top", padding: 0 }}>
              <table className="printable-table" style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", border: `2px solid ${NAVY}`, borderTop: "none" }}>
                <tbody>
                  <tr><td style={{ ...totalLabel, width: "49%" }}>Invoice Subtotal</td><td style={totalValue}>{money(subtotal)}</td></tr>
                  <tr><td style={totalLabel}>GST Rate {taxPct}%</td><td style={totalValue}>{money(totalTax)}</td></tr>
                  <tr><td style={totalLabel}>WITH TAX</td><td style={totalValue}>{money(withTax)}</td></tr>
                  <tr><td style={totalLabel}>{discount > 0 ? "DISCOUNT / ADJ." : "ADJUSTMENT"}</td><td style={totalValue}>{adjustment ? money(adjustment) : "-"}</td></tr>
                  <tr><td style={{ ...totalLabel, fontWeight: 700, textAlign: "right" }}>TOTAL</td><td style={totalValue}>{money(Number(data.total ?? withTax))}</td></tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ textAlign: "center", fontSize: "13px", marginTop: "4px" }}>Please make all checks payable to {company.name}.</div>
    </div>
  );
}

// "Classic Invoice" format — plain black-and-white letterhead style, fully
// dynamic (company name/phone from Settings, no tenant hardcoded), so any
// tenant can select it.
export function ClassicInvoiceLayout({ data, date, companyName, compPhone }: { data: any; date: string; companyName: string; compPhone?: string }) {
  const client = data.client || {};
  const items = data.items || [];
  const subtotal = Number(data.subtotal || 0);
  const totalTax = Number(data.total_tax || 0);
  const taxPct = subtotal > 0 ? (totalTax / subtotal) * 100 : 0;
  const money = (n: number) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const buyerAddressLine = data.partyAddress || [client.address, client.city, client.state, client.zip, client.country].filter(Boolean).join(", ");

  const th: CSSProperties = { border: "1px solid #000", padding: "6px 8px", fontSize: "11.5px", background: "#1e3a5f", color: "#fff" };
  const td: CSSProperties = { border: "1px solid #000", padding: "6px 8px", fontSize: "11.5px" };
  const totalTd: CSSProperties = { border: "1px solid #000", padding: "6px 10px", fontSize: "12px" };

  return (
    <div style={{ border: "2px solid #000", padding: "24px", fontFamily: "Arial, Helvetica, sans-serif", fontSize: "12px", color: "#111" }}>
      <div style={{ textAlign: "center", fontSize: "34px", fontWeight: 900, letterSpacing: "2px", marginBottom: "24px" }}>INVOICE</div>

      <table className="printable-table" style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: "top", width: "55%" }}>
              <div style={{ fontSize: "16px", fontWeight: "bold" }}>{companyName}</div>
              {compPhone && <div>Mo.{compPhone}</div>}
            </td>
            <td style={{ verticalAlign: "top", textAlign: "right" }}>
              <table className="printable-table" style={{ marginLeft: "auto", borderCollapse: "collapse" }}>
                <tbody>
                  <tr><td style={{ fontWeight: "bold", padding: "2px 8px 2px 0" }}>Invoice</td><td style={{ padding: "2px 0" }}>{data.number || "-"}</td></tr>
                  <tr><td style={{ fontWeight: "bold", padding: "2px 8px 2px 0" }}>Invoice date:</td><td style={{ padding: "2px 0" }}>{date}</td></tr>
                  <tr><td style={{ fontWeight: "bold", padding: "2px 8px 2px 0" }}>Bill to:</td><td style={{ padding: "2px 0" }}>{client.company || "-"}</td></tr>
                  <tr><td style={{ fontWeight: "bold", padding: "2px 8px 2px 0" }}>Address</td><td style={{ padding: "2px 0" }}>{buyerAddressLine || "-"}</td></tr>
                  <tr><td style={{ fontWeight: "bold", padding: "2px 8px 2px 0" }}>Phone:</td><td style={{ padding: "2px 0" }}>{client.phonenumber || client.phone || "-"}</td></tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="printable-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px", tableLayout: "fixed" }}>
        <thead>
          <tr>
            <th style={{ ...th, width: "6%" }}>No.</th>
            <th style={{ ...th, wordBreak: "break-word" }}>Description of Work</th>
            <th style={{ ...th, width: "12%" }}>HSN Code</th>
            <th style={{ ...th, width: "12%" }}>Qty./KG</th>
            <th style={{ ...th, width: "14%", textAlign: "right" }}>Rate Per Unit</th>
            <th style={{ ...th, width: "16%", textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, i: number) => (
            <tr key={i}>
              <td style={{ ...td, textAlign: "center" }}>{i + 1}</td>
              <td style={{ ...td, wordBreak: "break-word" }}>{item.description || item.name || "-"}</td>
              <td style={{ ...td, textAlign: "center" }}>{item.itemHSN || "-"}</td>
              <td style={{ ...td, textAlign: "right" }}>{Number(item.qty || item.quantity || 0).toLocaleString("en-IN")}</td>
              <td style={{ ...td, textAlign: "right" }}>{money(item.rate || item.price || 0)}</td>
              <td style={{ ...td, textAlign: "right" }}>{money(item.amount ?? ((item.qty || 0) * (item.rate || 0)))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="printable-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
        <tbody>
          <tr>
            <td style={{ width: "60%" }}></td>
            <td style={{ width: "40%" }}>
              <table className="printable-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr><td style={totalTd}>Invoice Subtotal</td><td style={{ ...totalTd, textAlign: "right" }}>{money(subtotal)}</td></tr>
                  <tr><td style={totalTd}>Add. Tax {taxPct.toFixed(0)}%</td><td style={{ ...totalTd, textAlign: "right" }}>{money(totalTax)}</td></tr>
                  <tr><td style={totalTd}>Sales Tax</td><td style={{ ...totalTd, textAlign: "right" }}>{money(0)}</td></tr>
                  <tr><td style={totalTd}>ROUNDUP</td><td style={{ ...totalTd, textAlign: "right" }}>{money(0)}</td></tr>
                  <tr><td style={{ ...totalTd, fontWeight: "bold" }}>TOTAL</td><td style={{ ...totalTd, textAlign: "right", fontWeight: "bold" }}>{money(data.total)}</td></tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: "32px", fontSize: "11.5px" }}>
        Please make all checks payable to {companyName}.
      </div>
    </div>
  );
}
