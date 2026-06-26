import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
await p.goto('https://trainnolimit.com/?view=coach', { waitUntil: 'networkidle' });
await p.waitForTimeout(4000);
// navigate to Orders
await p.evaluate(() => {
  const nav = [...document.querySelectorAll('button, a, [role="button"], li, span')].find(e => e.textContent.trim() === 'Orders');
  nav && nav.click();
});
await p.waitForTimeout(3500);
// read chips for our test orders
const chips = await p.evaluate(() => {
  return [...document.querySelectorAll('.orderCard')].map(card => {
    const name = card.querySelector('.orderCardHeader p')?.textContent || '';
    const chip = card.querySelector('.onboardingStatusChip');
    return { name: name.slice(0,40), chip: chip?.textContent?.trim(), cls: chip?.className };
  }).filter(c => /ZZ Chip/.test(c.name));
});
console.log(JSON.stringify(chips, null, 2));
// scroll to first ZZ Chip card and screenshot
await p.evaluate(() => {
  const card = [...document.querySelectorAll('.orderCard')].find(c => /ZZ Chip/.test(c.textContent));
  card && card.scrollIntoView({ block: 'start' });
});
await p.waitForTimeout(600);
await p.screenshot({ path: '_chip.png', fullPage: false });
await b.close();
