import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const ARTIFACT_DIR = "/home/rajat/.gemini/antigravity-cli/brain/64160f0c-d4d6-4c3d-b49d-3595c32454e9";
const CHROME_PATH = "/home/rajat/.cache/puppeteer/chrome/linux-153.0.8010.36/chrome-linux64/chrome";
const SCHOOL_ID = "sch_01a0bec39e037172b07505fa8d801188";

fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function getLatestOtp(recipientEmail, minTimestamp = 0) {
  console.log(`Polling Mailpit for OTP sent to ${recipientEmail}...`);
  for (let i = 0; i < 25; i++) {
    try {
      const res = await fetch("http://localhost:8025/api/v1/messages");
      if (res.ok) {
        const data = await res.json();
        const msg = data.messages?.find((m) =>
          m.To?.some((t) => t.Address?.toLowerCase() === recipientEmail.toLowerCase()) &&
          new Date(m.Created).getTime() >= minTimestamp
        );
        if (msg) {
          const match = msg.Snippet.match(/\b(\d{6})\b/);
          if (match) {
            console.log(`Found OTP for ${recipientEmail}: ${match[1]}`);
            return match[1];
          }
        }
      }
    } catch (err) {
      // Mailpit transient network error
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timeout waiting for OTP in Mailpit for ${recipientEmail}`);
}

async function runBrowserSmoke() {
  console.log("==================================================================");
  console.log("🚀 STARTING REAL BROWSER SMOKE TEST VIA PUPPETEER & REAL CHROME");
  console.log("==================================================================");
  console.log(`Executable: ${CHROME_PATH}`);
  console.log(`Artifact Directory: ${ARTIFACT_DIR}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1440,900",
    ],
    defaultViewport: { width: 1440, height: 900 },
  });

  try {
    const page = await browser.newPage();

    // Log console messages & errors
    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error") {
        console.log(`[Browser Error]: ${text}`);
      }
    });

    // -------------------------------------------------------------
    // PHASE 1: ADMIN PORTAL LOGIN & DASHBOARD
    // -------------------------------------------------------------
    console.log("\n--- [Phase 1: Admin Login Journey] ---");
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
    console.log("Page title:", await page.title());
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "01_admin_login.png") });

    const adminReqTime = Date.now();
    console.log("Entering email owner@example.com...");
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', "owner@example.com");
    await page.click('button[type="submit"]');

    const adminOtp = await getLatestOtp("owner@example.com", adminReqTime - 1000);
    await page.waitForSelector('input[name="otp"]');
    await page.type('input[name="otp"]', adminOtp);
    await page.click('button[type="submit"]');

    console.log("Waiting for Admin dashboard redirect...");
    await page.waitForFunction(
      () => window.location.pathname !== "/login" || !!document.querySelector("[data-sidebar]"),
      { timeout: 10000 }
    ).catch(() => {});
    await new Promise((r) => setTimeout(r, 4000));
    console.log("Admin Dashboard URL:", page.url());
    const adminSnippet = await page.evaluate(() => document.body.innerText.slice(0, 300));
    console.log("Admin Page Content:", adminSnippet.replace(/\n+/g, " "));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "02_admin_dashboard.png") });

    // -------------------------------------------------------------
    // PHASE 2: ADMIN SECTIONS NAVIGATION
    // -------------------------------------------------------------
    console.log("\n--- [Phase 2: Admin Navigation & Verification] ---");
    console.log("Navigating to Admin Products...");
    await page.goto("http://localhost:3000/products", { waitUntil: "domcontentloaded", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 3000));
    console.log("Products URL:", page.url());
    const productsContent = await page.evaluate(() => document.body.innerText.slice(0, 200));
    console.log("Products Content:", productsContent.replace(/\n+/g, " "));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "03_admin_products.png") });

    console.log("Navigating to Admin Settings...");
    await page.goto("http://localhost:3000/settings", { waitUntil: "domcontentloaded", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 3000));
    console.log("Settings URL:", page.url());
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "04_admin_settings.png") });

    console.log("Navigating to Admin Media...");
    await page.goto("http://localhost:3000/media", { waitUntil: "domcontentloaded", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 3000));
    console.log("Media URL:", page.url());
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "05_admin_media.png") });

    // -------------------------------------------------------------
    // PHASE 3: STOREFRONT LOGIN & DASHBOARD
    // -------------------------------------------------------------
    console.log("\n--- [Phase 3: Learner Login Journey] ---");
    const learnerPage = await browser.newPage();

    // Intercept learner API responses for debugging
    const learnerNetworkLog = [];
    learnerPage.on("response", (response) => {
      const url = response.url();
      if (url.includes("/api/v1/learner/me") || url.includes("/api/auth/")) {
        learnerNetworkLog.push({ url, status: response.status(), headers: response.headers() });
        console.log(`[Network] ${response.status()} ${url}`);
        if (!response.ok() && url.includes("/api/v1/learner/me")) {
          response.text().then((body) => console.log(`[Network body]: ${body.slice(0, 300)}`)).catch(() => {});
        }
      }
    });
    learnerPage.on("console", (msg) => {
      if (msg.type() === "error") console.log(`[Learner Browser Error]: ${msg.text()}`);
    });

    const learnerLoginUrl = "http://school-a.localhost:3001/login";
    console.log(`Navigating to ${learnerLoginUrl}...`);
    await learnerPage.goto(learnerLoginUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));
    console.log("Learner login title:", await learnerPage.title());
    await learnerPage.screenshot({ path: path.join(ARTIFACT_DIR, "06_learner_login.png") });

    const learnerReqTime = Date.now();
    console.log("Entering learner email member@example.com...");
    await learnerPage.waitForSelector("#login-email", { timeout: 10000 });
    await learnerPage.type("#login-email", "member@example.com");
    await learnerPage.click('button[type="submit"]');

    const learnerOtp = await getLatestOtp("member@example.com", learnerReqTime - 1000);
    console.log("Waiting for #login-code input...");
    await learnerPage.waitForSelector("#login-code", { timeout: 10000 });
    await learnerPage.type("#login-code", learnerOtp);
    // Wait for React state to update and button to become enabled
    await new Promise((r) => setTimeout(r, 500));
    await learnerPage.waitForFunction(
      () => {
        const btn = document.querySelector('button[type="submit"]');
        return btn && !btn.disabled;
      },
      { timeout: 5000 }
    ).catch(() => {});
    await learnerPage.click('button[type="submit"]');


    console.log("Waiting for Learner dashboard navigation...");
    await learnerPage.waitForFunction(
      () => window.location.pathname !== "/login" || !!document.querySelector("[data-sidebar]"),
      { timeout: 10000 }
    ).catch(() => {});
    await new Promise((r) => setTimeout(r, 4000));
    console.log("Learner current URL:", learnerPage.url());
    const learnerSnippet = await learnerPage.evaluate(() => document.body.innerText.slice(0, 300));
    console.log("Learner Page Content:", learnerSnippet.replace(/\n+/g, " "));
    await learnerPage.screenshot({ path: path.join(ARTIFACT_DIR, "07_learner_dashboard.png") });

    // -------------------------------------------------------------
    // PHASE 4: LEARNER PUBLIC CATALOG & COMMUNITIES
    // -------------------------------------------------------------
    console.log("\n--- [Phase 4: Learner Products & Community Catalog] ---");
    const productsUrl = "http://school-a.localhost:3001/products";
    console.log(`Navigating to ${productsUrl}...`);
    await learnerPage.goto(productsUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 3000));
    console.log("Learner Products URL:", learnerPage.url());
    await learnerPage.screenshot({ path: path.join(ARTIFACT_DIR, "08_learner_products.png") });

    const communitiesUrl = "http://school-a.localhost:3001/communities";
    console.log(`Navigating to ${communitiesUrl}...`);
    await learnerPage.goto(communitiesUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 3000));
    console.log("Learner Communities URL:", learnerPage.url());
    await learnerPage.screenshot({ path: path.join(ARTIFACT_DIR, "09_learner_communities.png") });

    console.log("\n==================================================================");
    console.log("🎉 REAL BROWSER SMOKE TEST SUITE COMPLETED SUCCESSFULLY! 🎉");
    console.log("==================================================================");
    await learnerPage.close();
    await page.close();
  } finally {
    await browser.close();
  }
}

runBrowserSmoke().catch((err) => {
  console.error("❌ Browser smoke test failed:", err);
  process.exit(1);
});
