import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1400,height:980} });
await p.goto('http://43.132.228.109/', { waitUntil:'networkidle', timeout:60000 });
await p.waitForTimeout(3000);
await p.mouse.move(40,300); await p.waitForTimeout(700);
const btns = await p.$$('.sidebar button, .sidebar a');
await btns[1].click(); await p.waitForTimeout(1200);
const fly = await p.$('.navFlyout'); if (fly) await p.locator('.navFlyout').getByText('Teams',{exact:true}).click({force:true}).catch(()=>{});
await p.waitForTimeout(2500);
// expand the team
await p.locator('.teamsTableRow').first().click();
await p.waitForTimeout(2000);
await p.screenshot({ path:'rv_detail.png', clip:{x:150,y:120,width:1240,height:560} });
console.log('done'); await b.close();
