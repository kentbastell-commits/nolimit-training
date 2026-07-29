import { describe, expect, it } from 'vitest'
import { stories } from './data'
import { generateStory, glossLine, storyThemes } from './reader'

describe('graded reader support', () => {
  it('provides pinyin and meaning for every token in included stories', () => {
    const generated = storyThemes.map((theme) => generateStory(theme.id, 'HSK 3→4'))
    const tokens = [...stories, ...generated].flatMap((story) => story.lines).flatMap((line) => glossLine(line.hanzi)).filter((token) => !token.punctuation)
    expect(tokens.length).toBeGreaterThan(100)
    expect(tokens.every((token) => token.pinyin && token.pinyin !== '·')).toBe(true)
    expect(tokens.every((token) => token.meaning)).toBe(true)
  })

  it('generates every supported theme at either difficulty', () => {
    for (const theme of storyThemes) {
      expect(generateStory(theme.id, 'HSK 3').level).toBe('HSK 3')
      expect(generateStory(theme.id, 'HSK 3→4').level).toBe('HSK 3→4')
    }
  })
})
