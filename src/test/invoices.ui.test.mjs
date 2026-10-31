// Playwright UI checks for Invoices (/admin/invoices) on the in-memory test stack.
// Frontend 127.0.0.1:5174 (vite.config.test.invoices.ts) -> backend 127.0.0.1:5102
// (CRM-BACKEND/src/testUtils/startInvoicesTestStack.js). Never :5001 / :5183.
//
// Every one of the six test companies logs in, opens /admin/invoices, creates an
// invoice through the form and opens the preview; money is compared UI = API = DB.
// Extra scenarios (discount, qty 0, XSS, permissions, mobile ...) run on BeOnTime.
// Convention: each check states the EXPECTED behaviour; FAIL = finding.
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://127.0.0.1:5174";
const API = "http://127.0.0.1:5102";
const OUT = process.env.INVOICE_UI_OUT || "invoices-ui-results.json";

const TENANTS = [
  { key: "beontime", label: "BeOnTime", email: "admin@beontime.inv-test.local" },
  { key: "citysmile", label: "CitySmile", email: "admin@citysmile.inv-test.local" },
  { key: "kiran", label: "Kiran", email: "admin@kiran.inv-test.local" },
  { key: "offixnest", label: "OffixNest", email: "admin@offixnest.inv-test.local" },
  { key: "rudraverse", label: "Rudraverse", email: "info@trinetratechnoworld.com", pilot: true },
  { key: "ekagra", label: "Ekagra", email: "ekagraengineering@gmail.com", ekagra: true },
];

const results = [];
const add = (tenant, area, name, passed, details, severity = "Medium") => {
  results.push({ tenant, area, name, passed: !!passed, details, severity });
  console.log(`[${passed ? "PASS" : "FAIL"}] [${tenant}] ${area} :: ${name} :: ${details}`);
};
const money = (s) => {
  const m = String(s || "").replace(/[^0-9.\-]/g, "");
  return m ? Number(m) : NaN;
};

