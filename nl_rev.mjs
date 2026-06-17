import { chromium } from 'playwright';
const BASE = 'http://43.132.228.109';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 920 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3500);
// Expand sidebar + open Clients group flyout
await page.locator('.sidebar').hover();
await page.waitForTimeout(400);
await page.locator('.navGroup').first().hover();
await page.waitForTimeout(400);
await page.screenshot({ path: 'rev_nav.png' });
// Go to Review
await page.locator('.navGroupTrigger', { hasText: 'Clients' }).first().click();
await page.waitForTimeout(300);
await page.locator('.navFlyoutItem', { hasText: 'Review' }).first().click();
await page.waitForTimeout(3000);
await page.screenshot({ path: 'rev_page.png', fullPage: true });
await browser.close();
