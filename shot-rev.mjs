import { chromium } from 'playwright';
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:1440,height:1300}});
const p=await ctx.newPage();
const errs=[];p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto('https://trainnolimit.com/?view=coach',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(5000);
await p.getByText('Claire Hu',{exact:false}).first().click().catch(()=>{});
await p.waitForTimeout(3000);
for(const e of await p.$$('button')){if((await e.textContent()||'').trim()==='Dashboard'){await e.click();break;}}
await p.waitForTimeout(1500);
for(const e of await p.$$('.coachDashTabs button')){if(/Activity/.test(await e.textContent()||'')){await e.click();break;}}
await p.waitForTimeout(2000);
const h2=await p.$$eval('.clientHomeGrid h2',els=>els.map(e=>e.innerText.trim()));
console.log('Activity panels:', JSON.stringify(h2));
console.log('Review Queue gone?', !h2.includes('Review Queue'));
console.log('Recent Submissions gone?', !h2.some(x=>/Recent Submissions/.test(x)));
const cols=await p.$$eval('.coachLogsPanel .sessionLogColTitle',els=>els.map(e=>e.innerText.trim()));
console.log('column titles:', JSON.stringify(cols));
const comments=await p.$$('.coachLogsPanel');
// find the Reviews panel (last coachLogsPanel) and read its items
const reviewsPanel = comments[comments.length-1];
const cc=await reviewsPanel.$$('.sessionLogCol');
if(cc.length===2){
  const left=await cc[0].$$eval('.sessionLogItem strong',els=>els.map(e=>e.innerText.trim()));
  const right=await cc[1].$$eval('.sessionLogItem strong',els=>els.map(e=>e.innerText.trim()));
  console.log('Client Comments:', JSON.stringify(left.slice(0,5)));
  console.log('To be Reviewed:', JSON.stringify(right.slice(0,5)));
}
await p.screenshot({path:'rev.png',fullPage:true});
console.log('errors:', errs.length, errs.slice(0,3));
await b.close();console.log('DONE');
