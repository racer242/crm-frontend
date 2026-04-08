/**
 * Screenshot script for CRM Platform
 *
 * Usage:
 *   node scripts/screenshot.js              # All pages (desktop)
 *   node scripts/screenshot.js /            # Specific page
 *   node scripts/screenshot.js --mobile     # Mobile viewport
 *   node scripts/screenshot.js /users --mobile
 *
 * Requires dev server running: npm run dev
 */

const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const BASE_URL = "http://localhost:3000";
const SCREENSHOTS_DIR = path.join(__dirname, "..", "screenshots");
const CHROME_PATHS = [
  // Windows
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Users\\racer\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe",
];

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 375, height: 812 },
};

const PAGES = [
  { path: "/", label: "dashboard" },
  { path: "/users", label: "users" },
  { path: "/orders", label: "orders" },
  { path: "/products", label: "products" },
  { path: "/reports", label: "reports" },
  { path: "/settings", label: "settings" },
];

async function findChrome() {
  for (const p of CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error(
    "Chrome not found. Set CHROME_PATH env variable or install Chrome.",
  );
}

async function takeScreenshot(pageUrl, label, viewport = "desktop") {
  const chromePath = await findChrome();
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  const vp = VIEWPORTS[viewport];
  await page.setViewport(vp);

  console.log(`📸 ${label} (${viewport})...`);
  await page.goto(pageUrl, { waitUntil: "networkidle0", timeout: 30000 });

  // Wait a bit for PrimeReact components to render
  await new Promise((r) => setTimeout(r, 2000));

  const screenshotPath = path.join(SCREENSHOTS_DIR, `${label}-${viewport}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  console.log(`   Saved: ${screenshotPath}`);
  await browser.close();
}

async function main() {
  const args = process.argv.slice(2);
  const isMobile = args.includes("--mobile");
  const viewport = isMobile ? "mobile" : "desktop";
  const specificPage = args.find((a) => a.startsWith("/"));

  // Create screenshots directory
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const pagesToCapture = specificPage
    ? PAGES.filter((p) => p.path === specificPage)
    : PAGES;

  if (pagesToCapture.length === 0) {
    console.error(`Page not found: ${specificPage}`);
    process.exit(1);
  }

  // Check if dev server is running
  try {
    const fetch = await import("node:http");
    await new Promise((resolve, reject) => {
      fetch.get(BASE_URL, resolve).on("error", reject);
    });
  } catch {
    console.error(`❌ Dev server not running at ${BASE_URL}`);
    console.error("   Run: npm run dev");
    process.exit(1);
  }

  console.log(
    `🚀 Capturing ${pagesToCapture.length} page(s) [${viewport}]...\n`,
  );

  for (const { path: pagePath, label } of pagesToCapture) {
    try {
      await takeScreenshot(`${BASE_URL}${pagePath}`, label, viewport);
    } catch (err) {
      console.error(`❌ Failed to capture ${label}: ${err.message}`);
    }
  }

  console.log("\n✅ Done! Screenshots saved to:", SCREENSHOTS_DIR);
}

main().catch(console.error);
