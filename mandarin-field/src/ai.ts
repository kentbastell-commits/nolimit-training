import type { Scenario } from './types'

export type AiVerdict = 'correct' | 'understandable' | 'needs_work'

export type TutorFeedback = {
  source: 'ai' | 'local'
  verdict: AiVerdict
  correctedChinese: string
  pinyin: string
  english: string
  explanation: string
  strengths: string
  nativeAlternative: string
  nextReply: string
  nextReplyPinyin: string
  retryPrompt: string
  targetTermsUsed: string[]
}

type ConversationMessage = { role: 'client' | 'learner'; text: string }
const tutorApi = (path: string) => `${import.meta.env.BASE_URL}api/mandarin/${path}`

function clientId() {
  const key = 'mandarin-field-client-id'
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const created = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  localStorage.setItem(key, created)
  return created
}

export async function getAiStatus() {
  try {
    const response = await fetch(tutorApi('status'), { headers: { Accept: 'application/json' } })
    if (!response.ok) return { available: false, model: '' }
    const body = await response.json() as { available?: boolean; model?: string }
    return { available: Boolean(body.available), model: body.model ?? '' }
  } catch {
    return { available: false, model: '' }
  }
}

export async function requestTutorFeedback(args: {
  scenario: Scenario
  answer: string
  history: ConversationMessage[]
  level: number
  signal?: AbortSignal
}): Promise<TutorFeedback> {
  const response = await fetch(tutorApi('feedback'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    signal: args.signal,
    body: JSON.stringify({
      clientId: clientId(),
      level: args.level,
      answer: args.answer,
      history: args.history.slice(-8),
      scenario: {
        id: args.scenario.id,
        title: args.scenario.title,
        chineseTitle: args.scenario.chineseTitle,
        setting: args.scenario.setting,
        goal: args.scenario.description,
        opening: args.scenario.coachOpening.hanzi,
        suggestedReplies: args.scenario.suggestedReplies.map((item) => item.hanzi),
        targetTerms: args.scenario.targetTerms,
      },
    }),
  })

  const body = await response.json().catch(() => ({})) as TutorFeedback & { error?: string }
  if (!response.ok) throw new Error(body.error || 'AI feedback is unavailable')
  return { ...body, source: 'ai' }
}

export function localTutorFeedback(scenario: Scenario, answer: string, nextReply: string): TutorFeedback {
  const normalizePinyin = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const pinyinMatch = scenario.suggestedReplies.find((reply) => normalizePinyin(reply.pinyin) === normalizePinyin(answer))
  const evaluatedAnswer = pinyinMatch?.hanzi ?? answer
  const targetTermsUsed = scenario.targetTerms.filter((term) => evaluatedAnswer.includes(term))
  const model = pinyinMatch ?? scenario.suggestedReplies[0]
  return {
    source: 'local',
    verdict: targetTermsUsed.length ? 'understandable' : 'needs_work',
    correctedChinese: model.hanzi,
    pinyin: model.pinyin,
    english: model.english,
    explanation: targetTermsUsed.length
      ? `You used ${targetTermsUsed.join('、')}. Detailed grammar feedback needs the AI connection.`
      : 'Use one of the prepared response patterns while the AI connection is unavailable.',
    strengths: targetTermsUsed.length ? 'Your answer included useful scenario vocabulary.' : 'You responded in the target situation.',
    nativeAlternative: scenario.suggestedReplies[1]?.hanzi ?? model.hanzi,
    nextReply,
    nextReplyPinyin: '',
    retryPrompt: 'Read the corrected answer, then say or type it once from memory.',
    targetTermsUsed,
  }
}
