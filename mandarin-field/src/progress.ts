import { useEffect, useMemo, useState } from 'react'
import type { ProgressState } from './types'

const STORAGE_KEY = 'mandarin-field-progress-v1'

export const defaultProgress: ProgressState = {
  onboarded: false,
  level: 3,
  streak: 0,
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
}

const todayKey = () => new Date().toISOString().slice(0, 10)

export function useProgress() {
  const [progress, setProgress] = useState<ProgressState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? { ...defaultProgress, ...JSON.parse(stored) } : defaultProgress
    } catch {
      return defaultProgress
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  }, [progress])

  const actions = useMemo(() => ({
    finishPlacement(score: number) {
      setProgress((current) => ({ ...current, onboarded: true, level: Math.max(1, Math.min(5, score + 1)) }))
    },
    addStudy(minutes: number, xp: number) {
      setProgress((current) => {
        const today = todayKey()
        const isNewDay = current.lastStudyDate !== today
        return {
          ...current,
          minutesToday: isNewDay ? minutes : current.minutesToday + minutes,
          xp: current.xp + xp,
          streak: isNewDay ? current.streak + 1 : current.streak,
          lastStudyDate: today,
        }
      })
    },
    completeLesson(id: string, minutes: number) {
      setProgress((current) => ({
        ...current,
        completedLessons: current.completedLessons.includes(id) ? current.completedLessons : [...current.completedLessons, id],
        minutesToday: current.minutesToday + minutes,
        xp: current.xp + 40,
        lastStudyDate: todayKey(),
      }))
    },
    recordPhraseOutcome(id: string, success: boolean, responseMs: number) {
      setProgress((current) => {
        const previous = current.phraseMastery[id] ?? { attempts: 0, successes: 0, responseMs: 0, due: todayKey(), lastResult: 'again' as const }
        const attempts = previous.attempts + 1
        const successes = previous.successes + (success ? 1 : 0)
        const averageMs = Math.round((previous.responseMs * previous.attempts + responseMs) / attempts)
        const accuracy = successes / attempts
        const delay = success ? (accuracy >= .8 && averageMs < 12000 ? 7 : 3) : 1
        const due = new Date()
        due.setDate(due.getDate() + delay)
        return { ...current, phraseMastery: { ...current.phraseMastery, [id]: { attempts, successes, responseMs: averageMs, due: due.toISOString().slice(0, 10), lastResult: success ? 'good' : 'again' } } }
      })
    },
    completeStory(id: string, minutes: number) {
      setProgress((current) => ({
        ...current,
        completedStories: current.completedStories.includes(id) ? current.completedStories : [...current.completedStories, id],
        minutesToday: current.minutesToday + minutes,
        xp: current.xp + 35,
        lastStudyDate: todayKey(),
      }))
    },
    completeScenario(id: string) {
      setProgress((current) => ({
        ...current,
        completedScenarios: current.completedScenarios.includes(id) ? current.completedScenarios : [...current.completedScenarios, id],
        minutesToday: current.minutesToday + 5,
        xp: current.xp + 35,
        lastStudyDate: todayKey(),
      }))
    },
    completeMission(id: string) {
      setProgress((current) => ({
        ...current,
        completedMissions: current.completedMissions.includes(id) ? current.completedMissions : [...current.completedMissions, id],
        xp: current.xp + 25,
        lastStudyDate: todayKey(),
      }))
    },
    masterFamily(id: string) {
      setProgress((current) => ({
        ...current,
        masteredFamilies: current.masteredFamilies.includes(id) ? current.masteredFamilies : [...current.masteredFamilies, id],
        minutesToday: current.minutesToday + 5,
        xp: current.xp + 30,
        lastStudyDate: todayKey(),
      }))
    },
    reviewCard(id: string, quality: number) {
      setProgress((current) => {
        const previous = current.review[id] ?? { interval: 0, ease: 2.5, due: todayKey(), repetitions: 0 }
        const passed = quality >= 3
        const repetitions = passed ? previous.repetitions + 1 : 0
        const interval = !passed ? 1 : repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.max(4, Math.round(previous.interval * previous.ease))
        const ease = Math.max(1.3, previous.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
        const due = new Date()
        due.setDate(due.getDate() + interval)
        return {
          ...current,
          xp: current.xp + (passed ? 8 : 3),
          reviewPasses: current.reviewPasses + (passed ? 1 : 0),
          review: { ...current.review, [id]: { interval, ease, repetitions, due: due.toISOString().slice(0, 10) } },
        }
      })
    },
    recordLevelCheck(level: number, score: number) {
      setProgress((current) => {
        const previous = current.levelChecks[level]
        const bestScore = Math.max(previous?.bestScore ?? 0, score)
        return {
          ...current,
          levelChecks: {
            ...current.levelChecks,
            [level]: { bestScore, passedAt: score >= 75 ? (previous?.passedAt ?? new Date().toISOString()) : previous?.passedAt },
          },
          xp: current.xp + (score >= 75 ? 80 : 20),
        }
      })
    },
    promoteLevel() {
      setProgress((current) => ({ ...current, level: Math.min(6, current.level + 1), xp: current.xp + 150 }))
    },
    setDailyGoal(goal: number) {
      setProgress((current) => ({ ...current, dailyGoal: goal }))
    },
    reset() {
      setProgress(defaultProgress)
    },
  }), [])

  return { progress, actions }
}

export function dueCount(progress: ProgressState, cardIds: string[]) {
  const today = todayKey()
  return cardIds.filter((id) => !progress.review[id] || progress.review[id].due <= today).length
}
