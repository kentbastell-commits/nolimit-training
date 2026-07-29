import { expect, test, type Page } from '@playwright/test'

const baseProgress = {
  onboarded: true,
  level: 3,
  streak: 1,
  minutesToday: 0,
  xp: 0,
  completedLessons: [],
  completedStories: [],
  completedScenarios: [],
  masteredFamilies: [],
  completedMissions: [],
  reviewPasses: 0,
  levelChecks: {},
  dailyGoal: 30,
  review: {},
}

async function seed(page: Page, progress = baseProgress) {
  await page.addInitScript((value) => {
    localStorage.setItem('mandarin-field-progress-v1', JSON.stringify(value))
  }, progress)
  await page.goto('/')
}

async function openSection(page: Page, desktopIndex: number, mobileLabel: string) {
  if ((page.viewportSize()?.width ?? 1200) < 800) {
    await expect(page.locator('.mobile-header')).toBeVisible()
    await page.locator('.mobile-header > button').click()
    await page.locator('.sidebar nav button').filter({ hasText: mobileLabel }).click()
    await page.waitForTimeout(300)
  } else {
    await page.locator('.sidebar nav button').nth(desktopIndex).click()
  }
}

test('placement choice and starting level survive a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Skip diagnostic/ }).click()
  await expect(page.getByText('TODAY’S FIELD SESSION')).toBeVisible()
  await page.reload()
  await expect(page.getByText('TODAY’S FIELD SESSION')).toBeVisible()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mandarin-field-progress-v1')!))
  expect(saved.onboarded).toBe(true)
  expect(saved.level).toBe(3)
})

test('fresh HSK 3 profile has explicit, locked promotion gates', async ({ page }) => {
  await seed(page)
  await openSection(page, 6, 'Progress')
  await expect(page.getByText('Level 3 → 4')).toBeVisible()
  await expect(page.locator('.gate-grid article')).toHaveCount(6)
  await expect(page.locator('.promote-button')).toHaveCount(0)
  await expect(page.locator('.level-hero h2')).toHaveText('Run a three-minute client check-in without switching to English.')
})

test('the full HSK 3–4 train pack is discoverable in every library', async ({ page }) => {
  await seed(page)
  await openSection(page, 1, 'Course')
  await expect(page.locator('.lesson-row')).toHaveCount(24)
  await page.locator('.content-filter button').filter({ hasText: 'HSK 4' }).click()
  await expect(page.locator('.lesson-row')).toHaveCount(10)

  await openSection(page, 3, 'Stories')
  await expect(page.locator('.story-card')).toHaveCount(21)
  await openSection(page, 2, 'Speak')
  await expect(page.locator('.scenario-card')).toHaveCount(15)
  await openSection(page, 4, 'Characters')
  await expect(page.locator('.family-card')).toHaveCount(28)
})

test('integrated level check records listening, reading, characters, and speaking', async ({ page }) => {
  await seed(page)
  await openSection(page, 6, 'Progress')
  await page.getByRole('button', { name: /Take level check/ }).click()
  await page.locator('.check-answers button').nth(1).click()
  await page.waitForTimeout(650)
  await page.locator('.check-answers button').nth(0).click()
  await page.waitForTimeout(650)
  await page.locator('.check-answers button').nth(0).click()
  await page.waitForTimeout(650)
  await page.locator('.check-speech textarea').fill('你昨晚睡了多久？我们先热身，再根据情况调整训练。')
  await page.getByRole('button', { name: /Assess response/ }).click()
  await expect(page.locator('.check-score b')).toHaveText('100')
  await page.getByRole('button', { name: /Save level check/ }).click()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mandarin-field-progress-v1')!).levelChecks['3'])
  expect(saved.bestScore).toBe(100)
  expect(saved.passedAt).toBeTruthy()
})

test('all evidence plus a passed check unlocks exactly one promotion', async ({ page }) => {
  await seed(page, {
    ...baseProgress,
    completedLessons: ['l1', 'l2', 'l3', 'l4', 'l5', 'l6'],
    completedStories: ['s1', 's2', 's3'],
    completedScenarios: ['r1', 'r2', 'r3'],
    masteredFamilies: ['f1', 'f2', 'f3', 'f4'],
    reviewPasses: 20,
    levelChecks: { 3: { bestScore: 100, passedAt: '2026-07-29' } },
  })
  await openSection(page, 6, 'Progress')
  await expect(page.locator('.promote-button')).toBeVisible()
  await page.locator('.promote-button').click()
  await expect(page.locator('.level-hero h2')).toHaveText('Coach an eight-minute training segment and answer follow-up questions in Mandarin.')
  const level = await page.evaluate(() => JSON.parse(localStorage.getItem('mandarin-field-progress-v1')!).level)
  expect(level).toBe(4)
})

