import { expect, test } from '@playwright/test'

test('the production study pack reloads and navigates with the network disabled', async ({ page, context }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Skip diagnostic/ }).click()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('mandarin-field-offline-ready'))).toBe('true')
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  const cachedApp = await page.evaluate(async () => {
    const scriptUrl = (document.querySelector('script[type="module"]') as HTMLScriptElement)?.src
    const response = scriptUrl ? await caches.match(scriptUrl) : undefined
    return { scriptUrl, bytes: response ? (await response.clone().arrayBuffer()).byteLength : 0 }
  })
  expect(cachedApp.scriptUrl).toContain('/assets/index-')
  expect(cachedApp.bytes).toBeGreaterThan(100_000)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('TODAY’S FIELD SESSION')).toBeVisible()
  await page.locator('.sidebar nav button').nth(1).click()
  await expect(page.locator('.lesson-row')).toHaveCount(24)
  await context.setOffline(false)
})
