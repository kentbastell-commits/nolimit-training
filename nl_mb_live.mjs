import { chromium, devices } from 'playwright';
const BASE = 'http://43.132.228.109';
const browser = await chromium.launch();
const log = (...a) => console.log(...a);
const ctx = await browser.newContext(devices['iPhone 13']);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3500);

// Library group -> Programming
await page.locator('.navGroupTrigger', { hasText: 'Library' }).first().click();
await page.waitForTimeout(500);
await page.locator('.navFlyoutItem', { hasText: 'Programming' }).first().click();
await page.waitForTimeout(2000);
const pb = page.getByRole('button', { name: /Program Builder/i }).first();
if (await pb.count()) { await pb.click().catch(()=>{}); await page.waitForTimeout(1000); }

log('mobileBuilder present:', await page.locator('.mobileBuilder').count() > 0);
// Single Workout + name
await page.locator('.mbField select').first().selectOption('Single Workout').catch(()=>{});
await page.waitForTimeout(300);
await page.locator('.mbField input').first().fill('MB Verify');
await page.getByRole('button', { name: /^Next$/ }).first().click();
await page.waitForTimeout(600);

// Open picker
await page.getByRole('button', { name: /Add Exercise/i }).first().click();
await page.waitForTimeout(2500); // library load
const rows = await page.locator('.mobilePickerRow').count();
log('picker rows (live library):', rows);
// select first two
await page.locator('.mobilePickerRow').nth(0).click();
await page.locator('.mobilePickerRow').nth(1).click();
await page.waitForTimeout(300);
log('Add button label:', (await page.locator('.mbHeaderAction').innerText().catch(()=> '')).trim());
await page.screenshot({ path: 'mblive_picker.png' });
await page.locator('.mbHeaderAction').click(); // commit
await page.waitForTimeout(1200);

const cards = await page.locator('.mobileExerciseCard').count();
log('editor cards after commit:', cards);
const setRows = await page.locator('.mobileExerciseCard .builderSetTableRow').count();
log('set table rows present:', setRows);
// edit a set field (Reps) in first card
const firstReps = page.locator('.mobileExerciseCard').first().locator('.builderSetField input').nth(2);
if (await firstReps.count()) { await firstReps.fill('5'); }
// toggle each side on first card
await page.locator('.mobileExerciseCard .mbEachSide input').first().check().catch(()=>{});
// superset link (second group has the link button)
const ss = page.locator('.mobileSupersetLinkButton').first();
log('superset link button present:', await ss.count() > 0);
if (await ss.count()) { await ss.click(); await page.waitForTimeout(400); }
await page.screenshot({ path: 'mblive_editor.png' });

// Arrange + drag reorder
await page.getByRole('button', { name: /^Arrange$/ }).first().click();
await page.waitForTimeout(800);
const arrRows = await page.locator('.mobileArrangeRow').count();
log('arrange rows:', arrRows);
const namesBefore = await page.locator('.mobileArrangeName').allInnerTexts();
log('order before:', JSON.stringify(namesBefore));
// drag first handle down past second row
const h0 = await page.locator('.mobileArrangeHandle').nth(0).boundingBox();
const r1 = await page.locator('.mobileArrangeRow').nth(1).boundingBox();
if (h0 && r1) {
  await page.mouse.move(h0.x + h0.width/2, h0.y + h0.height/2);
  await page.mouse.down();
  await page.mouse.move(h0.x + h0.width/2, r1.y + r1.height + 6, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(500);
}
const namesAfter = await page.locator('.mobileArrangeName').allInnerTexts();
log('order after drag:', JSON.stringify(namesAfter));
log('order changed:', JSON.stringify(namesBefore) !== JSON.stringify(namesAfter));
await page.screenshot({ path: 'mblive_arrange.png' });

const ov = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
log('horizontal scroll?', ov.s > ov.c + 1, JSON.stringify(ov));
log('pageerrors:', JSON.stringify(errs));
await browser.close();
