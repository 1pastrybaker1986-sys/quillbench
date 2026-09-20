import { chromium } from "playwright";
import { mkdir } from "fs/promises";

const BASE = process.argv[2] || "http://127.0.0.1:4173/";
const OUT = "/workspace/books/screens-declutter";
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function prep(page) {
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 90000 });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem(
      "quillbench.session.v1",
      JSON.stringify({
        userId: "local-menu-probe",
        displayName: "Menu Probe",
        email: "menu@example.com",
        createdAt: new Date().toISOString(),
      }),
    );
  });
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(600);
  const start = page
    .locator('button:has-text("Start on this device"), button:has-text("Start free")')
    .first();
  if (await start.count()) {
    await start.click();
    await page.waitForTimeout(800);
  }
  const startDraft = page
    .locator("main.library button:has-text('Start a draft'), main.library button:has-text('New book')")
    .first();
  if (await startDraft.count()) {
    await startDraft.click({ force: true });
    await page.waitForTimeout(350);
  } else {
    await page.locator("button.bench-drawer-toggle").click();
    await page.waitForTimeout(250);
    await page.locator('button.bench-nav-item:has-text("Saved")').click();
    await page.waitForTimeout(200);
    await page
      .locator("button.bench-panel-primary, button.bench-panel-action:has-text('New book')")
      .first()
      .click({ force: true });
    await page.waitForTimeout(350);
  }
  if (await page.locator("#title").count()) {
    await page.locator("#title").fill("Menu Control Book");
    await page.locator('button:has-text("Create draft")').click();
    await page.waitForTimeout(900);
  }
  if (await page.locator(".book-card").count()) {
    await page.locator(".book-card").first().click();
    await page.waitForTimeout(700);
  }
  const writeMod = page.locator('nav.modules button.mod:has-text("Write")').first();
  if (await writeMod.count()) await writeMod.click();
  await page.waitForTimeout(350);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
}

async function probe(page, label) {
  return page.evaluate((label) => {
    const btn = document.querySelector("button.bench-drawer-toggle");
    if (!btn) return { label, found: false };
    const r = btn.getBoundingClientRect();
    const cs = getComputedStyle(btn);
    return {
      label,
      found: true,
      text: (btn.textContent || "").replace(/\s+/g, " ").trim(),
      opacity: cs.opacity,
      visibility: cs.visibility,
      display: cs.display,
      zIndex: cs.zIndex,
      bg: cs.backgroundColor,
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      inView: r.width > 0 && r.height > 0 && r.x >= 0 && r.y >= 0 && r.x < innerWidth && r.y < innerHeight,
    };
  }, label);
}

async function run(viewport, closedPath, openPath, label) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: viewport.width < 500 ? 2 : 1,
    isMobile: viewport.width < 500,
    hasTouch: viewport.width < 500,
  });
  const page = await context.newPage();
  await prep(page);
  const closed = await probe(page, label + "-closed");
  console.log(JSON.stringify(closed));
  if (!closed.found || closed.opacity === "0" || closed.visibility === "hidden" || !closed.inView) {
    throw new Error(label + " control not visible: " + JSON.stringify(closed));
  }
  if (!/Menu/i.test(closed.text || "")) {
    throw new Error(label + " missing Menu label: " + closed.text);
  }
  await page.screenshot({ path: closedPath, fullPage: false });
  await page.locator("button.bench-drawer-toggle").click();
  await page.waitForTimeout(350);
  await page.screenshot({ path: openPath, fullPage: false });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  const afterEsc = await page.evaluate(() =>
    document.querySelector(".bench-shell")?.classList.contains("drawer-open"),
  );
  console.log(label, "afterEscOpen=", afterEsc);
  if (afterEsc) throw new Error(label + " Esc did not close drawer");
  await context.close();
}

await run(
  { width: 1440, height: 900 },
  `${OUT}/sidebar-control-closed.png`,
  `${OUT}/sidebar-control-open.png`,
  "desktop",
);
await run(
  { width: 390, height: 844 },
  `${OUT}/sidebar-control-phone-closed.png`,
  `${OUT}/sidebar-control-phone-open.png`,
  "phone",
);

await browser.close();
console.log("ok screens written");
