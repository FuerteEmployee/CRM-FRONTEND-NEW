// Playwright UI checks for Goals (/admin/goals, /admin/goals/new, /admin/goals/edit/:id), 05-goals.md section 5.
// Runs strictly against frontend http://127.0.0.1:5173 and backend http://127.0.0.1:5101
// (CRM-BACKEND/src/testUtils/startGoalsTestStack.js + vite.config.test.ts). Never :5001 / :5183.
// Each check states the CORRECT behaviour; FAIL = a bug (or a stack limitation, said in the details).
import { chromium } from "playwright";
import fs from "fs";

const BASE_URL = "http://127.0.0.1:5173";
const API_URL = "http://127.0.0.1:5101";
const PASSWORD = "Test@1234";
const OUT = process.env.GOALS_UI_OUT || "goals-ui-results.json";
const TENANTS = [
  ["BeOnTime", "admin@beontime.test"], ["CitySmile", "admin@citysmile.test"], ["Kiran", "admin@kiran.test"],
  ["OffixNest", "admin@offixnest.test"], ["Rudraverse", "info@trinetratechnoworld.com"], ["Ekagra", "ekagraengineering@gmail.com"],
];

const results = [];
const add = (tenant, area, name, passed, details, severity = "Low") => {
  results.push({ tenant, area, name, passed: !!passed, details, severity });
  console.log(`[${passed ? "PASS" : "FAIL"}] [${tenant}] ${area} :: ${name} — ${details}`);
};
const allRequests = [];
const consoleErrors = [];
const badResponses = [];

