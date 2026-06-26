import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
await p.goto('https://trainnolimit.com/?view=coach', { waitUntil: 'networkidle' });
await p.waitForTimeout(4000);
await p.evaluate(() => [...document.querySelectorAll('span,button,a')].find(e=>e.textContent.trim()==='Orders'&&e.children.length<=1)?.click());
await p.waitForTimeout(3500);
const chips = await p.evaluate(() => [...document.querySelectorAll('.orderCard')].map(card=>{
  const p = card.querySelector('.orderCardHeader p')?.textContent||'';
  const chip = card.querySelector('.onboardingStatusChip');
  const cs = chip ? getComputedStyle(chip) : null;
  return { who:p.slice(0,30), status:chip?.textContent?.trim(), tone: chip?.className.replace('status onboardingStatusChip','').trim(), color: cs?.color };
}));
console.log(JSON.stringify(chips,null,2));
// scroll so a ZZ Chip card is visible and screenshot
await p.evaluate(() => [...document.querySelectorAll('.orderCard')].find(c=>/ZZ Chip/.test(c.textContent))?.scrollIntoView({block:'start'}));
await p.waitForTimeout(600);
await p.screenshot({ path: '_chip.png', fullPage: false });
await b.close();
