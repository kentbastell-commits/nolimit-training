import { describe, expect, it } from 'vitest'
import { characterFamilies, lessons, reviewCards, scenarios, stories } from './data'
import { characterExample, hasAuthoredCharacterExample } from './content/characterExamples'
import { fieldLevels } from './leveling'

function expectUniqueIds(items: Array<{ id: string }>) {
  expect(new Set(items.map((item) => item.id)).size).toBe(items.length)
}

describe('HSK 3–4 train pack', () => {
  it('contains enough authored material to earn both Level 3 and Level 4', () => {
    expect(lessons).toHaveLength(24)
    expect(stories).toHaveLength(21)
    expect(scenarios).toHaveLength(15)
    expect(characterFamilies).toHaveLength(28)
    expect(reviewCards).toHaveLength(96)

    for (const level of fieldLevels.filter((item) => item.level === 3 || item.level === 4)) {
      expect(lessons.length).toBeGreaterThanOrEqual(level.requirements.lessons)
      expect(stories.length).toBeGreaterThanOrEqual(level.requirements.stories)
      expect(scenarios.length).toBeGreaterThanOrEqual(level.requirements.scenarios)
      expect(characterFamilies.length).toBeGreaterThanOrEqual(level.requirements.families)
    }
  })

  it('has unique progress identifiers in every content stream', () => {
    expectUniqueIds(lessons)
    expectUniqueIds(stories)
    expectUniqueIds(scenarios)
    expectUniqueIds(characterFamilies)
    expectUniqueIds(reviewCards)
  })

  it('keeps pinyin and English support on every lesson, story, and scenario line', () => {
    for (const lesson of lessons) {
      expect(lesson.phrases.length).toBeGreaterThanOrEqual(4)
      for (const phrase of lesson.phrases) {
        expect(phrase.hanzi.trim()).not.toBe('')
        expect(phrase.pinyin.trim()).not.toBe('')
        expect(phrase.english.trim()).not.toBe('')
      }
    }
    for (const story of stories) {
      expect(story.lines.length).toBeGreaterThanOrEqual(4)
      expect(story.correctAnswer).toBeGreaterThanOrEqual(0)
      expect(story.correctAnswer).toBeLessThan(story.answers.length)
      for (const line of story.lines) {
        expect(line.pinyin.trim()).not.toBe('')
        expect(line.english.trim()).not.toBe('')
      }
    }
    for (const scenario of scenarios) {
      expect(scenario.coachOpening.pinyin.trim()).not.toBe('')
      expect(scenario.suggestedReplies.length).toBeGreaterThanOrEqual(2)
      expect(scenario.targetTerms.length).toBeGreaterThanOrEqual(4)
    }
  })

  it('gives every character-family word an authored contextual sentence', () => {
    for (const family of characterFamilies) {
      expect(family.hint.length).toBeGreaterThan(30)
      for (const member of family.members) {
        expect(hasAuthoredCharacterExample(member.word)).toBe(true)
        const example = characterExample(member)
        expect(example.hanzi).toContain(member.word)
        expect(example.pinyin.trim()).not.toBe('')
        expect(example.english.trim()).not.toBe('')
      }
    }
  })
})