test('Level 6 becomes an ongoing mastery standard instead of a false Level 7', async ({ page }) => {
  await seed(page, {
    ...baseProgress,
    level: 6,
    completedLessons: Array.from({ length: 60 }, (_, index) => `lesson-${index}`),
    completedStories: Array.from({ length: 45 }, (_, index) => `story-${index}`),
    completedScenarios: Array.from({ length: 45 }, (_, index) => `scenario-${index}`),
    masteredFamilies: Array.from({ length: 50 }, (_, index) => `family-${index}`),
    reviewPasses: 500,
    levelChecks: { 6: { bestScore: 92, passedAt: '2026-07-29' } },
  })
  await openSection(page, 6, 'Progress')
  await expect(page.getByText('Level 6 · ongoing proof')).toBeVisible()
  await expect(page.getByText('Mastery verified')).toBeVisible()
  await expect(page.locator('.promote-button')).toHaveCount(0)
})

test('generated story keeps pinyin and definitions available', async ({ page }) => {
  await seed(page)
  await openSection(page, 3, 'Stories')
  await page.getByRole('button', { name: /Generate a story/ }).click()
  await page.locator('.theme-grid button').nth(1).click()
  await page.locator('.level-options button').nth(1).click()
  await page.getByRole('button', { name: /Generate & read/ }).click()
  await expect(page.locator('.reader-modal h2')).toHaveText('更稳的攀岩基础')
  const wordCount = await page.locator('.gloss-word').count()
  await expect(page.locator('.gloss-word rt')).toHaveCount(wordCount)
  await page.locator('.gloss-word').first().focus()
  await expect(page.locator('.gloss-word > i').first()).toBeVisible()
})

test('two-turn role-play creates speaking evidence', async ({ page }) => {
  await seed(page)
  await openSection(page, 2, 'Speak')
  await page.locator('.scenario-card').first().click()
  for (let turn = 0; turn < 2; turn += 1) {
    const clientReplies = await page.locator('.message.client').count()
    await page.locator('.speech-composer textarea').fill('我们先热身，再根据情况调整训练。')
    await page.locator('.send-button').click()
    await expect(page.locator('.message.client')).toHaveCount(clientReplies + 1)
  }
  await expect(page.locator('.scenario-complete')).toBeVisible()
  await page.locator('.scenario-complete .primary').click()
  const completed = await page.evaluate(() => JSON.parse(localStorage.getItem('mandarin-field-progress-v1')!).completedScenarios)
  expect(completed).toHaveLength(1)
})

test('role-play exposes pinyin support and accepts a prepared pinyin answer', async ({ page }) => {
  await seed(page)
  await openSection(page, 2, 'Speak')
  await page.locator('.scenario-card').first().click()
  await expect(page.locator('.message-pinyin').first()).toBeVisible()
  await expect(page.locator('.reply-pinyin')).toHaveCount(2)
  const pinyin = await page.locator('.reply-pinyin').first().textContent()
  await page.locator('.speech-composer textarea').fill(pinyin!)
  await page.locator('.send-button').click()
  await expect(page.locator('.tutor-feedback.understandable')).toBeVisible()
  await page.getByRole('button', { name: /Pinyin ON/ }).click()
  await expect(page.locator('.message-pinyin')).toHaveCount(0)
})

test('AI feedback explains a correction and requires a retry before advancing', async ({ page }) => {
  let feedbackRequests = 0
  await page.route('**/api/mandarin/status', async (route) => {
    await route.fulfill({ json: { available: true, model: 'gpt-5.6-terra' } })
  })
  await page.route('**/api/mandarin/feedback', async (route) => {
    feedbackRequests += 1
    const needsWork = feedbackRequests === 1
    await route.fulfill({ json: {
      source: 'ai',
      verdict: needsWork ? 'needs_work' : 'correct',
      correctedChinese: '我们先热身，再根据你的情况调整训练。',
      pinyin: 'Wǒmen xiān rèshēn, zài gēnjù nǐ de qíngkuàng tiáozhěng xùnliàn.',
      english: 'We will warm up first, then adjust the training according to your condition.',
      explanation: 'Use 根据 before the situation you are using as the basis for an adjustment.',
      strengths: 'You clearly communicated the order of the session.',
      nativeAlternative: '先热身，然后我们看情况调整。',
      nextReply: '好的，我们先热身。',
      retryPrompt: 'Say the corrected sentence once.',
      targetTermsUsed: ['热身', '调整'],
    } })
  })

  await seed(page)
  await openSection(page, 2, 'Speak')
  await expect(page.getByText('AI FEEDBACK READY')).toBeVisible()
  await page.locator('.scenario-card').first().click()
  await page.locator('.speech-composer textarea').fill('我们先热身然后看你调整。')
  await page.locator('.send-button').click()

  const correction = page.locator('.tutor-feedback.needs_work')
  await expect(correction).toBeVisible()
  await expect(correction).toContainText('根据')
  await expect(page.locator('.message.client')).toHaveCount(1)
  await correction.locator('.retry-button').click()
  await expect(page.locator('.speech-composer textarea')).toHaveValue('我们先热身，再根据你的情况调整训练。')
  await page.locator('.send-button').click()
  await expect(page.locator('.tutor-feedback.correct')).toBeVisible()
  await expect(page.locator('.message.client')).toHaveCount(2)
})
