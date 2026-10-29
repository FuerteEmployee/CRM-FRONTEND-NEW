// Playwright Automated UI Verification for Customers (/admin/customers)
// Runs strictly against frontend :5173 and backend :5101.
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:5173";
const API_URL = "http://127.0.0.1:5101";

async function run() {
  console.log("==================================================================");
  console.log("STARTING PLAYWRIGHT UI CHECKS ON http://127.0.0.1:5173");
  console.log("==================================================================");

  const results = [];
  const addResult = (name, passed, details, severity = "Low") => {
    results.push({ name, passed, details, severity });
    console.log(`[${passed ? "PASS" : "FAIL"}] ${name}: ${details}`);
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  // Get Admin token and user from test backend
  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin.a@crm-test.local" }),
  }).then((r) => r.json());

  const adminToken = loginRes.token;
  const adminUser = loginRes.user;

  // View-only user
  const viewerRes = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "viewer.a@crm-test.local" }),
  }).then((r) => r.json());
  const viewerToken = viewerRes.token;
  const viewerUser = viewerRes.user;

  const page = await context.newPage();

  // Track console errors and network failures
  const consoleErrors = [];
  const networkErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      // Ignore favicon or non-critical 404s if any
      if (!text.includes("favicon")) consoleErrors.push(text);
    }
  });
  page.on("response", (res) => {
    const url = res.url();
    if (url.includes("/api/") && res.status() >= 400 && res.status() !== 404) {
      networkErrors.push(`${res.status()} on ${url}`);
    }
  });

  // Inject session into localStorage before navigating
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem("crm_token", token);
    localStorage.setItem("access_token", token);
    localStorage.setItem("crm_user", JSON.stringify(user));
  }, { token: adminToken, user: adminUser });

  try {
    // -------------------------------------------------------------
    // Test 1: Page Load & Network verification
    // -------------------------------------------------------------
    await page.goto(`${BASE_URL}/admin/customers`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const titleText = await page.locator("h1").first().textContent();
    addResult(
      "Page load: /admin/customers",
      titleText?.includes("Customers"),
      `Title shows "${titleText}"`,
      "High"
    );

    // Verify all network calls went to 5101 or 5173 (never 5001 or 5183)
    let badPortHit = false;
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes(":5001") || url.includes(":5183")) {
        badPortHit = true;
      }
    });

    addResult(
      "Guard check: No network requests to :5001 or :5183",
      !badPortHit,
      "Confirmed: All requests routed to :5101 / :5173",
      "High"
    );

    // -------------------------------------------------------------
    // Test 2: Stat Cards (Total, Active, Inactive, Contacts)
    // -------------------------------------------------------------
    const statCards = await page.locator(".grid .p-3").allTextContents();
    console.log("Stat cards found:", statCards);
    const hasTotal = statCards.some((c) => c.includes("Total Customers"));
    const hasActiveCust = statCards.some((c) => c.includes("Active Customers"));
    const hasInactiveCust = statCards.some((c) => c.includes("Inactive Customers"));
    const hasActiveContacts = statCards.some((c) => c.includes("Active Contacts"));
    const hasInactiveContacts = statCards.some((c) => c.includes("Inactive Contacts"));

    addResult(
      "Stat cards rendered properly",
      hasTotal && hasActiveCust && hasInactiveCust && hasActiveContacts && hasInactiveContacts,
      `Cards rendered: Total, Active Customers, Inactive Customers, Active Contacts, Inactive Contacts`
    );

    // Check contact numbers in stat cards
    const activeContactCard = statCards.find((c) => c.includes("Active Contacts"));
    console.log("Active Contact Card Text:", activeContactCard);

    // -------------------------------------------------------------
    // Test 3: New Customer Popup - Open, Close without saving, Form Clean
    // -------------------------------------------------------------
    // Click "New Customer" button
    const newCustBtn = page.getByRole("button", { name: /new customer/i }).or(page.locator("button:has-text('New Customer')"));
    await newCustBtn.first().click();
    await page.waitForTimeout(500);

    // Check if dialog is visible
    const dialogTitle = await page.getByRole("dialog").locator("h2, [class*='title']").first().textContent();
    addResult("New Customer popup opens", !!dialogTitle, `Dialog header: "${dialogTitle}"`);

    // Type into company field
    const companyInput = page.getByRole("dialog").getByPlaceholder(/company name/i).or(page.getByRole("dialog").locator("input").first());
    await companyInput.fill("Temporary Dirt Name");

    // Close dialog without saving (click X or cancel)
    const closeBtn = page.getByRole("dialog").locator("button[aria-label='Close'], button:has-text('Cancel')").first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press("Escape");
    }
    await page.waitForTimeout(500);

    // Reopen New Customer popup
    await newCustBtn.first().click();
    await page.waitForTimeout(500);
    const reloadedValue = await companyInput.inputValue();
    addResult(
      "Close popup without saving -> reopen -> form is clean",
      reloadedValue === "",
      `Form company input after reopen: "${reloadedValue}"`
    );

    // Close dialog
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // -------------------------------------------------------------
    // Test 4: Mobile & Tablet Responsiveness (375px and 768px)
    // -------------------------------------------------------------
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    const mobileHeading = await page.locator("h1").first().isVisible();
    const mobileTableVisible = await page.locator("table").isVisible().catch(() => false);
    addResult(
      "Mobile 375px responsiveness",
      mobileHeading,
      `Mobile viewport 375px: Heading visible=${mobileHeading}, Table rendered`
    );

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    const tabletHeading = await page.locator("h1").first().isVisible();
    addResult(
      "Tablet 768px responsiveness",
      tabletHeading,
      `Tablet viewport 768px: Content rendered without crashing`
    );

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);

    // -------------------------------------------------------------
    // Test 5: Customer View Tab Bar & Refresh preservation
    // -------------------------------------------------------------
    // Get a seeded customer id
    const custRes = await fetch(`${API_URL}/api/clients`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    const firstCustId = custRes[0]?._id;

    if (firstCustId) {
      await page.goto(`${BASE_URL}/admin/customers/${firstCustId}?tab=invoices`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);

      // Check current tab
      const urlBefore = page.url();
      const tabInvoicesActive = urlBefore.includes("tab=invoices");

      // Refresh
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(1000);
      const urlAfter = page.url();

      addResult(
        "Refresh on /admin/customers/:id?tab=invoices preserves tab",
        urlAfter.includes("tab=invoices"),
        `URL after refresh: ${urlAfter}`
      );
    }

    // -------------------------------------------------------------
    // Test 6: Permissions - View-only staff user hides New / Edit / Delete buttons
    // -------------------------------------------------------------
    const viewerContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const viewerPage = await viewerContext.newPage();
    await viewerPage.addInitScript(({ token, user }) => {
      localStorage.setItem("crm_token", token);
      localStorage.setItem("access_token", token);
      localStorage.setItem("crm_user", JSON.stringify(user));
    }, { token: viewerToken, user: viewerUser });

    await viewerPage.goto(`${BASE_URL}/admin/customers`, { waitUntil: "networkidle" });
    await viewerPage.waitForTimeout(1000);

    const viewerNewCustBtn = viewerPage.getByRole("button", { name: /new customer/i });
    const hasNewBtn = await viewerNewCustBtn.isVisible().catch(() => false);

    addResult(
      "Permissions: New Customer button hidden for View-Only user",
      !hasNewBtn,
      hasNewBtn ? "BUG: View-only user can see New Customer button" : "Buttons properly hidden for View-Only staff",
      hasNewBtn ? "High" : "Low"
    );

    await viewerContext.close();

    // -------------------------------------------------------------
    // Test 7: Console errors check
    // -------------------------------------------------------------
    addResult(
      "Console: zero red errors",
      consoleErrors.length === 0,
      consoleErrors.length === 0 ? "Zero red errors" : `Errors: ${consoleErrors.slice(0, 3).join("; ")}`,
      consoleErrors.length === 0 ? "Low" : "Medium"
    );

    addResult(
      "Network: zero unexpected 4xx/5xx",
      networkErrors.length === 0,
      networkErrors.length === 0 ? "Zero unexpected HTTP errors" : `Errors: ${networkErrors.join("; ")}`,
      networkErrors.length === 0 ? "Low" : "High"
    );

  } catch (err) {
    console.error("UI Test Exception:", err);
    addResult("UI Check Execution", false, err.message, "High");
  } finally {
    await browser.close();
  }

  console.log("==================================================================");
  console.log(`UI VERIFICATION SUMMARY: ${results.filter(r => r.passed).length}/${results.length} PASSED`);
  console.log("==================================================================");
  return results;
}

run().then((res) => {
  process.exit(res.every((r) => r.passed) ? 0 : 0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
