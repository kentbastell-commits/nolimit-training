import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1440,height:980} });
await p.goto('http://43.132.228.109/', { waitUntil:'networkidle', timeout:60000 });
await p.waitForTimeout(3000);
await p.mouse.move(40,300); await p.waitForTimeout(700);
const btns = await p.$$('.sidebar button, .sidebar a');
await btns[1].click(); await p.waitForTimeout(1200);
const fly = await p.$('.navFlyout'); if (fly) await p.locator('.navFlyout').getByText('Teams',{exact:true}).click({force:true}).catch(()=>{});
await p.waitForTimeout(2000);
await p.locator('.teamCard').first().click(); await p.waitForTimeout(1200);
// Edit / Members
await p.getByText('Edit / Members').click(); await p.waitForTimeout(800);
// set positions on the two selected members
const posInputs = await p.$$('.teamPositionInput');
console.log('position inputs:', posInputs.length);
if (posInputs[0]) await posInputs[0].fill('Forwards');
if (posInputs[1]) await posInputs[1].fill('Backs');
await p.screenshot({ path:'tv_editor.png', clip:{x:330,y:120,width:1000,height:520} });
await p.getByText('Save Team').click(); await p.waitForTimeout(3000);
// detail view: screenshot with tags + assign dropdown
await p.screenshot({ path:'tv_detail.png', clip:{x:90,y:0,width:1350,height:820} });
// select Forwards in subgroup dropdown
await p.selectOption('.teamSubgroupRow select', 'Forwards').catch(e=>console.log('sub err', e.message));
await p.waitForTimeout(800);
await p.screenshot({ path:'tv_forwards.png', clip:{x:330,y:230,width:1000,height:520} });
// report checked state
const rows = await p.$$eval('.teamMemberRow', els=>els.map(e=>({name:e.querySelector('.teamMemberName')?.textContent, checked:e.querySelector('input')?.checked})));
console.log('rows after Forwards:', JSON.stringify(rows));
const api = await (await fetch('http://43.132.228.109/api/teams')).json();
console.log('positions:', JSON.stringify(api.teams[0]?.positions));
await b.close();
