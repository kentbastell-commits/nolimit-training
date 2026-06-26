import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
await p.goto('https://trainnolimit.com/?view=coach', { waitUntil: 'networkidle' });
await p.waitForTimeout(4000);
const navs = await p.evaluate(() => [...document.querySelectorAll('nav button, nav a, .sidebar button, [class*="nav"] button, [class*="Nav"] button')].map(e=>e.textContent.trim()).filter(Boolean).slice(0,30));
console.log('nav items:', JSON.stringify(navs));
// try clicking Orders
const clicked = await p.evaluate(() => {
  const all = [...document.querySelectorAll('button, a, span, div')];
  const nav = all.find(e => e.textContent.trim() === 'Orders' && e.children.length <= 1);
  if (nav) { nav.click(); return nav.outerHTML.slice(0,120); }
  return null;
});
console.log('clicked:', clicked);
await p.waitForTimeout(3500);
const counts = await p.evaluate(() => ({
  orderCards: document.querySelectorAll('.orderCard').length,
  pendingCards: document.querySelectorAll('.pendingOrderCard').length,
  anyZZ: [...document.querySelectorAll('*')].filter(e=>e.children.length===0 && /ZZ Chip/.test(e.textContent)).length,
  heading: document.querySelector('h1, h2, .pageTitle')?.textContent,
}));
console.log('counts:', JSON.stringify(counts));
await p.screenshot({ path: '_chip.png', fullPage: false });
await b.close();
