// Monkeytype-style: only correctly typed words (plus their space) count toward net WPM.
export function correctChars(targets: string[], typed: string[]): number {
  let n = 0
  typed.forEach((t, i) => {
    if (t === targets[i]) n += t.length + (i < typed.length - 1 ? 1 : 0)
  })
  return n
}

export const wpm = (chars: number, seconds: number) => (seconds > 0 ? chars / 5 / (seconds / 60) : 0)

// 100 - coefficient of variation of per-second raw WPM, clamped to 0..100
export function consistency(samples: number[]): number {
  if (samples.length < 2) return 100
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length
  if (mean === 0) return 0
  const sd = Math.sqrt(samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length)
  return Math.max(0, Math.min(100, 100 - (sd / mean) * 100))
}

export type Result = { date: number; wpm: number; raw: number; acc: number; cons: number; lang: string; duration: number }

const KEY = 'thocktype.history'
export function loadHistory(): Result[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
export function saveResult(r: Result) {
  try { localStorage.setItem(KEY, JSON.stringify([...loadHistory(), r])) } catch { /* storage blocked: skip */ }
}
