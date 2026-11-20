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

export type Mode = 'time' | 'words' | 'quote' | 'zen' | 'custom' | 'practice' | 'daily'
// duration = seconds the test lasted; value = 30 (s) in time mode or 50 (words) in words mode
export type Result = {
  date: number; wpm: number; raw: number; acc: number; cons: number; lang: string; duration: number
  punct?: boolean; numbers?: boolean; mode?: Mode; value?: number; rules?: string[]
}

// identifies "the same kind of test" for personal bests; old results (no mode) were time tests
export const modeKey = (r: Pick<Result, 'lang' | 'duration' | 'punct' | 'numbers' | 'mode' | 'value'>) => {
  const mode = r.mode ?? 'time'
  return [mode, r.value ?? (mode === 'time' ? r.duration : ''), r.lang, !!r.punct, !!r.numbers].join('|')
}

// correct / incorrect / extra / missed characters, like the breakdown on result screens
export function charStats(targets: string[], typed: string[]) {
  const s = { correct: 0, incorrect: 0, extra: 0, missed: 0 }
  typed.forEach((t, i) => {
    const w = targets[i]
    for (let c = 0; c < Math.min(t.length, w.length); c++) { if (t[c] === w[c]) s.correct++; else s.incorrect++ }
    if (t.length > w.length) s.extra += t.length - w.length
    else if (i < typed.length - 1) s.missed += w.length - t.length
  })
  return s
}

export const bestWpm = (h: Result[], key: string) => Math.max(0, ...h.filter(r => modeKey(r) === key).map(r => r.wpm))

// local-time day key, e.g. "2026-11-19"
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function dailyCounts(h: Result[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of h) {
    const k = dayKey(new Date(r.date))
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return m
}

export function longestStreak(h: Result[]): number {
  const days = [...dailyCounts(h).keys()].sort()
  let best = 0, run = 0, prev = ''
  for (const k of days) {
    const d = new Date(k + 'T12:00')
    d.setDate(d.getDate() - 1)
    run = prev === dayKey(d) ? run + 1 : 1
    best = Math.max(best, run)
    prev = k
  }
  return best
}

// consecutive days (ending today or yesterday) with at least one test
export function streak(h: Result[], now = Date.now()): number {
  const days = new Set(h.map(r => new Date(r.date).toDateString()))
  const d = new Date(now)
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1)
  let n = 0
  while (days.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1) }
  return n
}

// lifetime per-key counters, feeding the weak-key practice mode
export type KeyStats = { hits: Record<string, number>; errs: Record<string, number> }
const KKEY = 'thocktype.keys'
export function loadKeys(): KeyStats {
  try { return { hits: {}, errs: {}, ...JSON.parse(localStorage.getItem(KKEY) || '{}') } } catch { return { hits: {}, errs: {} } }
}
export function mergeKeys(a: KeyStats, b: KeyStats): KeyStats {
  const add = (x: Record<string, number>, y: Record<string, number>) => {
    const out = { ...x }
    for (const k in y) out[k] = (out[k] ?? 0) + y[k]
    return out
  }
  return { hits: add(a.hits, b.hits), errs: add(a.errs, b.errs) }
}
export function saveKeys(k: KeyStats) {
  try { localStorage.setItem(KKEY, JSON.stringify(k)) } catch { /* storage blocked: skip */ }
}

// letters with the highest error rate, ignoring keys typed too few times to judge
export function weakKeys({ hits, errs }: KeyStats, n = 4, minHits = 15): string[] {
  return Object.keys(errs)
    .filter(k => hits[k] >= minHits && errs[k] > 0 && /\p{L}/u.test(k))
    .sort((a, b) => errs[b] / hits[b] - errs[a] / hits[a])
    .slice(0, n)
}

const KEY = 'thocktype.history'
export function loadHistory(): Result[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
export function saveResult(r: Result) {
  try { localStorage.setItem(KEY, JSON.stringify([...loadHistory(), r])) } catch { /* storage blocked: skip */ }
}
