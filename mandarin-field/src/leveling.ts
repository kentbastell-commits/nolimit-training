import type { FieldLevel, LevelRequirementKey, ProgressState } from './types'

export const fieldLevels: FieldLevel[] = [
  {
    level: 1, hskReference: 'HSK 1', name: 'First Contact', chineseName: '开口',
    promise: 'Handle predictable, one-turn daily exchanges.', proof: 'Introduce yourself and complete a simple purchase without English.',
    focus: ['Sound system', 'Core word order', '150 high-frequency words', '80 characters'],
    requirements: { lessons: 4, stories: 2, scenarios: 2, families: 2, reviews: 12 },
    units: [
      { code: '1A', title: 'Sound before speed', chinese: '先听清楚', outcome: 'Hear and produce the core Mandarin sound contrasts.' },
      { code: '1B', title: 'First exchanges', chinese: '第一次开口', outcome: 'Greet, identify, ask, and answer in short turns.' },
      { code: '1C', title: 'Daily survival', chinese: '日常生活', outcome: 'Handle numbers, time, food, and basic directions.' },
    ],
  },
  {
    level: 2, hskReference: 'HSK 2', name: 'Daily Operator', chineseName: '能应付',
    promise: 'Navigate familiar daily situations with short connected sentences.', proof: 'Complete a five-turn daily-life exchange and understand its main points.',
    focus: ['Connected sentences', 'Everyday listening', '300+ words', 'Common character components'],
    requirements: { lessons: 5, stories: 3, scenarios: 3, families: 3, reviews: 16 },
    units: [
      { code: '2A', title: 'Plans and routines', chinese: '计划和习惯', outcome: 'Discuss time, frequency, and simple plans.' },
      { code: '2B', title: 'Needs and choices', chinese: '需要和选择', outcome: 'Compare options and explain simple preferences.' },
      { code: '2C', title: 'Past and progress', chinese: '过去和变化', outcome: 'Describe completed actions and basic changes.' },
    ],
  },
  {
    level: 3, hskReference: 'HSK 3', name: 'Working Mandarin', chineseName: '能工作',
    promise: 'Lead familiar client moments and explain concrete ideas clearly.', proof: 'Run a three-minute client check-in without switching to English.',
    focus: ['Client check-ins', 'Clear coaching cues', 'HSK 3 reading fluency', '600+ word foundation'],
    requirements: { lessons: 6, stories: 3, scenarios: 3, families: 4, reviews: 20 },
    units: [
      { code: '3A', title: 'Read the client', chinese: '了解客户状态', outcome: 'Ask about sleep, readiness, discomfort, and context.' },
      { code: '3B', title: 'Coach the set', chinese: '指导训练动作', outcome: 'Give concise cues, dosage, pacing, and rest instructions.' },
      { code: '3C', title: 'Build the relationship', chinese: '建立教练关系', outcome: 'Discuss goals, progress, scheduling, and follow-up.' },
      { code: '3X', title: 'Client check-in proof', chinese: '能力验证', outcome: 'Combine the whole level in a three-minute coaching exchange.' },
    ],
  },
  {
    level: 4, hskReference: 'HSK 4 bridge', name: 'Connected Coach', chineseName: '能解释',
    promise: 'Sustain conversations, explain reasons, and adapt language in real time.', proof: 'Coach an eight-minute training segment and answer follow-up questions in Mandarin.',
    focus: ['Cause and effect', 'Longer listening', 'Natural connectors', '1,200+ working words'],
    requirements: { lessons: 18, stories: 10, scenarios: 10, families: 12, reviews: 90 },
    units: [
      { code: '4A', title: 'Explain the why', chinese: '解释原因', outcome: 'Connect decisions to goals, readiness, and evidence.' },
      { code: '4B', title: 'Adjust in real time', chinese: '现场调整', outcome: 'Clarify misunderstandings and offer alternatives naturally.' },
      { code: '4C', title: 'Longer client stories', chinese: '客户的故事', outcome: 'Follow connected speech about history, concerns, and progress.' },
      { code: '4X', title: 'Coaching segment proof', chinese: '能力验证', outcome: 'Lead an eight-minute training segment entirely in Mandarin.' },
    ],
  },
  {
    level: 5, hskReference: 'HSK 4–5', name: 'Independent Professional', chineseName: '能深入',
    promise: 'Discuss nuanced professional topics without rehearsing every sentence.', proof: 'Lead a goal review, handle an objection, and summarize the plan naturally.',
    focus: ['Nuance and tone', 'Professional vocabulary', 'Unscripted questions', 'Native-speed topic listening'],
    requirements: { lessons: 36, stories: 24, scenarios: 24, families: 28, reviews: 220 },
    units: [
      { code: '5A', title: 'Nuanced assessment', chinese: '深入评估', outcome: 'Discuss uncertainty, tradeoffs, and changing symptoms carefully.' },
      { code: '5B', title: 'Trust and objections', chinese: '信任和疑问', outcome: 'Respond to concerns without sounding scripted or defensive.' },
      { code: '5C', title: 'Teach in public', chinese: '公开表达', outcome: 'Create useful Chinese educational content and short talks.' },
      { code: '5X', title: 'Professional review proof', chinese: '能力验证', outcome: 'Lead a complete progress review and agree on next actions.' },
    ],
  },
  {
    level: 6, hskReference: 'HSK 5+', name: 'Fluent Operator', chineseName: '能自如',
    promise: 'Operate professionally and socially with flexibility, precision, and personality.', proof: 'Lead a workshop and handle unscripted questions from native speakers.',
    focus: ['Professional identity', 'Humor and register', 'Technical discussion', 'Native content'],
    requirements: { lessons: 60, stories: 45, scenarios: 45, families: 50, reviews: 500 },
    units: [
      { code: '6A', title: 'Professional voice', chinese: '专业表达', outcome: 'Sound like yourself rather than a translated version of yourself.' },
      { code: '6B', title: 'Workshops and media', chinese: '课程和媒体', outcome: 'Present structured ideas and respond to a live audience.' },
      { code: '6C', title: 'Native range', chinese: '真实语境', outcome: 'Follow and join fast, culturally grounded conversations.' },
      { code: '6X', title: 'Independent operation proof', chinese: '能力验证', outcome: 'Deliver a workshop and navigate open questions.' },
    ],
  },
]

