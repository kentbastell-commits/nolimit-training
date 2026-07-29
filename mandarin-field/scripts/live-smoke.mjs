import { chromium } from '@playwright/test'

const baseUrl = process.env.BASE_URL || 'https://trainnolimit.com/mandarin/'
const browser = await chromium.launch({ headless: true })

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  const skip = page.getByRole('button', { name: /Skip diagnostic/ })
  if (await skip.isVisible()) await skip.click()
  await page.getByText('TODAY’S FIELD SESSION').waitFor()
  const status = await page.evaluate(async () => (await fetch(new URL('api/mandarin/status', window.location.href))).json()).catch(() => null)
  console.log(JSON.stringify({ title: await page.title(), url: page.url(), todayVisible: true, aiAvailable: Boolean(status?.available) }))
} finally {
  await browser.close()
}
