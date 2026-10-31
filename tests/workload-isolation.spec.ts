import { test, expect } from "@playwright/test";

for (const width of [1440, 390]) {
test(`a delayed workload read cannot replace another athlete's training load at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.clock.setFixedTime(new Date("2026-10-31T12:00:00+08:00"));
  await page.addInitScript(() => localStorage.setItem("nl_public_lang", "en"));
  const clients = ["A", "B"].map((letter, index) => ({ id:`CL-900${index+1}`,clientCode:`CL-900${index+1}`,name:`Audit ${letter}`,initials:letter,status:"Active",program:"--",clientType:"Online Coaching",coach:"Kent Bastell",languagePreference:"English",tags:[],categories:[] }));
  let releaseA!:()=>void;
  const holdA=new Promise<void>(resolve=>{releaseA=resolve;});
  let aRequested=false;
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  page.on("console",message=>{if(/Maximum update depth/.test(message.text()))errors.push(message.text());});
  await page.route("**/api/**",async route=>{
    const req=route.request(),url=new URL(req.url()),endpoint=url.pathname.split("/").pop()!;
    if(req.method()!=="GET")return route.fulfill({json:{success:true}});
    const data:Record<string,unknown>={clients:{clients},coaches:{coaches:[]},programs:{programs:[]},teams:{teams:[]},subscriptions:{subscriptions:[]},productOrders:{orders:[]},coachingReview:{states:[]},notifications:{notifications:[]},coachDrafts:{drafts:[]},workouts:{workouts:[]},workoutHistory:{logs:[]},exerciseResults:{results:[]},checkIns:{checkIns:[]},contentAssignments:{assignments:[]},contentResponses:{responses:[]},athleteMetrics:{metrics:[]},workoutComments:{comments:[]},calendarSessions:{items:[]},calendarDrafts:{items:[],version:"audit"}};
    if(endpoint==="workloadLogs"){
      const id=url.searchParams.get("clientId");
      if(id==="CL-9001"){aRequested=true;await holdA;}
      return route.fulfill({json:{logs:[{clientId:id,dateKey:"2026-10-31",techAmRpe:id==="CL-9001"?9:1,techAmMin:100,techPmRpe:0,techPmMin:0,cardioRpe:0,cardioMin:0}]}});
    }
    return route.fulfill({json:data[endpoint]||{}});
  });
  try {
    await page.goto("/?view=coach&page=Clients");
    await page.getByRole("button",{name:"Calendar: Audit A",exact:true}).click();
    await expect.poll(()=>aRequested).toBe(true);
    await page.getByRole("button",{name:"Switch athlete",exact:true}).click();
    await page.getByRole("button",{name:"Audit B",exact:true}).click();
    await page.locator(".coachClientTabs").getByRole("button",{name:"Progress",exact:true}).click();
    const weekly=page.locator(".loadStat").filter({has:page.getByText("Weekly load",{exact:true})}).locator("strong");
    await expect(weekly).toHaveText("100");
    const delayed=page.waitForResponse(response=>response.url().includes("/api/workloadLogs?clientId=CL-9001"));
    releaseA();await delayed;
    // Wait for the delayed response to pass through fetch/json and React.
    await page.waitForTimeout(300);
    await expect(weekly).toHaveText("100");
    expect(errors).toEqual([]);
  } finally { releaseA(); }
});
}
