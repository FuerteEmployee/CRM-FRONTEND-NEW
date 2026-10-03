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
