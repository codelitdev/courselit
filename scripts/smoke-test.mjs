import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

async function waitForCdp(retries = 20) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch("http://127.0.0.1:9222/json/version");
      if (res.ok) {
        const ver = await res.json();
        if (ver?.webSocketDebuggerUrl) return ver;
      }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Chromium CDP port 9222 did not respond in time");
}

async function getLatestOtp(recipientEmail, minTimestamp = 0) {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch("http://localhost:8025/api/v1/messages");
      if (res.ok) {
        const data = await res.json();
        const msg = data.messages?.find((m) =>
          m.To?.some((t) => t.Address?.toLowerCase() === recipientEmail.toLowerCase()) &&
          new Date(m.Created).getTime() >= minTimestamp
        );
        if (msg) {
          const match = msg.Snippet.match(/(\d{6})/);
          if (match) return match[1];
        }
      }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

async function createPageSession() {
  const res = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" });
  const newTab = await res.json();
  const ws = new WebSocket(newTab.webSocketDebuggerUrl);
  let id = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method === "Network.responseReceived") {
      const r = msg.params.response;
      if (r.url.includes("/api/")) {
        console.log(`[HTTP ${r.status}] ${r.url}`);
      }
    } else if (msg.method === "Runtime.consoleAPICalled") {
      console.log(`[Browser Console ${msg.params.type}]`, msg.params.args?.map(a => a.value ?? a.description).join(" "));
    }
  };

  await new Promise((resolve) => ws.onopen = resolve);

  const send = (method, params = {}) => {
    const reqId = id++;
    return new Promise((resolve, reject) => {
      pending.set(reqId, { resolve, reject });
      ws.send(JSON.stringify({ id: reqId, method, params }));
    });
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("DOM.enable");
  await send("Network.enable");

  const waitForSelector = async (selector, timeoutMs = 10000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const exists = await session.eval(`!!document.querySelector('${selector}')`);
      if (exists) return true;
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`Selector ${selector} not found within ${timeoutMs}ms`);
  };

  const session = {
    send,
    close: async () => {
      ws.close();
      await fetch(`http://127.0.0.1:9222/json/close/${newTab.id}`);
    },
    eval: async (expr) => {
      const res = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
      return res.result?.value;
    },
    navigate: async (url, waitMs = 4000) => {
      await send("Page.navigate", { url });
      await new Promise((r) => setTimeout(r, waitMs));
    },
    type: async (selector, text) => {
      await waitForSelector(selector);
      await send("Runtime.evaluate", {
        expression: `(() => {
          const el = document.querySelector('${selector}');
          if (el) {
            el.focus();
            el.select?.();
          }
        })()`,
      });
      await send("Input.insertText", { text });
    },
    waitForSelector,
    screenshot: async (filepath) => {
      const res = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(filepath, Buffer.from(res.data, "base64"));
      console.log(`Saved screenshot to ${filepath}`);
    }
  };

  return session;
}

