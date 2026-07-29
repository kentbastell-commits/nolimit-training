import { describe, expect, it } from 'vitest'
import { lessons } from './data'
import { contourScore } from './tone'
import { createTransformation } from './transformations'

describe('adaptive production training', () => {
  it('creates a concrete transfer prompt for every lesson', () => {
    const transformations = lessons.map(createTransformation)
    expect(transformations).toHaveLength(24)
    for (const item of transformations) {
      expect(item.source.trim()).not.toBe('')
      expect(item.target.trim()).not.toBe('')
      expect(item.instruction.trim()).not.toBe('')
    }
    expect(transformations.filter((item) => item.target !== item.source).length).toBeGreaterThanOrEqual(20)
  })

  it('scores matching pitch movement above an opposite contour', () => {
    const risingTarget = [.1, .25, .45, .7, .9]
    expect(contourScore([110, 120, 135, 155, 180], risingTarget)).toBeGreaterThan(75)
    expect(contourScore([180, 155, 135, 120, 110], risingTarget)).toBeLessThan(45)
  })
})
