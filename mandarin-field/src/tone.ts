import { useCallback, useEffect, useRef, useState } from 'react'

function detectPitch(buffer: Float32Array, sampleRate: number) {
  let rms = 0
  for (const value of buffer) rms += value * value
  if (Math.sqrt(rms / buffer.length) < .025) return 0
  let bestOffset = -1
  let bestCorrelation = 0
  for (let offset = Math.floor(sampleRate / 420); offset < Math.floor(sampleRate / 75); offset += 1) {
    let correlation = 0
    for (let index = 0; index < buffer.length - offset; index += 1) correlation += buffer[index] * buffer[index + offset]
    if (correlation > bestCorrelation) { bestCorrelation = correlation; bestOffset = offset }
  }
  return bestOffset > 0 ? sampleRate / bestOffset : 0
}

function normalize(values: number[]) {
  if (!values.length) return []
  const midi = values.map((value) => 69 + 12 * Math.log2(value / 440))
  const min = Math.min(...midi)
  const max = Math.max(...midi)
  const range = Math.max(2, max - min)
  return midi.map((value) => (value - min) / range)
}

export function contourScore(recorded: number[], target: number[]) {
  if (recorded.length < 5) return 0
  const normalized = normalize(recorded)
  let error = 0
  for (let index = 0; index < target.length; index += 1) {
    const sourceIndex = Math.min(normalized.length - 1, Math.round(index / Math.max(1, target.length - 1) * (normalized.length - 1)))
    error += Math.abs(normalized[sourceIndex] - target[index])
  }
  return Math.max(0, Math.round(100 - error / target.length * 115))
}

export function useToneRecorder() {
  const [recording, setRecording] = useState(false)
  const [contour, setContour] = useState<number[]>([])
  const [error, setError] = useState('')
  const cleanupRef = useRef<() => void>(() => {})
  useEffect(() => () => cleanupRef.current(), [])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setError('Microphone pitch analysis is not supported in this browser.'); return }
    try {
      setError(''); setContour([]); setRecording(true)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const context = new AudioContext()
      const analyser = context.createAnalyser()
      analyser.fftSize = 2048
      context.createMediaStreamSource(stream).connect(analyser)
      const buffer = new Float32Array(analyser.fftSize)
      const samples: number[] = []
      let frame = 0
      let stopped = false
      const finish = () => {
        if (stopped) return
        stopped = true
        cancelAnimationFrame(frame); stream.getTracks().forEach((track) => track.stop()); void context.close()
        setContour(samples); setRecording(false)
      }
      cleanupRef.current = finish
      const sample = () => {
        analyser.getFloatTimeDomainData(buffer)
        const pitch = detectPitch(buffer, context.sampleRate)
        if (pitch >= 75 && pitch <= 420) samples.push(pitch)
        if (!stopped) frame = requestAnimationFrame(sample)
      }
      sample()
      window.setTimeout(finish, 2800)
    } catch { setRecording(false); setError('Microphone access was unavailable. You can still listen to and trace the target contour.') }
  }, [])
  return { recording, contour, error, start }
}
