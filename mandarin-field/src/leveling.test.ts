import { describe, expect, it } from 'vitest'
import { getFieldLevel, getLevelStatus } from './leveling'
import type { ProgressState } from './types'

const progress = (overrides: Partial<ProgressState> = {}): ProgressState => ({
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
  phraseMastery: {},
  errorNotebook: {},
  ...overrides,
})

describe('field level progression', () => {
  it('maps the user HSK 3 baseline to Working Mandarin', () => {
    const level = getFieldLevel(3)
    expect(level.name).toBe('Working Mandarin')
    expect(level.hskReference).toBe('HSK 3')
    expect(level.proof).toContain('three-minute client check-in')
  })

  it('does not promote based on streak, time, or XP', () => {
    const status = getLevelStatus(progress({ streak: 100, minutesToday: 500, xp: 99999 }))
    expect(status.ready).toBe(false)
    expect(status.evidenceRatio).toBe(0)
  })

  it('requires every practice strand plus the integrated check', () => {
    const evidenceOnly = progress({
      completedLessons: Array.from({ length: 6 }, (_, index) => `l${index}`),
      completedStories: Array.from({ length: 3 }, (_, index) => `s${index}`),
      completedScenarios: Array.from({ length: 3 }, (_, index) => `r${index}`),
      masteredFamilies: Array.from({ length: 4 }, (_, index) => `f${index}`),
      reviewPasses: 20,
    })
    expect(getLevelStatus(evidenceOnly).evidenceRatio).toBe(1)
    expect(getLevelStatus(evidenceOnly).ready).toBe(false)

    const verified = progress({ ...evidenceOnly, levelChecks: { 3: { bestScore: 75, passedAt: '2026-07-29' } } })
    expect(getLevelStatus(verified).ready).toBe(true)
  })

  it('preserves partial evidence and identifies incomplete gates', () => {
    const status = getLevelStatus(progress({ completedLessons: ['a', 'b', 'c'], completedStories: ['s1'], reviewPasses: 5 }))
    expect(status.items.find((item) => item.key === 'lessons')?.ratio).toBe(.5)
    expect(status.items.filter((item) => !item.complete)).toHaveLength(5)
    expect(status.evidenceRatio).toBeGreaterThan(0)
    expect(status.evidenceRatio).toBeLessThan(1)
  })
})