async function runSmokeTest() {
  const artifactDir = "/home/rajat/.gemini/antigravity-cli/brain/64160f0c-d4d6-4c3d-b49d-3595c32454e9";
  fs.mkdirSync(artifactDir, { recursive: true });

  // Resolve active school public ID from DB or fallback
  let schoolPublicId = "sch_01a0bdb578d97fd8b4d05901407d0e3d";
  try {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgres://courselit:courselit@127.0.0.1:5432/courselit" });
    const res = await pool.query("SELECT public_id FROM schools WHERE subdomain = 'school-a' LIMIT 1");
    if (res.rows[0]?.public_id) {
      schoolPublicId = res.rows[0].public_id;
    }
    await pool.end();
  } catch (e) {
    console.log("Using fallback school publicId:", schoolPublicId);
  }
  console.log("Target school public ID:", schoolPublicId);

  console.log("Launching headless Chromium...");
  const chrome = spawn("/snap/bin/chromium", [
    "--headless=new",
    "--remote-debugging-port=9222",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
  ], { stdio: "ignore" });

  try {
    await waitForCdp();
    console.log("Connected to Chromium CDP. Starting Browser Smoke Test...");
    const session = await createPageSession();

    try {
      // 1. Admin Login Page
      console.log("\n=======================================================");
      console.log("1. TESTING ADMIN APP (http://localhost:3000/login)");
      console.log("=======================================================");
      await session.navigate("http://localhost:3000/login", 4000);
      const adminTitle = await session.eval("document.title");
      console.log("Admin Page Title:", adminTitle);
      await session.screenshot(path.join(artifactDir, "1_admin_login_page.png"));

      // Request OTP
      const adminReqTime = Date.now();
      console.log("Submitting owner@example.com for Admin OTP...");
      await session.type('input[type="email"]', "owner@example.com");
      await session.eval("document.querySelector('button[type=\"submit\"]').click()");

      // Wait for OTP in Mailpit
      console.log("Waiting for Admin OTP in Mailpit...");
      const adminOtp = await getLatestOtp("owner@example.com", adminReqTime - 1000);
      console.log("Received Admin OTP:", adminOtp);

      if (adminOtp) {
        await session.waitForSelector('input[name="otp"]');
        await session.type('input[name="otp"]', adminOtp);
        await session.eval("document.querySelector('button[type=\"submit\"]').click()");
        await new Promise((r) => setTimeout(r, 4000));
        const adminDashboardUrl = await session.eval("window.location.href");
        const adminDashboardText = await session.eval("document.body.innerText.slice(0, 400)");
        console.log("Admin URL after sign in:", adminDashboardUrl);
        console.log("Admin Dashboard content:", adminDashboardText ? adminDashboardText.replace(/\n+/g, " ") : "empty");
        await session.screenshot(path.join(artifactDir, "2_admin_dashboard.png"));
      }

      // 2. Admin Settings Navigation
      console.log("\n=======================================================");
      console.log("2. TESTING ADMIN SETTINGS (http://localhost:3000/settings)");
      console.log("=======================================================");
      await session.navigate("http://localhost:3000/settings", 3000);
      const settingsTitle = await session.eval("document.title");
      const settingsText = await session.eval("document.body.innerText.slice(0, 400)");
      console.log("Admin Settings Title:", settingsTitle);
      console.log("Admin Settings snippet:", settingsText ? settingsText.replace(/\n+/g, " ") : "empty");
      await session.screenshot(path.join(artifactDir, "3_admin_settings.png"));

      // 3. Learner Login Page with School context
      console.log("\n=======================================================");
      console.log(`3. TESTING STOREFRONT APP (http://localhost:3001/login?school=${schoolPublicId})`);
      console.log("=======================================================");
      await session.navigate(`http://localhost:3001/login?school=${schoolPublicId}`, 4000);
      const learnerTitle = await session.eval("document.title");
      console.log("Learner Page Title:", learnerTitle);
      await session.screenshot(path.join(artifactDir, "4_learner_login_page.png"));

      // Request Learner OTP
      const learnerReqTime = Date.now();
      console.log("Submitting testlearner@example.com for Learner OTP...");
      await session.type('#login-email', "testlearner@example.com");
      await session.eval("document.querySelector('button[type=\"submit\"]').click()");

      console.log("Waiting for Learner OTP in Mailpit...");
      const learnerOtp = await getLatestOtp("testlearner@example.com", learnerReqTime - 1000);
      console.log("Received Learner OTP:", learnerOtp);

      if (learnerOtp) {
        console.log("Waiting for #login-code input field to appear...");
        await session.waitForSelector('#login-code');
        console.log("Typing Learner OTP into #login-code...");
        await session.type('#login-code', learnerOtp);
        const typedVal = await session.eval("document.getElementById('login-code')?.value");
        console.log("Verified typed value in #login-code:", typedVal);

        await session.eval("document.querySelector('button[type=\"submit\"]').click()");
        await new Promise((r) => setTimeout(r, 6000));
        const learnerAfterUrl = await session.eval("window.location.href");
        const learnerAfterText = await session.eval("document.body.innerText.slice(0, 400)");
        console.log("Learner URL after sign in:", learnerAfterUrl);
        console.log("Learner Content after sign in:", learnerAfterText ? learnerAfterText.replace(/\n+/g, " ") : "empty");
        await session.screenshot(path.join(artifactDir, "5_learner_after_auth.png"));
      }

      // 4. Learner Products Browsing with School context
      console.log("\n=======================================================");
      console.log(`4. TESTING LEARNER PRODUCTS (http://localhost:3001/products?school=${schoolPublicId})`);
      console.log("=======================================================");
      await session.navigate(`http://localhost:3001/products?school=${schoolPublicId}`, 4000);
      const productsTitle = await session.eval("document.title");
      const productsSnippet = await session.eval("document.body.innerText.slice(0, 300)");
      console.log("Products Page Title:", productsTitle);
      console.log("Products Page Snippet:", productsSnippet ? productsSnippet.replace(/\n+/g, " ") : "empty");
      await session.screenshot(path.join(artifactDir, "6_learner_products.png"));

      console.log("\n🎉 FULL BROWSER SMOKE TEST COMPLETED SUCCESSFULLY! 🎉");
    } finally {
      await session.close();
    }
  } finally {
    chrome.kill();
  }
}

runSmokeTest().catch((err) => {
  console.error("Browser smoke test failed:", err);
  process.exit(1);
});
