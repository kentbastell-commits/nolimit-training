import assert from 'node:assert/strict'
import test from 'node:test'
import { createMandarinFeedback, validateFeedbackRequest } from './feedback.mjs'

const payload = {
  clientId: 'private-browser-id-123',
  level: 3,
  answer: '我们先热身。',
  history: [{ role: 'client', text: '你今天感觉怎么样？' }],
  scenario: {
    id: 'check-in',
    title: 'Client check-in',
    chineseTitle: '训练前沟通',
    setting: 'Before a coaching session',
    goal: 'Ask, listen, and adjust.',
    opening: '我昨晚没睡好。',
    suggestedReplies: ['我们先热身。'],
    targetTerms: ['热身', '调整'],
  },
}

const parsedFeedback = {
  verdict: 'understandable',
  correctedChinese: '我们先热身，再根据你的情况调整训练。',
  pinyin: 'Wǒmen xiān rèshēn, zài gēnjù nǐ de qíngkuàng tiáozhěng xùnliàn.',
  english: 'We will warm up first, then adjust the training according to your condition.',
  explanation: 'Add the basis for the adjustment with 根据.',
  strengths: 'The sequence is clear.',
  nativeAlternative: '先热身，然后看情况调整。',
  nextReply: '好的，我们先热身。',
  nextReplyPinyin: 'Hǎo de, wǒmen xiān rèshēn.',
  retryPrompt: 'Say it once from memory.',
  targetTermsUsed: ['热身'],
}

test('validates and bounds browser feedback requests', () => {
  assert.equal(validateFeedbackRequest(payload).success, true)
  assert.equal(validateFeedbackRequest({ ...payload, answer: '' }).success, false)
  assert.equal(validateFeedbackRequest({ ...payload, answer: '好'.repeat(501) }).success, false)
})

test('uses structured Responses output without storage or a raw client identifier', async () => {
  let request
  const client = { responses: { parse: async (value) => { request = value; return { output_parsed: parsedFeedback } } } }
  const feedback = await createMandarinFeedback({ payload, client, model: 'gpt-5.6-terra' })

  assert.deepEqual(feedback, parsedFeedback)
  assert.equal(request.model, 'gpt-5.6-terra')
  assert.equal(request.store, false)
  assert.equal(request.reasoning.effort, 'low')
  assert.match(request.safety_identifier, /^mandarin-[a-f0-9]{32}$/)
  assert.equal(request.safety_identifier.includes(payload.clientId), false)
  assert.equal(request.text.format.type, 'json_schema')
})
