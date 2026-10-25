import { chromium } from "playwright";
import { mkdir } from "fs/promises";

const phase = process.argv[2] || "before";
const BASE = process.argv[3] || "https://quillbench.netlify.app/";
const OUT = `/workspace/books/screens-visual-revamp/${phase}`;
const SESSION_KEY = "quillbench.session.v1";

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

await page.goto(BASE, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/landing.png`, fullPage: false });
console.log("wrote landing.png");

await page.evaluate((key) => {
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem(
    key,
    JSON.stringify({
      userId: "local-visual-revamp",
      displayName: "Visual Revamp",
      email: "visual@example.com",
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

await page.keyboard.press("Escape");
await page.waitForTimeout(250);
await page.screenshot({ path: `${OUT}/wip.png`, fullPage: false });
console.log("wrote wip.png");

const startDraft = page
  .locator("main.library button:has-text('Start a draft'), main.library button:has-text('New book')")
  .first();
if (await startDraft.count()) {
  await startDraft.click({ force: true });
  await page.waitForTimeout(400);
} else {
  await page.locator("button.bench-drawer-toggle").click();
  await page.waitForTimeout(300);
  await page.locator('button.bench-nav-item:has-text("Saved")').click();
  await page.waitForTimeout(200);
  await page
    .locator("button.bench-panel-primary, button.bench-panel-action:has-text('New book')")
    .first()
    .click({ force: true });
  await page.waitForTimeout(400);
}

if (await page.locator("#title").count()) {
  await page.locator("#title").fill("Visual Revamp Sample");
  await page.locator('button:has-text("Create draft")').click();
  await page.waitForTimeout(900);
}
if (await page.locator(".book-card").count()) {
  await page.locator(".book-card").first().click();
  await page.waitForTimeout(800);
}

const writeMod = page.locator('nav.modules button.mod:has-text("Write")').first();
if (await writeMod.count()) await writeMod.click();
await page.waitForTimeout(400);
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/write.png`, fullPage: false });
console.log("wrote write.png");

await browser.close();
console.log("done", OUT);
