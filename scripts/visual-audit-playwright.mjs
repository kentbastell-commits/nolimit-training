import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.AUDIT_BASE_URL || "https://trainnolimit.com";
const outputDir = path.resolve(
  process.env.AUDIT_OUTPUT_DIR || path.join("test-results", "pilot-visual-audit")
);
const settleMs = Number(process.env.AUDIT_SETTLE_MS || 5_000);
await mkdir(outputDir, { recursive: true });

const defaultRoutes = [
  "Clients",
  "Review",
  "Teams",
  "Coaches",
  "Orders",
  "Revenue",
  "Library",
  "Workouts",
  "Digital",
  "Tests",
  "Check-ins",
];
const requestedRoutes = (process.env.AUDIT_ROUTES || "")
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);
const routes = requestedRoutes.length ? requestedRoutes : defaultRoutes;

const profiles = [
  {
    name: "desktop",
    context: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  },
  {
    name: "mobile",
    context: { ...devices["iPhone 13"] },
  },
];

const findings = [];
const browser = await chromium.launch({ headless: true });

for (const profile of profiles) {
  const context = await browser.newContext(profile.context);
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  for (const route of routes) {
    consoleErrors.length = 0;
    const url = `${baseURL}/?view=coach&page=${encodeURIComponent(route)}`;
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(settleMs);

    const metrics = await page.evaluate(() => {
      const visible = (el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
      };
      const interactive = [...document.querySelectorAll("button, a, input, select, textarea, [role='button']")]
        .filter(visible)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            label: (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
            width: Math.round(r.width),
            height: Math.round(r.height),
          };
        });
      const clippedText = [...document.querySelectorAll("body *")]
        .filter((el) => visible(el) && el.children.length === 0 && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2))
        .map((el) => ({
          tag: el.tagName.toLowerCase(),
          className: String(el.className || "").slice(0, 100),
          text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100),
          client: [el.clientWidth, el.clientHeight],
          scroll: [el.scrollWidth, el.scrollHeight],
        }))
        .slice(0, 30);
      return {
        title: document.title,
        bodyText: document.body.innerText.slice(0, 500),
        viewport: [innerWidth, innerHeight],
        documentSize: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2,
        headings: [...document.querySelectorAll("h1,h2,h3")].filter(visible).map((el) => el.textContent?.trim()).filter(Boolean).slice(0, 20),
        smallTargets: interactive.filter((item) => item.width < 40 || item.height < 40).slice(0, 40),
        clippedText,
        gateVisible: Boolean(document.querySelector(".coachKeyGate")),
      };
    });

    const slug = route.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    await page.screenshot({
      path: path.join(outputDir, `${profile.name}-${slug}-top.png`),
      animations: "disabled",
    });
    if (["Clients", "Review", "Library", "Workouts", "Digital"].includes(route)) {
      await page.screenshot({
        path: path.join(outputDir, `${profile.name}-${slug}-full.png`),
        fullPage: true,
        animations: "disabled",
      });
    }

    findings.push({
      profile: profile.name,
      route,
      status: response?.status(),
      consoleErrors: [...new Set(consoleErrors)].slice(0, 20),
      ...metrics,
    });
  }

  await context.close();
}

await browser.close();
await writeFile(path.join(outputDir, "metrics.json"), JSON.stringify(findings, null, 2));
console.log(`Visual audit written to ${outputDir}`);