const login = async (email) => {
  const r = await fetch(`${API_URL}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: PASSWORD }) });
  const j = await r.json();
  if (!j.token) throw new Error(`login failed for ${email}: ${JSON.stringify(j)}`);
  return j;
};
const api = async (token, method, path, body) => {
  const r = await fetch(API_URL + path, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};

async function newSession(browser, sess, viewport = { width: 1280, height: 800 }, tag = "") {
  const context = await browser.newContext({ viewport });
  await context.addInitScript((s) => {
    localStorage.setItem("crm_token", s.token);
    localStorage.setItem("access_token", s.token);
    localStorage.setItem("crm_refresh_token", s.refreshToken);
    localStorage.setItem("crm_user", JSON.stringify(s.user));
    localStorage.setItem("crm_permissions", JSON.stringify(s.permissions || {}));
    if (s.plan_modules) localStorage.setItem("crm_plan_modules", JSON.stringify(s.plan_modules));
  }, sess);
  const page = await context.newPage();
  page.on("request", (req) => allRequests.push(req.url()));
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`${tag} ${m.text().slice(0, 200)}`); });
  page.on("pageerror", (e) => consoleErrors.push(`${tag} PAGEERROR ${e.message.slice(0, 200)}`));
  page.on("response", (res) => {
    const u = res.url();
    if (u.includes("/api/") && res.status() >= 400) badResponses.push({ tag, status: res.status(), url: u.replace(API_URL, "") });
  });
  page.on("dialog", (d) => d.accept());
  return { context, page };
}

const rowSubjects = (page) => page.locator("tbody tr td:nth-child(2)").allTextContents();
const toastText = async (page) => {
  try { await page.locator("[data-sonner-toast]").first().waitFor({ timeout: 5000 }); } catch { return ""; }
  return (await page.locator("[data-sonner-toast]").allTextContents()).join(" | ");
};
const pickSelect = async (page, index, optionText) => {
  await page.getByRole("combobox").nth(index).click();
  await page.getByRole("option", { name: new RegExp(optionText) }).first().click();
};
async function fillGoalForm(page, { subject, typeLabel = "Achieve Total Income", staff, achievement = "5000", start = "2026-11-01", end = "2026-12-31", description = "" }) {
  await page.getByPlaceholder("Enter goal subject").fill(subject);
  await pickSelect(page, 0, typeLabel);
  await pickSelect(page, 1, staff);
  await page.getByPlaceholder("e.g. 50000").fill(achievement);
  const dates = page.locator('input[type="date"]');
  await dates.nth(0).fill(start);
  await dates.nth(1).fill(end);
  if (description) await page.getByPlaceholder("Enter goal details").fill(description);
}

async function perTenant(browser, key, email) {
  const sess = await login(email);
  const { context, page } = await newSession(browser, sess, undefined, key);
  const tok = sess.token;
  try {
    // List
    await page.goto(`${BASE_URL}/admin/goals`, { waitUntil: "networkidle" });
    await page.locator("h1", { hasText: "Goals" }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(800);
    const apiList = (await api(tok, "GET", "/api/goals")).body || [];
    const uiRows = await rowSubjects(page);
    const expectedRows = Math.min(apiList.length, 25);
    add(key, "List", "UI row count = API count (page size 25)", uiRows.length === expectedRows, `UI ${uiRows.length}, API ${apiList.length}`, "Medium");
    add(key, "List", "no other tenant's goals shown", !uiRows.some((s) => TENANTS.some(([k]) => k !== key && s.startsWith(`${k} Goal`))), `rows: ${uiRows.slice(0, 3).join(", ")}…`, "High");

    // Create through the form
    await page.getByRole("button", { name: /new goal/i }).click();
    await page.waitForURL("**/admin/goals/new");
    const subject = `UI created ${key} ${Date.now()}`;
    await fillGoalForm(page, { subject, staff: `PickB ${key}`, description: "made in Playwright" });
    await page.getByRole("button", { name: "Save Goal" }).click();
    const t = await toastText(page);
    await page.waitForURL("**/admin/goals", { timeout: 10000 }).catch(() => {});
    add(key, "Create", "toast 'Goal created successfully' and back to /admin/goals", t.includes("Goal created successfully") && page.url().endsWith("/admin/goals"), `toast "${t}", url ${page.url()}`, "Medium");
    const created = ((await api(tok, "GET", "/api/goals")).body || []).find((g) => g.subject === subject);
    add(key, "Create", "DB record matches form (type, staff, achievement, dates, tenant)",
      created && created.goal_type === "total_income" && created.staff_member?.firstname === "PickB" && Number(created.achievement) === 5000 &&
      created.start_date?.startsWith("2026-11-01") && created.end_date?.startsWith("2026-12-31") && String(created.tenant_id) === String(sess.user.tenant?._id || sess.user.tenant_id),
      created ? `type=${created.goal_type} staff=${created.staff_member?.firstname} ach=${created.achievement} start=${created.start_date}` : "not found", "High");

    // View popup
    await page.getByText(subject).first().click();
    const dlg = page.getByRole("dialog");
    await dlg.waitFor({ timeout: 5000 });
    const dt = await dlg.textContent();
    add(key, "View", "popup shows subject, progress, target, staff, type, dates, description, notify flags",
      dt.includes(subject) && dt.includes("Current Progress") && dt.includes("5000") && dt.includes("PickB") && /total income/i.test(dt) &&
      dt.includes("November 01, 2026") && dt.includes("made in Playwright") && dt.includes("Notify on Achievement: Yes") && dt.includes("Notify on Failure: Yes"),
      dt.replace(/\s+/g, " ").slice(0, 160), "Medium");
    await page.keyboard.press("Escape");
    return { page, context, sess };
  } catch (e) {
    add(key, "Flow", "tenant flow completed without error", false, e.message.slice(0, 200), "High");
    return { page, context, sess };
  }
}

async function deepChecks(browser, base) {
  const key = "BeOnTime";
  const { page, sess } = base;
  const tok = sess.token;
  const goals = (await api(tok, "GET", "/api/goals")).body;

  // Page sizes / pagination
  const sizes = {};
  for (const size of ["10", "25", "50", "100", "All"]) {
    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name: size, exact: true }).click();
    await page.waitForTimeout(300);
    sizes[size] = (await rowSubjects(page)).length;
  }
  add(key, "List", "page sizes 10/25/50/100/All show min(size, total) rows", sizes["10"] === 10 && sizes["25"] === 25 && sizes["All"] === goals.length, JSON.stringify(sizes) + ` total ${goals.length}`, "Medium");
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "10", exact: true }).click();
  const pager = await page.getByRole("button", { name: /next|previous|^2$/i }).count();
  add(key, "List", "rows after the page size can be reached (pagination control exists)", pager > 0, `pagination buttons found: ${pager}; goals 11-${goals.length} only visible with a bigger page size`, "Medium");

  // Search
  await page.getByPlaceholder("Search goals...").fill("ui goal 07");
  await page.waitForTimeout(300);
  const s1 = await rowSubjects(page);
  add(key, "Search", "subject search, case-insensitive", s1.length === 1 && s1[0] === "UI Goal 07", JSON.stringify(s1), "Low");
  await page.getByPlaceholder("Search goals...").fill("Achieve Total Income");
  await page.waitForTimeout(300);
  const s2 = await rowSubjects(page);
  add(key, "Search", "search by the goal-type label shown in the form", s2.length > 0, `rows ${s2.length} (search only matches raw value "total_income")`, "Low");
  await page.getByPlaceholder("Search goals...").fill("");

  // Table goal type text
  const typeCells = await page.locator("tbody tr td:nth-child(7)").allTextContents();
  add(key, "List", "Goal Type column shows a readable label", !typeCells.some((c) => /_/.test(c)), `cells: ${[...new Set(typeCells)].slice(0, 3).join(", ")}`, "Low");

  // Progress bar values >100 / <0
  await page.getByPlaceholder("Search goals...").fill("Long Subject");
  await page.waitForTimeout(300);
  const prog = await page.locator("tbody tr").first().locator("td:nth-child(8)").textContent();
  add(key, "List", "progress shown is clamped to 0-100%", !/150%/.test(prog), `shows "${prog?.trim()}" for DB progress 150`, "Low");
  const tableBox = await page.locator("table").boundingBox();
  const cardBox = await page.locator("table").locator("xpath=ancestor::div[contains(@class,'overflow-auto')]").boundingBox();
  add(key, "Layout", "long subject does not break the table (stays in its scroll container)", tableBox && cardBox && cardBox.width <= 1280, `table width ${Math.round(tableBox?.width)}px in container ${Math.round(cardBox?.width)}px`, "Low");
  await page.getByPlaceholder("Search goals...").fill("");

  // XSS in description shown in popup
  await page.getByPlaceholder("Search goals...").fill("XSS goal");
  await page.waitForTimeout(300);
  await page.getByText("XSS goal").first().click();
  await page.getByRole("dialog").waitFor();
  const xss = await page.evaluate(() => window.__xss);
  const shown = await page.getByRole("dialog").textContent();
  add(key, "XSS", "description <img onerror>/<script> is shown as text, not executed", xss === undefined && shown.includes("<img src=x"), `window.__xss=${xss}`, "High");
  await page.keyboard.press("Escape");

  // View popup: open A, close, open B → B's data
  await page.getByPlaceholder("Search goals...").fill("UI Goal 0");
  await page.waitForTimeout(300);
  await page.getByText("UI Goal 01", { exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await page.getByText("UI Goal 02", { exact: true }).click();
  const t2 = await page.getByRole("dialog").textContent();
  add(key, "View", "close → open another goal shows the new goal", t2.includes("UI Goal 02") && !t2.includes("UI Goal 01"), t2.slice(0, 80), "Low");
  await page.keyboard.press("Escape");

  // Export
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 8000 }).catch(() => null),
    (async () => { await page.getByRole("button", { name: /export/i }).first().click(); await page.waitForTimeout(400); const csv = page.getByText(/csv/i).first(); if (await csv.count()) await csv.click(); })(),
  ]);
  if (download) {
    const p = await download.path();
    const txt = fs.readFileSync(p, "utf8");
    const header = txt.split(/\r?\n/)[0];
    add(key, "Export", "CSV columns match the table (Subject…Progress with %)", /Subject.*Staff Member.*Achievement.*Start Date.*End Date.*Goal Type.*Progress/.test(header) && /\d+%/.test(txt), `header: ${header}`, "Low");
  } else add(key, "Export", "CSV export downloads", false, "no download event (export menu not found)", "Low");
  await page.keyboard.press("Escape");
  await page.getByPlaceholder("Search goals...").fill("");

  // Bulk: nothing selected
  await page.getByRole("button", { name: /bulk actions/i }).click();
  const tb = await toastText(page);
  add(key, "Bulk", "nothing selected → 'Please select at least one goal first.'", tb.includes("Please select at least one goal first."), tb, "Low");
  await page.waitForTimeout(500);

  // Bulk: select 2 rows → confirm disabled until Mass Delete ticked → deleted
  await page.getByPlaceholder("Search goals...").fill("UI Goal 2");
  await page.waitForTimeout(300);
  const boxes = page.locator("tbody tr td:first-child button[role=checkbox]");
  await boxes.nth(0).click(); await boxes.nth(1).click();
  await page.getByRole("button", { name: /bulk actions/i }).click();
  const confirm = page.getByRole("dialog").getByRole("button", { name: "Confirm" });
  const disabledBefore = await confirm.isDisabled();
  await page.getByRole("dialog").locator("#massDelete").click();
  await confirm.click();
  const tbd = await toastText(page);
  await page.waitForTimeout(800);
  const after = await rowSubjects(page);
  add(key, "Bulk", "Confirm disabled until Mass Delete ticked; 'Deleted 2 goals.'", disabledBefore && tbd.includes("Deleted 2 goals."), `disabled before=${disabledBefore}, toast "${tbd}", rows now ${after.length}`, "Low");

  // Select-all selects only shown rows
  await page.getByPlaceholder("Search goals...").fill("");
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "10", exact: true }).click();
  await page.locator("thead button[role=checkbox]").click();
  const checked = await page.locator("tbody button[role=checkbox][data-state=checked]").count();
  add(key, "Bulk", "select-all selects only the rows shown (10)", checked === 10, `checked ${checked}`, "Low");
  await page.locator("thead button[role=checkbox]").click();

  // Edit every field
  const target = (await api(tok, "GET", "/api/goals")).body.find((g) => g.subject === "UI Goal 03");
  await page.goto(`${BASE_URL}/admin/goals/edit/${target._id}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Update Goal" }).waitFor();
  await page.getByPlaceholder("Enter goal subject").fill("UI Goal 03 edited");
  await pickSelect(page, 0, "Convert X Leads");
  await pickSelect(page, 1, "PickC BeOnTime");
  await page.getByPlaceholder("e.g. 50000").fill("42");
  await page.locator('input[type="date"]').nth(0).fill("2026-12-01");
  await page.locator('input[type="date"]').nth(1).fill("2026-12-20");
  await page.getByPlaceholder("Enter goal details").fill("edited desc");
  await page.getByText("Notify staff members when goal achieve").click();
  await page.getByRole("button", { name: "Update Goal" }).click();
  const te = await toastText(page);
  await page.waitForURL("**/admin/goals", { timeout: 8000 }).catch(() => {});
  const ed = (await api(tok, "GET", `/api/goals/${target._id}`)).body;
  add(key, "Edit", "every field saved, toast 'Goal updated successfully'",
    te.includes("Goal updated successfully") && ed.subject === "UI Goal 03 edited" && ed.goal_type === "convert_leads" && ed.staff_member.firstname === "PickC" &&
    Number(ed.achievement) === 42 && ed.start_date.startsWith("2026-12-01") && ed.end_date.startsWith("2026-12-20") && ed.description === "edited desc" && ed.notify_on_achieve === false,
    `toast "${te}" db ${JSON.stringify({ s: ed.subject, t: ed.goal_type, a: ed.achievement, n: ed.notify_on_achieve })}`, "Medium");

  // New Goal after editing another → empty form
  await page.goto(`${BASE_URL}/admin/goals/edit/${target._id}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Update Goal" }).waitFor();
  await page.locator("h1", { hasText: "Edit Goal" }).locator("xpath=../..").getByRole("button").first().click(); // back arrow
  await page.waitForURL("**/admin/goals");
  add(key, "Edit", "back arrow returns to the list", page.url().endsWith("/admin/goals"), page.url(), "Low");
  await page.getByRole("button", { name: /new goal/i }).click();
  await page.waitForTimeout(500);
  const subjVal = await page.getByPlaceholder("Enter goal subject").inputValue();
  add(key, "Create", "New Goal after editing another goal shows an empty form", subjVal === "", `subject="${subjVal}"`, "Low");

  // UI validation messages
  await page.getByRole("button", { name: "Save Goal" }).click();
  const tv = await toastText(page);
  add(key, "Validation", "empty Save → 'Please fill in all required fields'", tv.includes("Please fill in all required fields"), tv, "Low");
  await page.waitForTimeout(400);
  await fillGoalForm(page, { subject: "   ", staff: "PickA BeOnTime" });
  const before = (await api(tok, "GET", "/api/goals")).body.length;
  await page.getByRole("button", { name: "Save Goal" }).click();
  await page.waitForTimeout(1500);
  const afterN = (await api(tok, "GET", "/api/goals")).body.length;
  add(key, "Validation", "Subject of only spaces is blocked in the UI", afterN === before, `goals before ${before}, after ${afterN}`, "Medium");

  await page.goto(`${BASE_URL}/admin/goals/new`, { waitUntil: "networkidle" });
  await fillGoalForm(page, { subject: "End before start", staff: "PickA BeOnTime", start: "2026-12-31", end: "2026-01-01", achievement: "-100" });
  const b2 = (await api(tok, "GET", "/api/goals")).body.length;
  await page.getByRole("button", { name: "Save Goal" }).click();
  await page.waitForTimeout(1500);
  const a2 = (await api(tok, "GET", "/api/goals")).body.length;
  add(key, "Validation", "End Date before Start Date / negative Achievement blocked in the UI", a2 === b2, `goals before ${b2}, after ${a2}`, "Medium");

  // Double-click Save → one goal
  await page.goto(`${BASE_URL}/admin/goals/new`, { waitUntil: "networkidle" });
  await fillGoalForm(page, { subject: "Double click goal", staff: "PickA BeOnTime" });
  await page.getByRole("button", { name: "Save Goal" }).dblclick();
  await page.waitForTimeout(2000);
  const dbl = (await api(tok, "GET", "/api/goals")).body.filter((g) => g.subject === "Double click goal").length;
  add(key, "Create", "double-click Save Goal creates only one goal", dbl === 1, `created ${dbl}`, "Medium");

  // Delete with confirm
  await page.goto(`${BASE_URL}/admin/goals`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("Search goals...").fill("Double click goal");
  await page.waitForTimeout(300);
  const n0 = (await rowSubjects(page)).length;
  await page.locator("tbody tr").first().locator("td:last-child button").nth(2).click();
  const td = await toastText(page);
  add(key, "Delete", "confirm → 'Goal deleted successfully'", td.includes("Goal deleted successfully"), `toast "${td}" (rows before ${n0})`, "Low");

  // Edit another tenant's goal id / deleted id
  const other = (await api((await login("admin@kiran.test")).token, "GET", "/api/goals")).body[0];
  await page.goto(`${BASE_URL}/admin/goals/edit/${other._id}`);
  const nfToast = await toastText(page);
  const otherVal = await page.getByPlaceholder("Enter goal subject").inputValue({ timeout: 1000 }).catch(() => "");
  const nf = /not found/i.test(nfToast) ? 1 : 0;
  add(key, "Isolation", "edit URL with another tenant's goal id shows 'not found', not data", otherVal === "" && nf > 0, `subject field "${otherVal}", not-found message shown: ${nf > 0} (form just opens empty as "Edit Goal")`, "Low");
  // The edit page now sends the user back to the list, so there is no empty form to save.
  await page.waitForURL("**/admin/goals", { timeout: 8000 }).catch(() => {});
  add(key, "Isolation", "another tenant's goal id → back to the list (no empty form to save)", page.url().endsWith("/admin/goals"), page.url(), "Low");

  // Responsive
  for (const [w, h] of [[375, 812], [768, 1024]]) {
    const { context: c2, page: p2 } = await newSession(browser, sess, { width: w, height: h }, `${key}@${w}`);
    await p2.goto(`${BASE_URL}/admin/goals`, { waitUntil: "networkidle" });
    await p2.locator("h1", { hasText: "Goals" }).waitFor();
    const docW = await p2.evaluate(() => document.documentElement.scrollWidth);
    // The <Table> component wraps the table in its own overflow-auto div; that is what scrolls.
    const scroller = await p2.locator("table").first().evaluate((t) => t.parentElement.scrollWidth > t.parentElement.clientWidth);
    const wide = await p2.evaluate(() => [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1 && !e.closest("table")).slice(0, 2).map((e) => e.tagName + "." + String(e.className).slice(0, 40)));
    add(key, "Responsive", `${w}px: no page-level horizontal scroll, table scrolls inside its box`, docW <= w + 1 && scroller, `document width ${docW}px, table scrolls: ${scroller}${docW > w + 1 ? `, overflowing: ${wide.join(", ")}` : ""}`, "Low");
    await p2.goto(`${BASE_URL}/admin/goals/new`, { waitUntil: "networkidle" });
    const save = p2.getByRole("button", { name: "Save Goal" });
    await save.scrollIntoViewIfNeeded();
    add(key, "Responsive", `${w}px: Save Goal reachable`, await save.isVisible(), "visible after scroll", "Low");
    await c2.close();
  }
}

async function viewerChecks(browser) {
  const key = "BeOnTime";
  const sess = await login("viewer.beontime@crm-test.local");
  const { context, page } = await newSession(browser, sess, undefined, "viewer");
  await page.goto(`${BASE_URL}/staff/goals`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const newBtn = await page.getByRole("button", { name: /new goal/i }).count();
  const bulk = await page.getByRole("button", { name: /bulk actions/i }).count();
  const rowBtns = await page.locator("tbody tr").first().locator("td:last-child button").count();
  add(key, "Permissions UI", "view-only staff sees no New Goal / Bulk / Edit / Delete", newBtn === 0 && bulk === 0 && rowBtns <= 1, `New Goal ${newBtn}, Bulk ${bulk}, row buttons ${rowBtns} (eye+edit+delete=3)`, "High");
  if (newBtn) {
    await page.getByRole("button", { name: /new goal/i }).click();
    await page.waitForTimeout(1200);
    add(key, "Staff routes", "staff 'New Goal' opens /staff/goals/new", /\/staff\/goals\/new/.test(page.url()), `went to ${page.url()} (hard-coded /admin/goals/new → bounced)`, "Medium");
  }
  const w = await api(sess.token, "POST", "/api/goals", { subject: "viewer made", goal_type: "total_income", staff_member: sess.user._id, achievement: "1", start_date: "2026-11-01", end_date: "2026-11-02" });
  add(key, "Permissions API", "view-only staff POST /api/goals → 403", w.status === 403, `got ${w.status}`, "High");
  await context.close();
}

async function planChecks(browser) {
  const sess = await login("admin@nogoals.test");
  const { context, page } = await newSession(browser, sess, undefined, "NoGoalsPlan");
  await page.goto(`${BASE_URL}/admin/goals`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const msg = await page.getByText("Not included in your plan").count();
  add("NoGoalsPlan", "Plan gate", "/admin/goals shows 'Not included in your plan'", msg > 0, `message count ${msg}`, "Medium");
  const r = await api(sess.token, "GET", "/api/goals");
  add("NoGoalsPlan", "Plan gate", "/api/goals → 403 MODULE_DISABLED", r.status === 403 && r.body?.code === "MODULE_DISABLED", `${r.status} ${r.body?.code}`, "Medium");
  const sideGoal = await page.locator("aside a[href$='/goals'], nav a[href$='/goals']").count();
  add("NoGoalsPlan", "Plan gate", "sidebar Goals link hidden", sideGoal === 0, `links ${sideGoal}`, "Low");
  const quick = await page.locator("a[href$='/goals/new']").count();
  add("NoGoalsPlan", "Plan gate", "top navbar quick-create 'Goal' hidden (no /goals/new link in DOM)", quick === 0, `links ${quick} (quick-create menu closed)`, "Low");
  await context.close();
}

async function crashCheck(browser) {
  const sess = await login("admin@crashcheck.test");
  const { context, page } = await newSession(browser, sess, undefined, "CrashCheck");
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.goto(`${BASE_URL}/admin/goals`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const h1 = await page.locator("h1", { hasText: "Goals" }).count();
  add("CrashCheck", "List", "a goal with no start_date in the DB does not crash the page", h1 > 0 && !errs.length, `h1 present ${h1 > 0}, page errors: ${errs.join("; ").slice(0, 120)}`, "Medium");
  await context.close();
}

(async () => {
  const health = await fetch(`${API_URL}/api/health`).then((r) => r.json());
  if (!String(health.uri).startsWith("mongodb://127.0.0.1")) throw new Error("GUARD: backend is not on in-memory DB");
  console.log("[GUARD] backend", JSON.stringify(health));

  // Bundled browser first; fall back to the installed Chrome if Playwright's download is missing.
  const browser = await chromium.launch({ headless: true }).catch(() => chromium.launch({ headless: true, channel: "chrome" }));
  const sessions = {};
  for (const [key, email] of TENANTS) sessions[key] = await perTenant(browser, key, email);
  try { await deepChecks(browser, sessions.BeOnTime); } catch (e) { add("BeOnTime", "Flow", "deep checks completed", false, e.message.slice(0, 200), "High"); }
  for (const s of Object.values(sessions)) await s.context.close();
  try { await viewerChecks(browser); } catch (e) { add("BeOnTime", "Flow", "viewer checks completed", false, e.message.slice(0, 200), "High"); }
  try { await planChecks(browser); } catch (e) { add("NoGoalsPlan", "Flow", "plan checks completed", false, e.message.slice(0, 200), "High"); }
  try { await crashCheck(browser); } catch (e) { add("CrashCheck", "Flow", "crash check completed", false, e.message.slice(0, 200), "High"); }
  await browser.close();

  // Guard: every request is to :5173 (page/assets) or :5101 (API); none to :5001 / :5183.
  const hosts = [...new Set(allRequests.map((u) => { try { return new URL(u).host; } catch { return u.slice(0, 30); } }))];
  const apiHosts = [...new Set(allRequests.filter((u) => u.includes("/api/")).map((u) => new URL(u).host))];
  add("ALL", "Guard", "all /api calls go to 127.0.0.1:5101 (direct or via the :5173 vite proxy), none to :5001/:5183", apiHosts.every((h) => h === "127.0.0.1:5101" || h === "127.0.0.1:5173") && !allRequests.some((u) => /:(5001|5183)\b/.test(u)), `api hosts ${JSON.stringify(apiHosts)}; all hosts ${JSON.stringify(hosts)}; requests ${allRequests.length}`, "High");
  const goalsBad = badResponses.filter((r) => /\/api\/(goals|staff|auth)/.test(r.url));
  const stackBad = badResponses.filter((r) => !/\/api\/(goals|staff|auth)/.test(r.url));
  add("ALL", "Network", "no unexpected 4xx/5xx on goals/staff/auth APIs", goalsBad.every((r) => r.tag === "NoGoalsPlan" || (r.status === 404 && /goals\//.test(r.url))), JSON.stringify(goalsBad.slice(0, 6)), "Medium");
  // 404s from app-shell APIs this stack does not mount are a stack limitation; the rest are real.
  const realErrors = consoleErrors.filter((e) => !/Failed to load resource: the server responded with a status of 404/.test(e));
  add("ALL", "Console", "zero red console errors (excluding 404s from APIs not mounted in this stack)", realErrors.length === 0, `${consoleErrors.length} total, ${realErrors.length} real; e.g. ${[...new Set(realErrors.map((e) => e.replace(/^S+ /, "")))].slice(0, 6).join(" || ")}`, "Low");
  const via5173 = [...new Set(allRequests.filter((u) => u.startsWith("http://127.0.0.1:5173/api/")).map((u) => u.split("?")[0]))];
  console.log("API calls via the :5173 vite proxy (→ :5101):", via5173.slice(0, 10));
  fs.writeFileSync(OUT, JSON.stringify({ results, consoleErrors: [...new Set(consoleErrors.map((e) => e.replace(/^S+ /, "")))], badResponses: { goalsBad, stackBadCount: stackBad.length, stackBadSample: [...new Set(stackBad.map((r) => r.url.split("?")[0]))].slice(0, 15) }, apiHosts, hosts }, null, 2));
  const pass = results.filter((r) => r.passed).length;
  console.log(`\nUI RESULTS: ${results.length} checks, ${pass} passed, ${results.length - pass} failed → ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });
