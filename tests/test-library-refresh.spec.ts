import { test, expect } from "@playwright/test";
test("returning to the test library includes tests created on another device",async({page})=>{
  await page.addInitScript(()=>localStorage.setItem("nl_public_lang","en"));
  let added=false;
  await page.route("**/api/**",async route=>{
    const endpoint=new URL(route.request().url()).pathname.split("/").pop()!;
    const tests=[{testId:"TEST-OLD",recordId:"TEST-OLD",testName:"Audit original test",category:"Strength"},...(added?[{testId:"TEST-NEW",recordId:"TEST-NEW",testName:"Audit new device test",category:"Strength"}]:[])];
    const data:Record<string,unknown>={clients:{clients:[]},coaches:{coaches:[]},programs:{programs:[]},teams:{teams:[]},subscriptions:{subscriptions:[]},productOrders:{orders:[]},coachingReview:{states:[]},notifications:{notifications:[]},coachDrafts:{drafts:[]},testTemplates:{tests:[]},testLibrary:{tests},exercises:{exercises:[]}};
    await route.fulfill({json:data[endpoint]||{}});
  });
  await page.goto("/?view=coach&page=Tests");
  await page.locator(".ctpSearch input").fill("Audit original");
  await expect(page.getByRole("button",{name:/Audit original test/})).toBeVisible();
  const nav=page.getByRole("navigation",{name:"Library sections",exact:true});
  await nav.getByRole("button",{name:"Exercises",exact:true}).click();
  await expect(page.locator(".ctpSearch")).toHaveCount(0);
  added=true;
  await nav.getByRole("button",{name:"Tests",exact:true}).click();
  await page.locator(".ctpSearch input").fill("Audit new device");
  await expect(page.getByRole("button",{name:/Audit new device test/})).toBeVisible();
});