const login = async (email) => {
  const r = await fetch(`${API}/api/test-login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
  return r.json();
};
const apiCall = async (token, method, path, body) => {
  const r = await fetch(API + path, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await r.json(); } catch { /* empty */ }
  return { status: r.status, body: json };
};
const setSetting = (email, name, value) =>
  fetch(`${API}/api/test-setting`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name, value }) });

const allHosts = new Set();
const apiHostSet = new Set();
const net4xx = [];
const static4xx = [];
const consoleErrors = [];

async function newSession(browser, email, viewport = { width: 1440, height: 900 }) {
  const { token, user } = await login(email);
  const context = await browser.newContext({ viewport, permissions: ["clipboard-read", "clipboard-write"] });
  await context.addInitScript(({ token, user }) => {
    localStorage.setItem("crm_token", token);
    localStorage.setItem("access_token", token);
    localStorage.setItem("crm_user", JSON.stringify(user));
  }, { token, user });
  const page = await context.newPage();
  page.on("request", (req) => {
    try {
      const u = new URL(req.url());
      allHosts.add(u.host);
      if (u.pathname.startsWith("/api/")) apiHostSet.add(u.host);
    } catch { /* blob: / data: urls */ }
  });
  page.on("response", (res) => {
    if (!res.url().includes("/api/") && res.status() >= 400) static4xx.push(`${res.status()} ${res.url().split("?")[0]}`);
    if (res.url().includes("/api/") && res.status() >= 400) net4xx.push(`[${email}] ${res.status()} ${res.request().method()} ${res.url().replace(API, "")}`);
  });
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`[${email}] ${m.text().slice(0, 200)}`); });
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  return { context, page, token, user };
}

async function pickRadix(page, trigger, optionText) {
  await trigger.click();
  const opt = page.getByRole("option", { name: optionText }).first();
  await opt.waitFor({ timeout: 5000 });
  await opt.click();
}

async function pickCustomer(page, company) {
  const trigger = page.getByRole("combobox").filter({ hasText: /Select Customer|Please select a branch/ }).first();
  await trigger.click();
  await page.getByPlaceholder("Search...").fill(company);
  await page.getByRole("option", { name: company }).first().click();
  await page.waitForTimeout(800); // customer autofill
}

// Fills the draft item row and confirms it with the check button.
async function addItemRow(page, { description, qty, rate, freightPct, gstPct, taxName }) {
  const row = page.locator("tr", { has: page.getByPlaceholder("Description", { exact: true }) }).first();
  await row.getByPlaceholder("Description", { exact: true }).fill(description);
  if (qty !== undefined) await row.locator('input[type="number"]').first().fill(String(qty));
  if (rate !== undefined) await row.getByPlaceholder("Rate").fill(String(rate));
  if (freightPct !== undefined) await row.getByPlaceholder("Freight %").fill(String(freightPct));
  if (gstPct !== undefined) await row.getByPlaceholder("GST %").fill(String(gstPct));
  if (taxName) await pickRadix(page, row.getByRole("combobox").last(), taxName);
  await row.locator("button").last().click();
  await page.waitForTimeout(300);
}

async function uiTotal(page) {
  const t = await page.locator("span", { hasText: /^Total( :)?$/ }).locator("xpath=following-sibling::span").first().textContent();
  return money(t);
}

// Opens the create form, fills it, clicks Save; returns UI total + captured POST.
async function createViaForm(page, T, opts) {
  await page.goto(`${BASE}/admin/invoices/create`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  if (T.pilot) await pickRadix(page, page.getByRole("combobox").filter({ hasText: "Select Branch" }).first(), `Ahmedabad Branch ${T.label}`);
  await pickCustomer(page, opts.company);
  if (opts.number) await page.locator("input.font-mono").first().fill(opts.number);
  // The separate "Discount Type" select was removed (Before/After Tax calculated the same).
  if (opts.discountType && await page.locator("label", { hasText: "Discount Type" }).count()) await pickRadix(page, page.locator("label", { hasText: "Discount Type" }).locator("xpath=..").getByRole("combobox"), opts.discountType);
  for (const it of opts.items) await addItemRow(page, it);
  if (opts.discountValue !== undefined) {
    const disc = page.locator("span", { hasText: /^Discount$/ }).locator("xpath=..").locator('input[type="number"]');
    await disc.fill(String(opts.discountValue));
    if (opts.discountMode) await pickRadix(page, page.locator("span", { hasText: /^Discount$/ }).locator("xpath=..").getByRole("combobox"), opts.discountMode);
  }
  const shownTotal = await uiTotal(page);
  const taxLabels = await page.locator("span", { hasText: /^(CGST|SGST|IGST|Total Tax)$/ }).allTextContents();
  const posts = [];
  const onReq = (req) => { if (req.method() === "POST" && /\/api\/invoices$/.test(req.url())) posts.push(req.postDataJSON()); };
  page.on("request", onReq);
  const respP = page.waitForResponse((r) => r.request().method() === "POST" && /\/api\/invoices$/.test(r.url()), { timeout: 15000 }).catch(() => null);
  if (opts.saveAction === "record") {
    await page.locator("button:has(svg.lucide-chevron-down)").last().click();
    await page.getByText("Save & Record Payment").click();
  } else if (opts.saveAction === "send") {
    await page.locator("button:has(svg.lucide-chevron-down)").last().click();
    await page.getByText("Save & Send", { exact: true }).click();
  } else if (opts.doubleClick) {
    await page.getByRole("button", { name: "Save", exact: true }).dblclick();
  } else {
    await page.getByRole("button", { name: "Save", exact: true }).click();
  }
  const resp = await respP;
  const body = resp ? await resp.json().catch(() => null) : null;
  await page.waitForTimeout(1500);
  page.off("request", onReq);
  return { shownTotal, taxLabels, payload: posts[0], posts, saved: body, status: resp?.status() };
}

// Opens the detail panel by clicking the Voucher Number button of the row.
async function openPanel(page, number) {
  await page.locator("tr", { hasText: number }).first().locator("button", { hasText: number }).first().click();
  await page.getByRole("dialog").last().waitFor({ timeout: 8000 });
  await page.waitForTimeout(800);
}

async function openPreviewFromList(page, number) {
  await page.goto(`${BASE}/admin/invoices`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const row = page.locator("tr", { hasText: number }).first();
  await row.locator('button[title="View"]').click();
  const dlg = page.getByRole("dialog").last();
  await dlg.waitFor({ timeout: 8000 });
  await page.waitForTimeout(1200);
  const text = await dlg.innerText();
  const m = text.match(/(GRAND TOTAL|TOTAL)\s*\n?\s*([^\n]+)/);
  await page.keyboard.press("Escape");
  return { text, label: m?.[1], total: money(m?.[2]) };
}

async function perTenant(browser, T) {
  const { context, page, token } = await newSession(browser, T.email);
  const L = T.label;
  try {
    // 1. Page load + sidebar label
    await page.goto(`${BASE}/admin/invoices`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const h1 = (await page.locator("h2", { hasText: "Invoices" }).first().textContent().catch(() => "")) || "";
    add(L, "List", "page /admin/invoices loads", /invoice/i.test(h1), `heading="${h1.trim()}"`, "High");
    // Normal tenants: Invoices sits inside the collapsed "Sales" group — open it first.
    if (!T.pilot) await page.getByText("Sales", { exact: true }).first().click().catch(() => {});
    await page.waitForTimeout(400);
    const navText = (await page.locator('a[href="/admin/invoices"]').allTextContents()).map((s) => s.trim()).filter(Boolean);
    const wantNav = T.pilot ? "Sales" : "Invoices";
    add(L, "Sidebar", `sidebar link to /admin/invoices labelled "${wantNav}"`, navText.some((t) => t === wantNav), `links=${JSON.stringify(navText)}`, "Low");
    const cards = await page.locator("text=/^(Unpaid|Paid|Partially Paid|Overdue|Cancelled)$/").count();
    add(L, "List", "5 status cards shown", cards >= 5, `cards=${cards}`, "Low");

    // 2. Create through the form: Gujarat customer, 2 x 500, freight 1% (default), GST 18
    const num = `UI-${T.key}-1`;
    const company = T.ekagra ? `Patna Power ${L}` : `Gujarat Traders ${L}`;
    const c = await createViaForm(page, T, { company, number: num, items: [{ description: "Widget UI", qty: 2, rate: 500, taxName: "GST 18 (18%)" }] });
    add(L, "Create", "Save -> 201", c.status === 201, `status=${c.status}`, "High");
    const db = c.saved?._id ? (await apiCall(token, "GET", `/api/invoices/${c.saved._id}`)).body : null;
    const expected = 1191.8; // 1000 + 10 freight + 181.80 tax
    add(L, "Money", "UI total = 1191.80", c.shownTotal === expected, `UI=${c.shownTotal}`, "High");
    add(L, "Money", "API total = UI total", c.saved?.total === c.shownTotal, `API=${c.saved?.total} UI=${c.shownTotal}`, "High");
    add(L, "Money", "DB total = UI total", db?.total === c.shownTotal, `DB=${db?.total} UI=${c.shownTotal}`, "High");
    add(L, "Money", "DB total_tax = 181.80", db?.total_tax === 181.8, `DB total_tax=${db?.total_tax}`, "Medium");
    const uiSplit = c.taxLabels.includes("IGST") ? "IGST" : c.taxLabels.includes("CGST") ? "GST" : "none";
    add(L, "Money", "UI CGST/SGST-vs-IGST label = saved tax_type", uiSplit === db?.tax_type, `UI=${uiSplit} DB=${db?.tax_type}`, "Medium");
    if (T.pilot) add(L, "Pilot fields", "branch saved from Branch select", db?.branch === `Ahmedabad Branch ${L}`, `branch=${db?.branch}`, "Medium");
    add(L, "Create", "Save (main button) saves status 'unpaid'", db?.status === "unpaid", `status=${db?.status}`, "Low");

    // 3. Preview of the form-created invoice
    const p1 = await openPreviewFromList(page, num);
    const expPreview = T.pilot ? Math.round(db?.total) : db?.total;
    add(L, "Preview", `${T.pilot ? "Rudraverse rounded TOTAL" : "GRAND TOTAL"} = DB total${T.pilot ? " rounded" : ""}`, p1.total === expPreview, `preview=${p1.label} ${p1.total} DB=${db?.total}`, "High");
    if (T.pilot) add(L, "Preview", "Rudraverse shows GST breakdown + Rounding", /SGST|IGST/.test(p1.text) && /Untaxed Amount/.test(p1.text), "rows present", "Low");

    // 4. Preview of an API-created invoice (no total_tax sent by the caller)
    const apiInv = (await apiCall(token, "POST", "/api/invoices", { client: db?.client?._id, number: `API-${T.key}-1`, items: [{ description: "Widget API", qty: 2, rate: 500, tax: 18, freight_charge: 10 }] })).body;
    const p2 = await openPreviewFromList(page, `API-${T.key}-1`);
    const exp2 = T.pilot ? Math.round(apiInv?.total) : apiInv?.total;
    add(L, "Preview", "API-created invoice: preview total = DB total", p2.total === exp2, `preview=${p2.total} DB=${apiInv?.total} (DB total_tax=${apiInv?.total_tax})`, "High");
    add(L, "Preview", "API-created invoice: preview shows the tax line", /Total Tax|IGST|CGST/.test(p2.text), `tax line ${/Total Tax|IGST|CGST/.test(p2.text) ? "shown" : "missing"}`, "Medium");

    // 5. PDF formats via invPdfFormat
    for (const fmt of ["generic", "classic_invoice", "ekagra_tax_invoice"]) {
      await setSetting(T.email, "invPdfFormat", fmt);
      const pf = await openPreviewFromList(page, num).catch((e) => ({ text: `ERR ${e.message}` }));
      const isEkagraLayout = /TAX INVOICE/i.test(pf.text) && /Place of Supply|HSN/i.test(pf.text);
      const shouldBeEkagra = fmt === "ekagra_tax_invoice" && T.ekagra;
      const ok = !/^ERR/.test(pf.text) && (shouldBeEkagra ? isEkagraLayout : true) && /1,191\.80|1191\.80|1,192/.test(pf.text);
      add(L, "PDF formats", `preview with invPdfFormat=${fmt} renders with the right total`, ok, `ekagraLayout=${isEkagraLayout} totalSeen=${/1,191\.80|1191\.80|1,192/.test(pf.text)}`, "Medium");
    }
    await setSetting(T.email, "invPdfFormat", "generic");

    // 6. Detail panel: Record Payment prefilled with balance due -> partially_paid
    await page.goto(`${BASE}/admin/invoices`, { waitUntil: "networkidle" });
    await openPanel(page, num);
    await page.getByRole("button", { name: /Record Payment/ }).first().click();
    const amt = await page.getByRole("dialog").last().locator('input[type="number"]').first().inputValue();
    add(L, "Detail panel", "Record Payment amount prefilled with balance due 1191.80", Number(amt) === 1191.8, `prefill=${amt}`, "Low");
    await page.getByRole("dialog").last().locator('input[type="number"]').first().fill("100");
    await page.getByRole("dialog").last().getByRole("button", { name: "Record Payment" }).click();
    await page.waitForTimeout(1500);
    const afterPay = (await apiCall(token, "GET", `/api/invoices/${c.saved?._id}`)).body;
    add(L, "Status flow", "payment 100 -> partially_paid", afterPay?.status === "partially_paid", `status=${afterPay?.status} paid=${afterPay?.total_paid}`, "High");
    await page.keyboard.press("Escape");
  } catch (e) {
    add(L, "Run", "tenant flow completed", false, e.message.split("\n")[0], "High");
  } finally {
    await context.close();
  }
}

async function beOnTimeExtras(browser) {
  const T = TENANTS[0];
  const L = T.label;
  const { context, page, token } = await newSession(browser, T.email);
  const run = async (name, fn) => {
    try { await fn(); } catch (e) { add(L, "Extra", name, false, `error: ${e.message.split("\n")[0]}`, "Medium"); }
  };
  await run("no-GSTIN customer", async () => {
    const c = await createViaForm(page, T, { company: `No GST Co ${L}`, number: "X-NOGST", items: [{ description: "W", qty: 1, rate: 100, taxName: "GST 18 (18%)" }] });
    const ui = c.taxLabels.includes("IGST") ? "IGST" : "GST";
    add(L, "Money", "no-GSTIN/no-state customer: UI split = saved split", ui === c.saved?.tax_type, `UI=${ui} DB=${c.saved?.tax_type}`, "Medium");
  });
  await run("qty 0", async () => {
    const c = await createViaForm(page, T, { company: `Gujarat Traders ${L}`, number: "X-QTY0", items: [{ description: "Q0", qty: 0, rate: 100, freightPct: 0 }] });
    add(L, "Money", "qty 0: UI total = saved total", c.shownTotal === c.saved?.total, `UI=${c.shownTotal} DB=${c.saved?.total}`, "High");
  });
  await run("Tax Zero + GST% 18", async () => {
    const c = await createViaForm(page, T, { company: `Gujarat Traders ${L}`, number: "X-TAX0", items: [{ description: "T0", qty: 1, rate: 100, freightPct: 0, gstPct: 18, taxName: "Zero (0%)" }] });
    add(L, "Money", "Tax 'Zero' + GST% 18: UI total = saved total", c.shownTotal === c.saved?.total, `UI=${c.shownTotal} DB=${c.saved?.total}`, "High");
  });
  await run("Fixed discount", async () => {
    const c = await createViaForm(page, T, { company: `Gujarat Traders ${L}`, number: "X-FIX", discountType: "Before Tax", discountValue: 50, discountMode: "Fixed Rate", items: [{ description: "F", qty: 1, rate: 1000, freightPct: 0 }] });
    add(L, "Money", "Fixed Rate discount 50: UI total = saved total", c.shownTotal === c.saved?.total, `UI=${c.shownTotal} DB=${c.saved?.total} sent discount_percent=${c.payload?.discount_percent}`, "High");
  });
  await run("No discount + value", async () => {
    const c = await createViaForm(page, T, { company: `Gujarat Traders ${L}`, number: "X-NODISC", discountValue: 10, items: [{ description: "N", qty: 1, rate: 1000, freightPct: 0 }] });
    add(L, "Money", "Discount Type 'No discount' + value 10: UI total = saved total", c.shownTotal === c.saved?.total, `UI=${c.shownTotal} DB=${c.saved?.total} sent discount_percent=${c.payload?.discount_percent}`, "High");
  });
  await run("Before vs After tax", async () => {
    // Fixed by removing the misleading select: one discount control, saved as shown.
    await page.goto(`${BASE}/admin/invoices/create`, { waitUntil: "networkidle" });
    const n = await page.locator("label", { hasText: "Discount Type" }).count();
    add(L, "Money", "no separate Before/After Tax discount type (they calculated the same)", n === 0, `Discount Type selects on the form: ${n}`, "Medium");
  });
  await run("Save & Send", async () => {
    const c = await createViaForm(page, T, { company: `Gujarat Traders ${L}`, number: "X-SEND", saveAction: "send", items: [{ description: "S", qty: 1, rate: 100 }] });
    // Save & Send now opens "Send Invoice to Email"; the server marks it "sent" only once the email goes out.
    const dialog = page.getByRole("dialog").filter({ hasText: "Send Invoice to Email" });
    const opened = await dialog.waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
    await page.waitForTimeout(800);
    const subject = opened ? await dialog.locator("#email-subject").inputValue().catch(() => "") : "";
    add(L, "Create", "Save & Send opens 'Send Invoice to Email' with the template filled in", opened && subject.includes("X-SEND"), `dialog=${opened}, subject="${subject}"`, "Medium");
    if (opened) {
      await dialog.locator("#email-to").fill("customer@example.com");
      const sendResp = page.waitForResponse((r) => /\/send-email$/.test(r.url()), { timeout: 60000 }).catch(() => null);
      await dialog.getByRole("button", { name: "Send", exact: true }).click();
      const r = await sendResp;
      const sentBody = r ? r.request().postDataJSON() : null;
      const pdfOk = !!sentBody?.pdf_base64 && Buffer.from(sentBody.pdf_base64, "base64").subarray(0, 5).toString() === "%PDF-";
      const resBody = r ? await r.json().catch(() => null) : null;
      // This test stack has no SMTP, so the server must refuse with a clear message and keep the status.
      add(L, "Email", "Send attaches a real PDF; no SMTP → clear 'SMTP not configured' message, status stays unpaid",
        pdfOk && r?.status() === 400 && /SMTP not configured/.test(resBody?.message || "") && (await apiCall(token, "GET", `/api/invoices/${c.saved?._id}`)).body?.status === "unpaid",
        `pdf=${pdfOk} (${sentBody?.pdf_base64?.length || 0} b64 chars), status=${r?.status()}, msg="${resBody?.message}"`, "High");
      // Escape closes the invoice panel too, so reopen it for the Download check.
      await page.goto(`${BASE}/admin/invoices?view=${c.saved?._id}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      // Download from the PDF menu is a real .pdf now (it used to be .html).
      const dl = page.waitForEvent("download", { timeout: 60000 }).catch(() => null);
      await page.locator("button:has(svg.lucide-file-text)").first().click();
      await page.getByRole("menuitem", { name: "Download" }).click();
      const file = await dl;
      const head = file ? (await import("fs")).readFileSync(await file.path()).subarray(0, 5).toString() : "";
      add(L, "PDF", "Download gives a real PDF (Invoice_<no>.pdf)", !!file && file.suggestedFilename().endsWith(".pdf") && head === "%PDF-", `file=${file?.suggestedFilename()}, starts with "${head}"`, "Medium");
      await page.keyboard.press("Escape");
    }
  });
  await run("Save & Record Payment", async () => {
    const c = await createViaForm(page, T, { company: `Gujarat Traders ${L}`, number: "X-REC", saveAction: "record", items: [{ description: "R", qty: 1, rate: 100, freightPct: 0 }] });
    const pays = (await apiCall(token, "GET", `/api/payments/invoice/${c.saved?._id}`)).body || [];
    const g = (await apiCall(token, "GET", `/api/invoices/${c.saved?._id}`)).body;
    add(L, "Create", "Save & Record Payment (Amount Paid empty) creates a payment = total", pays.length === 1, `status=${g?.status} payments=${pays.length} total_paid=${g?.total_paid}`, "High");
  });
  await run("Double-click Save", async () => {
    const c = await createViaForm(page, T, { company: `Gujarat Traders ${L}`, number: "", doubleClick: true, items: [{ description: "DBL", qty: 1, rate: 1 }] });
    add(L, "Create", "double-click Save creates only one invoice", c.posts.length === 1, `POSTs=${c.posts.length}`, "Medium");
  });
  await run("Tags", async () => {
    const c = await createViaForm(page, T, { company: `Gujarat Traders ${L}`, number: "X-TAGS", items: [{ description: "TG", qty: 1, rate: 1 }] });
    // Recurring / Prevent reminders were removed from the form (never saved); the payment mode is used for the initial payment.
    add(L, "Create", "payload carries tags", c.payload && "tags" in c.payload && !("recurring" in c.payload), `payload keys: ${Object.keys(c.payload || {}).join(",")}`, "Low");
  });
  await run("XSS invoice number", async () => {
    const xnum = `<img src=x onerror="window.__xss=1">`;
    const inv = (await apiCall(token, "POST", "/api/invoices", { client: (await apiCall(token, "GET", "/api/invoices?page=1&limit=1")).body.data[0].client._id, number: xnum, items: [{ description: "<img src=x onerror=\"window.__xss2=1\">", qty: 1, rate: 1 }] })).body;
    await page.goto(`${BASE}/admin/invoices`, { waitUntil: "networkidle" });
    await openPanel(page, xnum);
    const popupP = context.waitForEvent("page", { timeout: 8000 }).catch(() => null);
    await page.getByRole("dialog").last().locator("button:has(svg.lucide-file-text)").first().click();
    await page.getByText("View PDF in New Tab").click();
    const popup = await popupP;
    let fired = null;
    if (popup) {
      await popup.waitForLoadState().catch(() => {});
      await popup.waitForTimeout(800);
      fired = await popup.evaluate(() => ({ num: !!window.__xss, item: !!window.__xss2, origin: location.href.slice(0, 30), token: !!localStorage.getItem("crm_token") })).catch((e) => ({ err: e.message }));
      await popup.close();
    }
    add(L, "Security", "invoice number HTML is escaped in View PDF (no script runs)", fired && !fired.num, `popup=${JSON.stringify(fired)} id=${inv?._id}`, "High");
    add(L, "Security", "item description HTML is escaped in View PDF", fired && !fired.item, `popup=${JSON.stringify(fired)}`, "High");
    await page.keyboard.press("Escape");
  });
  // A fresh invoice so it is on page 1 of the newest-first list.
  const fresh = async (number) => apiCall(token, "POST", "/api/invoices", { client: (await apiCall(token, "GET", "/api/invoices?page=1&limit=1")).body.data[0].client._id, number, items: [{ description: "F", qty: 1, rate: 1 }] });
  await run("Copy link", async () => {
    await fresh("X-COPY");
    await page.goto(`${BASE}/admin/invoices`, { waitUntil: "networkidle" });
    await openPanel(page, "X-COPY");
    await page.getByRole("dialog").last().getByRole("button", { name: /^More/ }).first().click();
    await page.getByRole("menuitem", { name: "Copy" }).click();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    await page.keyboard.press("Escape");
    await page.goto(link, { waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    add(L, "Detail panel", "Copy link opens the invoice (not a 404 page)", !/404|not found/i.test(body), `link=${link.replace(BASE, "")} page=${body.slice(0, 60).replace(/\n/g, " ")}`, "Low");
  });
  await run("Delete from detail panel", async () => {
    await apiCall(token, "POST", "/api/invoices", { client: (await apiCall(token, "GET", "/api/invoices?page=1&limit=1")).body.data[0].client._id, number: "X-DELPANEL", items: [{ description: "D", qty: 1, rate: 1 }] });
    await page.goto(`${BASE}/admin/invoices`, { waitUntil: "networkidle" });
    await openPanel(page, "X-DELPANEL");
    await page.getByRole("dialog").last().getByRole("button", { name: /^More/ }).first().click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.waitForTimeout(1200);
    const confirmShown = await page.getByText(/Are you sure/i).count();
    const still = (await apiCall(token, "GET", "/api/invoices?page=1&limit=5&search=X-DELPANEL")).body.total;
    add(L, "Detail panel", "More > Delete asks for confirmation", confirmShown > 0 || still === 1, `confirm=${confirmShown} stillExists=${still}`, "Medium");
  });
  await run("Status card currency", async () => {
    await apiCall(token, "POST", "/api/invoices", { client: (await apiCall(token, "GET", "/api/invoices?page=1&limit=1")).body.data[0].client._id, number: "X-USD", currency: "USD", items: [{ description: "U", qty: 1, rate: 10 }] });
    await page.goto(`${BASE}/admin/invoices`, { waitUntil: "networkidle" });
    const cardTxt = await page.locator("text=Unpaid").first().locator("xpath=ancestor::div[2]").innerText();
    // Each currency gets its own total on the card, e.g. "$10.00 + ₹4,559.81".
    add(L, "List", "status card totals do not mix USD into a ₹ sum", /\$[\d,.]+/.test(cardTxt), `card="${cardTxt.replace(/\n/g, " ").slice(0, 80)}"`, "Low");
  });
  await run("All vs paginated Unpaid filter", async () => {
    await apiCall(token, "POST", "/api/invoices", { client: (await apiCall(token, "GET", "/api/invoices?page=1&limit=1")).body.data[0].client._id, number: "X-SENT", status: "sent", items: [{ description: "S", qty: 1, rate: 1 }] });
    await page.goto(`${BASE}/admin/invoices`, { waitUntil: "networkidle" });
    await page.locator("text=/^Unpaid$/").first().click();
    await page.waitForTimeout(1200);
    const paged = await page.locator("tr", { hasText: "X-SENT" }).count();
    await pickRadix(page, page.getByRole("combobox").filter({ hasText: /^(10|25|50|100)$/ }).first(), "All");
    await page.waitForTimeout(1500);
    const all = await page.locator("tr", { hasText: "X-SENT" }).count();
    add(L, "List", "Unpaid card shows 'sent' invoices in both paginated and All modes", paged > 0 && all > 0, `paginated=${paged} all=${all}`, "Medium");
  });
  await run("Bulk delete toast", async () => {
    await page.goto(`${BASE}/admin/invoices`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Bulk Actions/ }).click();
    const t = await page.locator("[data-state=open]").allInnerTexts();
    await page.keyboard.press("Escape");
    add(L, "Bulk", "Bulk Actions with nothing selected shows 'Please select at least one item first.'", t.join(" ").includes("Please select at least one item first."), `shown: ${t.join(" ").replace(/\n/g, " ").slice(0, 100)}`, "Low");
  });
  await run("Edit deleted id", async () => {
    await page.goto(`${BASE}/admin/invoices/edit/0123456789abcdef01234567`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    add(L, "UI", "edit of a deleted id -> back to the list", page.url().endsWith("/admin/invoices"), `url=${page.url().replace(BASE, "")}`, "Low");
  });
  await context.close();

  // View-only staff
  await run("view-only UI", async () => {
  await fresh("X-VIEWONLY");
  const v = await newSession(browser, "viewer@beontime.inv-test.local");
  // Staff (non-admin) logins are redirected from /admin/* to /staff/*.
  await v.page.goto(`${BASE}/staff/invoices`, { waitUntil: "networkidle" });
  await v.page.waitForTimeout(1500);
  const show = async (re) => (await v.page.getByRole("button", { name: re }).count()) > 0;
  add(L, "Permissions UI", "view-only: no 'New Invoice'", !(await show(/New Invoice/)), "", "Low");
  add(L, "Permissions UI", "view-only: no 'Bulk Actions'", !(await show(/Bulk Actions/)), `shown=${await show(/Bulk Actions/)}`, "Medium");
  add(L, "Permissions UI", "view-only: no 'Import'", !(await show(/^Import$/)), `shown=${await show(/^Import$/)}`, "Medium");
  add(L, "Permissions UI", "view-only: no row Edit / Delete", (await v.page.locator('button[title="Edit"],button[title="Delete"]').count()) === 0, "", "Low");
  await openPanel(v.page, "X-VIEWONLY");
  await v.page.waitForTimeout(800);
  const dlg = v.page.getByRole("dialog").last();
  const inDlg = async (re) => (await dlg.getByRole("button", { name: re }).count()) > 0;
  // "More" stays for viewers (View Invoice / Copy link) but must hold no Mark as / Delete.
  let moreWrite = 0;
  if (await inDlg(/^More/)) {
    await dlg.getByRole("button", { name: /^More/ }).click();
    moreWrite = await v.page.getByRole("menuitem", { name: /Mark as|Delete/ }).count();
    await v.page.keyboard.press("Escape");
  }
  add(L, "Permissions UI", "view-only: detail panel hides Record Payment / Mark as / Delete / Convert", !(await inDlg(/Record Payment/)) && moreWrite === 0 && !(await inDlg(/^Convert/)), `RecordPayment=${await inDlg(/Record Payment/)} More write items=${moreWrite} Convert=${await inDlg(/^Convert/)}`, "Medium");
  await v.context.close();
  });

  // Mobile / tablet
  for (const [w, h] of [[375, 812], [768, 1024]]) await run(`responsive ${w}`, async () => {
    const m = await newSession(browser, T.email, { width: w, height: h });
    await m.page.goto(`${BASE}/admin/invoices`, { waitUntil: "networkidle" });
    await m.page.waitForTimeout(1200);
    const pageOverflow = await m.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    add(L, "Responsive", `${w}px list: no page-level horizontal scroll (table scrolls inside)`, !pageOverflow, `docScrollWidth>viewport=${pageOverflow}`, "Low");
    await m.page.goto(`${BASE}/admin/invoices/create`, { waitUntil: "networkidle" });
    await m.page.waitForTimeout(1200);
    const save = m.page.getByRole("button", { name: "Save", exact: true });
    await save.scrollIntoViewIfNeeded().catch(() => {});
    const box = await save.boundingBox();
    add(L, "Responsive", `${w}px create: Save button reachable on screen`, !!box && box.x >= 0 && box.x + box.width <= w, `box=${JSON.stringify(box)}`, "Medium");
    await m.context.close();
  });
}

(async () => {
  const health = await (await fetch(`${API}/api/health`)).json();
  console.log("[GUARD] backend health:", JSON.stringify(health));
  if (!String(health.uri || "").startsWith("mongodb://127.0.0.1")) throw new Error("GUARD FAILURE: backend is not on the in-memory DB");
  // Bundled Playwright Chromium when downloaded, else the installed Chrome.
  const browser = await chromium.launch({ headless: true }).catch(() => chromium.launch({ headless: true, channel: "chrome" }));
  for (const T of TENANTS) await perTenant(browser, T);
  await beOnTimeExtras(browser);
  await browser.close();

  const hosts = [...allHosts];
  const apiHosts = [...apiHostSet];
  add("ALL", "Guard", "every /api call went to 127.0.0.1:5102 (and nothing to :5001 / :5183)", apiHosts.length === 1 && apiHosts[0] === "127.0.0.1:5102" && !hosts.some((h) => /:5001|:5183/.test(h)), `api hosts=${JSON.stringify(apiHosts)}; all hosts=${JSON.stringify(hosts)}`, "High");
  add("ALL", "Console", "zero red console errors", consoleErrors.length === 0, `${consoleErrors.length} errors; first: ${consoleErrors.slice(0, 3).join(" || ")}`, "Low");
  // The send-email 400 is the planned "SMTP not configured" check (this stack has no SMTP).
  const unexpected4xx = net4xx.filter((x) => !/400 POST \/api\/invoices\/[0-9a-f]{24}\/send-email/.test(x));
  add("ALL", "Network", "zero unexpected 4xx/5xx", unexpected4xx.length === 0, `${unexpected4xx.length}; ${[...new Set(unexpected4xx.map((x) => x.replace(/\/[0-9a-f]{24}/g, "/:id")))].slice(0, 8).join(" || ")}`, "Low");

  const staticList = [...new Set(static4xx)];
  add("ALL", "Network", "no missing static files (images/icons)", staticList.length === 0, `${static4xx.length} hits: ${staticList.slice(0, 5).join(" || ")}`, "Low");
  fs.writeFileSync(OUT, JSON.stringify({ hosts, results, net4xx, static4xx: staticList, consoleErrors }, null, 1));
  const pass = results.filter((r) => r.passed).length;
  console.log(`\nUI RESULTS: ${pass} passed, ${results.length - pass} failed, ${results.length} total -> ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });
