import type { Lesson } from './types'

export type Transformation = {
  source: string
  sourceEnglish: string
  target: string
  instruction: string
}

const rules = [
  { from: '今天', to: '明天', instruction: 'move it from today to tomorrow' },
  { from: '你们', to: '他们', instruction: 'talk about them instead of you all' },
  { from: '你', to: '他', instruction: 'talk about him instead of the client' },
  { from: '我们', to: '他们', instruction: 'make they the subject instead of we' },
  { from: '我', to: '她', instruction: 'make she the subject instead of I' },
  { from: '这个', to: '那个', instruction: 'refer to that one instead of this one' },
  { from: '先', to: '最后', instruction: 'change first to finally' },
]

export function createTransformation(lesson: Lesson): Transformation {
  for (const phrase of lesson.phrases) {
    const rule = rules.find((item) => phrase.hanzi.includes(item.from))
    if (rule) return {
      source: phrase.hanzi,
      sourceEnglish: phrase.english,
      target: phrase.hanzi.replace(rule.from, rule.to),
      instruction: rule.instruction,
    }
  }
  const phrase = lesson.phrases[0]
  return { source: phrase.hanzi, sourceEnglish: phrase.english, target: phrase.hanzi, instruction: 'produce the complete sentence without looking' }
}
