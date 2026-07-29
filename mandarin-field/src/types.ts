export type View = 'today' | 'learn' | 'speak' | 'read' | 'characters' | 'review' | 'progress'

export type Phrase = {
  hanzi: string
  pinyin: string
  english: string
  note?: string
}

export type Lesson = {
  id: string
  eyebrow: string
  title: string
  chineseTitle: string
  duration: number
  level: string
  outcome: string
  phrases: Phrase[]
  mission: string
  accent: string
}

export type CharacterFamily = {
  id: string
  anchor: string
  sound: string
  idea: string
  hint: string
  members: Array<{
    char: string
    pinyin: string
    meaning: string
    component: string
    word: string
    wordPinyin: string
    wordMeaning: string
  }>
}

export type StoryLine = Phrase & { id: string }

export type Story = {
  id: string
  title: string
  chineseTitle: string
  level: string
  minutes: number
  description: string
  tags: string[]
  lines: StoryLine[]
  question: string
  answers: string[]
  correctAnswer: number
}

export type Scenario = {
  id: string
  title: string
  chineseTitle: string
  level: string
  description: string
  setting: string
  coachOpening: Phrase
  suggestedReplies: Phrase[]
  targetTerms: string[]
}

export type ReviewCard = Phrase & {
  id: string
  type: 'phrase' | 'character' | 'listening'
  context?: string
}

export type ProgressState = {
  onboarded: boolean
  level: number
  streak: number
  minutesToday: number
  xp: number
  completedLessons: string[]
  completedStories: string[]
  completedScenarios: string[]
  masteredFamilies: string[]
  completedMissions: string[]
  reviewPasses: number
  levelChecks: Record<number, { bestScore: number; passedAt?: string }>
  dailyGoal: number
  lastStudyDate?: string
  review: Record<string, { interval: number; ease: number; due: string; repetitions: number }>
}

export type LevelRequirementKey = 'lessons' | 'stories' | 'scenarios' | 'families' | 'reviews'

export type FieldLevel = {
  level: number
  hskReference: string
  name: string
  chineseName: string
  promise: string
  proof: string
  focus: string[]
  requirements: Record<LevelRequirementKey, number>
  units: Array<{ code: string; title: string; chinese: string; outcome: string }>
}
