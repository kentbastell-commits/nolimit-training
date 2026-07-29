import { useCallback, useEffect, useRef, useState } from 'react'

type RecognitionResult = { 0: { transcript: string } }
type RecognitionEvent = Event & { results: ArrayLike<RecognitionResult> }
type RecognitionInstance = EventTarget & {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  onresult: ((event: RecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}
type RecognitionConstructor = new () => RecognitionInstance

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
}

export function getChineseVoices() {
  if (!('speechSynthesis' in window)) return []
  return window.speechSynthesis.getVoices().filter((candidate) => candidate.lang.toLowerCase().startsWith('zh'))
}

export function speakChinese(text: string, rate = 0.82, voiceIndex = 0) {
  if (!('speechSynthesis' in window)) return false
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'zh-CN'
  utterance.rate = rate
  const voices = getChineseVoices()
  const voice = voices[voiceIndex % Math.max(1, voices.length)]
  if (voice) utterance.voice = voice
  window.speechSynthesis.speak(utterance)
  return true
}

export function useSpeechRecognition() {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [supported] = useState(() => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition))
  const recognitionRef = useRef<RecognitionInstance | null>(null)

  useEffect(() => () => recognitionRef.current?.stop(), [])

  const start = useCallback(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) return
    const recognition = new Recognition()
    recognition.lang = 'zh-CN'
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onresult = (event) => {
      const value = Array.from(event.results).map((result) => result[0].transcript).join('')
      setTranscript(value)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    setTranscript('')
    setListening(true)
    recognition.start()
  }, [])

  const stop = useCallback(() => recognitionRef.current?.stop(), [])
  const clear = useCallback(() => setTranscript(''), [])
  return { supported, listening, transcript, start, stop, clear, setTranscript }
}