export const requirementLabels: Record<LevelRequirementKey, { label: string; chinese: string }> = {
  lessons: { label: 'Core lessons', chinese: '课程' },
  stories: { label: 'Read & listen stories', chinese: '故事' },
  scenarios: { label: 'Completed role-plays', chinese: '对话' },
  families: { label: 'Character families', chinese: '汉字' },
  reviews: { label: 'Successful recalls', chinese: '复习' },
}

export function getFieldLevel(level: number) {
  return fieldLevels.find((item) => item.level === level) ?? fieldLevels[2]
}

export function getEvidence(progress: ProgressState): Record<LevelRequirementKey, number> {
  return {
    lessons: progress.completedLessons.length,
    stories: progress.completedStories.length,
    scenarios: progress.completedScenarios.length,
    families: progress.masteredFamilies.length,
    reviews: progress.reviewPasses,
  }
}

export function getLevelStatus(progress: ProgressState) {
  const definition = getFieldLevel(progress.level)
  const evidence = getEvidence(progress)
  const items = (Object.keys(definition.requirements) as LevelRequirementKey[]).map((key) => {
    const required = definition.requirements[key]
    const current = evidence[key]
    return { key, current, required, complete: current >= required, ratio: Math.min(1, current / required) }
  })
  const evidenceRatio = items.reduce((sum, item) => sum + item.ratio, 0) / items.length
  const levelCheck = progress.levelChecks[progress.level]
  const checkPassed = Boolean(levelCheck?.passedAt)
  const ready = items.every((item) => item.complete) && checkPassed
  return { definition, evidence, items, evidenceRatio, checkPassed, bestScore: levelCheck?.bestScore ?? 0, ready }
}
