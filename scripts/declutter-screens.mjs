import { chromium } from "playwright";
import { mkdir } from "fs/promises";

const phase = process.argv[2] || "after";
const BASE = process.argv[3] || "http://127.0.0.1:4173/";
const OUT = `/workspace/books/screens-declutter/${phase}`;
const SESSION_KEY = "quillbench.session.v1";

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

await page.goto(BASE, { waitUntil: "networkidle", timeout: 90000 });
await page.evaluate((key) => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem(
    key,
    JSON.stringify({
      userId: "local-declutter-probe",
      displayName: "Declutter Writer",
      email: "declutter@example.com",
      createdAt: new Date().toISOString(),
    }),
  );
}, SESSION_KEY);
await page.goto(BASE, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(700);

if (await page.locator(".landing, #landing-signin").count()) {
  const start = page
    .locator('button:has-text("Start on this device"), button:has-text("Start free")')
    .first();
  if (await start.count()) {
    await start.click();
    await page.waitForTimeout(1000);
  }
}

await page.screenshot({ path: `${OUT}/01-wip.png`, fullPage: false });
console.log("wrote 01-wip.png");

// Create book via main-surface Start a draft (visible), not drawer
const startDraft = page.locator("main.library button:has-text('Start a draft'), main.library button:has-text('New book')").first();
if (await startDraft.count()) {
  await startDraft.click({ force: true });
  await page.waitForTimeout(400);
} else {
  // open drawer Saved and click
  await page.locator("button.bench-drawer-toggle").click();
  await page.waitForTimeout(300);
  await page.locator('button.bench-nav-item:has-text("Saved")').click();
  await page.waitForTimeout(200);
  await page.locator("button.bench-panel-primary, button.bench-panel-action:has-text('New book')").first().click({ force: true });
  await page.waitForTimeout(400);
}

const title = page.locator("#title");
if (await title.count()) {
  await title.fill("Declutter Sample");
  await page.locator('button:has-text("Create draft")').click();
  await page.waitForTimeout(900);
}

if (await page.locator(".book-card").count()) {
  await page.locator(".book-card").first().click();
  await page.waitForTimeout(800);
}

// Ensure Write module
const writeMod = page.locator('nav.modules button.mod:has-text("Write")').first();
if (await writeMod.count()) await writeMod.click();
await page.waitForTimeout(400);

// Measure textarea top for CoS
const metrics = await page.evaluate(() => {
  const ta = document.querySelector("textarea.write-input, textarea.ms-input");
  const journey = document.querySelector("nav.journey");
  const modules = document.querySelector("nav.modules");
  const writeH2 = document.querySelector(".write-head h2");
  const r = ta ? ta.getBoundingClientRect() : null;
  return {
    textareaTop: r ? Math.round(r.top) : null,
    hasJourney: !!journey,
    hasModules: !!modules,
    hasWriteH2: !!writeH2,
    scanDetails: !!document.querySelector("details.scan-more"),
    scanPrimary: !!document.querySelector(".write-scan .btn-export.primary"),
  };
});
console.log("metrics", JSON.stringify(metrics));

await page.screenshot({ path: `${OUT}/02-write.png`, fullPage: false });
console.log("wrote 02-write.png");

// Scan CTA row
const scan = page.locator(".write-scan .btn-export.primary").first();
if (await scan.count()) {
  await scan.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
}
await page.screenshot({ path: `${OUT}/03-scan.png`, fullPage: false });
console.log("wrote 03-scan.png");

// Drawer closed already; open for Files sections
await page.locator("button.bench-drawer-toggle").click();
await page.waitForTimeout(450);
await page.screenshot({ path: `${OUT}/04-drawer-open.png`, fullPage: false });
console.log("wrote 04-drawer-open.png");

await page.locator('button.bench-nav-item:has-text("Files")').click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/05-drawer-files.png`, fullPage: false });
console.log("wrote 05-drawer-files.png");

await page.locator('button.bench-nav-item:has-text("Saved")').click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/06-drawer-saved.png`, fullPage: false });
console.log("wrote 06-drawer-saved.png");

await page.locator('button.bench-nav-item:has-text("Settings")').click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/07-drawer-settings.png`, fullPage: false });
console.log("wrote 07-drawer-settings.png");

await page.locator('button.bench-nav-item:has-text("Account")').click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/08-drawer-account.png`, fullPage: false });
console.log("wrote 08-drawer-account.png");

// Write with drawer closed again
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/09-write-drawer-closed.png`, fullPage: false });
console.log("wrote 09-write-drawer-closed.png");

await browser.close();
console.log("done", phase, BASE, metrics);
