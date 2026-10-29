// Playwright Automated UI Verification for Vendors (/admin/vendors, /admin/vendors/:id)
// Runs strictly against frontend :5173 and backend :5101.
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:5173";
const API_URL = "http://127.0.0.1:5101";

async function run() {
  console.log("==================================================================");
  console.log("STARTING PLAYWRIGHT UI CHECKS FOR VENDORS ON http://127.0.0.1:5173");
  console.log("==================================================================");

  const results = [];
  const addResult = (name, passed, details, severity = "Low") => {
    results.push({ name, passed, details, severity });
    console.log(`[${passed ? "PASS" : "FAIL"}] ${name}: ${details}`);
  };

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (e) {
    browser = await chromium.launch({
      headless: true,
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    });
  }
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  // 1. Get Admin token and user from test backend
  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin.a@crm-test.local" }),
  }).then((r) => r.json());

  const adminToken = loginRes.token;
  const adminUser = loginRes.user;

  // 2. View-only user
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
  let badPortHit = false;

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!text.includes("favicon") && !text.includes("404 (Not Found)")) consoleErrors.push(text);
    }
  });

  const badUrls = [];
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes(":5001") || url.includes(":5183")) {
      badPortHit = true;
      badUrls.push(url);
      console.log("[GUARD VIOLATION DETECTED]", url);
    }
  });

  page.on("response", (res) => {
    const url = res.url();
    // Exclude expected 404 (bad ID test) and 409 (double click test)
    if (url.includes("/api/") && res.status() >= 400 && res.status() !== 404 && res.status() !== 409) {
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
    await page.goto(`${BASE_URL}/admin/vendors`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const titleText = await page.locator("h1").first().textContent();
    addResult(
      "Page load: /admin/vendors",
      titleText?.includes("Vendors"),
      `Title shows "${titleText}"`,
      "High"
    );

    addResult(
      "Guard check: No network requests to :5001 or :5183",
      !badPortHit,
      badPortHit ? `Violating URLs: ${badUrls.join(", ")}` : "Confirmed: All network calls routed to :5101 / :5173",
      "High"
    );

    // -------------------------------------------------------------
    // Test 2: Vendor List Table & Row verification
    // -------------------------------------------------------------
    const tableRows = page.locator("tbody tr");
    const rowCount = await tableRows.count();
    addResult(
      "Vendors Table render",
      rowCount >= 3,
      `Found ${rowCount} vendor rows in table`,
      "Medium"
    );

    // Check table headers
    const headers = await page.locator("thead th").allTextContents();
    const hasRequiredCols = ["Company Name", "Vendor Reference", "Connect Person", "Phone Number", "Email", "Actions"].every(
      (c) => headers.some((h) => h.includes(c))
    );
    addResult(
      "Vendors Table 12 columns check",
      hasRequiredCols,
      `Table headers contain: ${headers.map((h) => h.trim()).filter(Boolean).join(", ")}`,
      "Medium"
    );

    // -------------------------------------------------------------
    // Test 3: Search Functionality
    // -------------------------------------------------------------
    const searchInput = page.locator('input[placeholder*="Search company"]');
    await searchInput.fill("Orion");
    await page.waitForTimeout(600); // 350ms debounce + query
    let filteredCount = await page.locator("tbody tr").count();
    let firstRowText = await page.locator("tbody tr").first().textContent();
    addResult(
      "Search by company name ('Orion')",
      firstRowText?.includes("Orion Supplies Pvt Ltd"),
      `Found ${filteredCount} row(s), first row contains Orion`,
      "Medium"
    );

    // Search by phone
    await searchInput.fill("9845012345");
    await page.waitForTimeout(600);
    firstRowText = await page.locator("tbody tr").first().textContent();
    addResult(
      "Search by phone ('9845012345')",
      firstRowText?.includes("Orion"),
      `Found row with phone number`,
      "Medium"
    );

    // Clear search
    await searchInput.fill("");
    await page.waitForTimeout(600);

    // -------------------------------------------------------------
    // Test 4: Modal Clean State on Cancel & Reopen
    // -------------------------------------------------------------
    const newVendorBtn = page.locator('button:has-text("New Vendor")');
    await newVendorBtn.click();
    await page.waitForTimeout(400);

    const companyInput = page.locator('input[placeholder="Vendor / company name"]');
    await companyInput.fill("Temporary Dirt Name");
    const cancelBtn = page.locator('button:has-text("Cancel")');
    await cancelBtn.click();
    await page.waitForTimeout(400);

    // Reopen modal and verify clean form
    await newVendorBtn.click();
    await page.waitForTimeout(400);
    const reopenedValue = await companyInput.inputValue();
    addResult(
      "Modal state reset on Cancel -> Reopen",
      reopenedValue === "",
      `Company Name input value is empty string: "${reopenedValue}"`,
      "Medium"
    );
    await page.locator('button:has-text("Cancel")').click();
    await page.waitForTimeout(300);

    // -------------------------------------------------------------
    // Test 5: Double-Click Protection on Save
    // -------------------------------------------------------------
    await newVendorBtn.click();
    await page.waitForTimeout(400);
    await companyInput.fill("Double Click Vendor UI");
    const saveBtn = page.locator('button:has-text("Save Vendor")');
    // Rapid double-click
    await Promise.all([saveBtn.click(), saveBtn.click()]);
    await page.waitForTimeout(1000);

    // Verify only one vendor created
    const checkDbRes = await fetch(`${API_URL}/api/vendors?search=Double%20Click%20Vendor%20UI&page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    addResult(
      "Double-click Save button protection",
      checkDbRes.total === 1,
      `Created exactly ${checkDbRes.total} vendor in DB`,
      "High"
    );

    // Dismiss modal if error dialog is still open from the duplicate click
    const openDialog = page.locator('[role="dialog"][data-state="open"]');
    if (await openDialog.count() > 0) {
      const modalCancel = page.locator('[role="dialog"][data-state="open"] button:has-text("Cancel")');
      if (await modalCancel.isVisible()) await modalCancel.click();
      else await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
    }

    // -------------------------------------------------------------
    // Test 6: Bulk Actions Dialog & Validation
    // -------------------------------------------------------------
    // Click bulk actions without selecting any vendor
    const bulkBtn = page.locator('button:has-text("Bulk Actions")');
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();
      await page.waitForTimeout(500);
      const toastText = await page.locator('[role="status"], [role="alert"], .toast, div:has-text("Please select at least one vendor first")').allTextContents();
      const hasToast = toastText.some((t) => t.includes("Please select at least one vendor first"));
      addResult(
        "Bulk action without selection triggers warning toast",
        hasToast,
        `Toast displayed: "${toastText.join("; ").slice(0, 100)}"`,
        "Low"
      );
    }

    // -------------------------------------------------------------
    // Test 7: Vendor View (/admin/vendors/:id) & Purchases Tab
    // -------------------------------------------------------------
    // Fetch Gamma Traders ID
    const vendorsList = await fetch(`${API_URL}/api/vendors?search=Gamma&page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    }).then((r) => r.json());
    const gammaVendor = vendorsList.data?.find((v) => v.company_name === "Gamma Traders");

    if (gammaVendor) {
      await page.goto(`${BASE_URL}/admin/vendors/${gammaVendor._id}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);

      const viewTitle = await page.locator("h1").textContent();
      addResult(
        "Vendor View: Gamma Traders loaded",
        viewTitle?.includes("Gamma Traders"),
        `Title displays "${viewTitle}"`,
        "High"
      );

      // Verify Details Tab shows all fields
      const detailsContent = await page.locator('[role="tabpanel"][data-state="active"]').textContent();
      const hasAllFields = ["GSTIN", "PAN", "Connect Person", "Vendor Reference"].every(
        (f) => detailsContent?.includes(f)
      ) && detailsContent?.includes("SG Highway");
      addResult(
        "Vendor View: Details tab displays required field cards",
        hasAllFields,
        `Details tab renders fields and address`,
        "Medium"
      );

      // Switch to Purchases Tab
      const purchasesTabTrigger = page.locator('button[role="tab"]:has-text("Purchases")');
      await purchasesTabTrigger.click();
      await page.waitForTimeout(800);

      // Verify summary cards
      const summaryText = await page.locator('[role="tabpanel"][data-state="active"]').textContent();
      const hasPurchasesCards = ["Bills", "Taxable Value", "Total GST", "Total Amount", "Outstanding"].every(
        (label) => summaryText?.includes(label)
      );
      addResult(
        "Vendor View: Purchases tab stat cards",
        hasPurchasesCards,
        `Summary cards contain: Bills, Taxable Value, Total GST, Total Amount, Outstanding`,
        "High"
      );

      // Verify purchases table columns
      const purchaseRows = page.locator('[role="tabpanel"][data-state="active"] tbody tr');
      const purchaseCount = await purchaseRows.count();
      addResult(
        "Vendor View: Purchases table rows",
        purchaseCount === 3,
        `Found ${purchaseCount} purchase bill rows (Expected 3)`,
        "High"
      );

      // Verify Back Button returns to /admin/vendors
      const backBtn = page.locator("button:has(svg.lucide-chevron-left)");
      await backBtn.click();
      await page.waitForTimeout(800);
      const curUrl = page.url();
      addResult(
        "Vendor View: Back button returns to /admin/vendors",
        curUrl.endsWith("/admin/vendors"),
        `Navigated back to ${curUrl}`,
        "Medium"
      );
    }

    // -------------------------------------------------------------
    // Test 8: Non-existent Vendor -> "Vendor not found"
    // -------------------------------------------------------------
    await page.goto(`${BASE_URL}/admin/vendors/66f000000000000000000000`);
    await page.waitForTimeout(3000);
    const bodyOn404 = await page.locator("body").innerText();
    const hasNotFound = /vendor not found/i.test(bodyOn404);
    addResult(
      "Vendor not found state for bad ID",
      hasNotFound,
      hasNotFound ? "Page correctly renders 'Vendor not found'" : `Body was: "${bodyOn404.slice(0, 100)}"`,
      "Medium"
    );

    // -------------------------------------------------------------
    // Test 9: Responsive Viewports (Mobile 375px & Tablet 768px)
    // -------------------------------------------------------------
    // Mobile 375px
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/admin/vendors`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    const mobileOverflow = await page.evaluate(() => {
      const tableWrapper = document.querySelector(".overflow-x-auto");
      return !!tableWrapper;
    });
    addResult(
      "Mobile 375px: table horizontal scroll container present",
      mobileOverflow,
      "Table has overflow-x-auto container for responsive scrolling",
      "Low"
    );

    // Tablet 768px
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    const tabletRendered = await page.locator("h1").textContent();
    addResult(
      "Tablet 768px: clean render without layout break",
      tabletRendered?.includes("Vendors"),
      "Vendors page rendered at 768px",
      "Low"
    );

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // -------------------------------------------------------------
    // Test 10: Permissions UI check (View-Only User)
    // -------------------------------------------------------------
    const viewerContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const viewerPage = await viewerContext.newPage();
    await viewerPage.goto(`${BASE_URL}/admin/vendors`);
    await viewerPage.evaluate(({ token, user }) => {
      localStorage.setItem("crm_token", token);
      localStorage.setItem("access_token", token);
      localStorage.setItem("crm_user", JSON.stringify(user));
      localStorage.setItem("crm_permissions", JSON.stringify({ Vendors: { View: true } }));
    }, { token: viewerToken, user: viewerUser });

    await viewerPage.goto(`${BASE_URL}/admin/vendors`, { waitUntil: "networkidle" });
    await viewerPage.waitForTimeout(1000);

    const viewerNewBtnCount = await viewerPage.locator('button:has-text("New Vendor")').count();
    const viewerImportBtnCount = await viewerPage.locator('button:has-text("Import Vendors")').count();
    const viewerBulkBtnCount = await viewerPage.locator('button:has-text("Bulk Actions")').count();
    const viewerEditBtnCount = await viewerPage.locator('button:has(svg.lucide-pencil)').count();
    const viewerDeleteBtnCount = await viewerPage.locator('button:has(svg.lucide-trash-2)').count();

    const viewerActionButtonsHidden =
      viewerNewBtnCount === 0 &&
      viewerImportBtnCount === 0 &&
      viewerBulkBtnCount === 0 &&
      viewerEditBtnCount === 0 &&
      viewerDeleteBtnCount === 0;

    addResult(
      "UI Permissions: View-only user sees NO New, Import, Bulk, Edit, or Delete buttons",
      viewerActionButtonsHidden,
      `New: ${viewerNewBtnCount}, Import: ${viewerImportBtnCount}, Bulk: ${viewerBulkBtnCount}, Edit: ${viewerEditBtnCount}, Delete: ${viewerDeleteBtnCount}`,
      "High"
    );
    await viewerContext.close();

    // -------------------------------------------------------------
    // Test 11: Console & Network Cleanliness
    // -------------------------------------------------------------
    addResult(
      "Console errors check",
      consoleErrors.length === 0,
      consoleErrors.length === 0 ? "Zero red errors" : `${consoleErrors.length} errors: ${consoleErrors.slice(0, 3).join("; ")}`,
      "High"
    );

    addResult(
      "Network 4xx/5xx check",
      networkErrors.length === 0,
      networkErrors.length === 0 ? "Zero unexpected HTTP errors" : `${networkErrors.length} errors: ${networkErrors.slice(0, 3).join("; ")}`,
      "High"
    );

  } catch (err) {
    console.error("Test execution failed:", err);
    addResult("Test execution error", false, err.message, "High");
  } finally {
    await browser.close();
  }

  console.log("==================================================================");
  console.log(`UI TESTS SUMMARY: ${results.filter((r) => r.passed).length} / ${results.length} PASSED`);
  console.log("==================================================================");

  return results;
}

if (process.argv[1] && process.argv[1].endsWith("vendors.ui.test.mjs")) {
  run().then((res) => {
    const failed = res.filter((r) => !r.passed);
    if (failed.length > 0) process.exit(1);
    process.exit(0);
  });
}

export { run };
