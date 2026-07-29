import OpenAI from 'openai'
import { zodFunction, zodTextFormat } from 'openai/helpers/zod'
import { createHash } from 'node:crypto'
import { z } from 'zod'

export const MandarinFeedback = z.object({
  verdict: z.enum(['correct', 'understandable', 'needs_work']),
  correctedChinese: z.string(),
  pinyin: z.string(),
  english: z.string(),
  explanation: z.string(),
  strengths: z.string(),
  nativeAlternative: z.string(),
  nextReply: z.string(),
  retryPrompt: z.string(),
  targetTermsUsed: z.array(z.string()),
})

const FeedbackRequest = z.object({
  clientId: z.string().min(6).max(100),
  level: z.number().int().min(1).max(6),
  answer: z.string().trim().min(1).max(500),
  history: z.array(z.object({ role: z.enum(['client', 'learner']), text: z.string().max(500) })).max(8),
  scenario: z.object({
    id: z.string().max(100),
    title: z.string().max(150),
    chineseTitle: z.string().max(150),
    setting: z.string().max(200),
    goal: z.string().max(500),
    opening: z.string().max(500),
    suggestedReplies: z.array(z.string().max(500)).max(4),
    targetTerms: z.array(z.string().max(50)).max(20),
  }),
})

const teacherPrompt = `You are the Mandarin Field feedback coach for an adult English-speaking learner around HSK 3 moving toward HSK 4. Evaluate one reply inside a real-world role-play.

Judge communicative success before perfection. Do not mark a natural sentence wrong merely because another wording is more elegant. Correct Simplified Chinese grammar, word choice, measure words, aspect, word order, and register. Keep the corrected answer close to the learner's intended meaning and current level. Provide tone-mark pinyin and a faithful English translation. Explain the single most useful correction in plain English in no more than two sentences. Mention something specific the learner did well. Give one natural alternative, then write the next client reply in Simplified Chinese so the conversation can continue. If the answer needs work, make the retry prompt concrete and short. Do not provide medical diagnosis or expand beyond language coaching.`

export function validateFeedbackRequest(payload) {
  return FeedbackRequest.safeParse(payload)
}

export async function createMandarinFeedback({ payload, client, model = 'gpt-5.6-terra', style = 'responses' }) {
  const parsed = FeedbackRequest.parse(payload)
  const tutorInput = JSON.stringify({ learnerLevel: parsed.level, ...parsed.scenario, conversation: parsed.history, learnerAnswer: parsed.answer })

  if (style === 'chat') {
    const toolName = 'submit_mandarin_feedback'
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: `${teacherPrompt}\nYou must call the ${toolName} tool exactly once with the complete assessment.` },
        { role: 'user', content: tutorInput },
      ],
      tools: [zodFunction({ name: toolName, description: 'Return the complete Mandarin learner assessment.', parameters: MandarinFeedback })],
      tool_choice: { type: 'function', function: { name: toolName } },
    })
    const toolCall = completion.choices[0]?.message?.tool_calls?.find((call) => call.function?.name === toolName)
    if (!toolCall?.function?.arguments) throw new Error('The tutor did not call the structured feedback tool')
    return MandarinFeedback.parse(JSON.parse(toolCall.function.arguments))
  }

  const safetyIdentifier = `mandarin-${createHash('sha256').update(parsed.clientId).digest('hex').slice(0, 32)}`
  const response = await client.responses.parse({
    model,
    reasoning: { effort: 'low' },
    store: false,
    safety_identifier: safetyIdentifier,
    max_output_tokens: 900,
    input: [
      { role: 'system', content: teacherPrompt },
      { role: 'user', content: tutorInput },
    ],
    text: { format: zodTextFormat(MandarinFeedback, 'mandarin_feedback') },
  })

  if (!response.output_parsed) throw new Error('The tutor did not return structured feedback')
  return MandarinFeedback.parse(response.output_parsed)
}

export function createOpenAiClient(
  apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY,
  baseURL = process.env.OPENAI_BASE_URL || process.env.AI_BASE_URL,
) {
  if (!apiKey) return null
  return new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) })
}
