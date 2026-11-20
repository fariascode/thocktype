// Daily challenge: the same words for everyone on the same day and language, one official attempt.
import { randomWords, type Lang } from './words.ts'
import { dayKey } from './stats.ts'
import { APP_URL } from './config.ts'

export const DAILY_WORDS = 30
const LAUNCH = new Date(2026, 10, 19) // challenge #1

// FNV-1a string hash -> seed, mulberry32 -> deterministic generator
function hash(s: string) {
  let h = 2166136261
  for (const c of s) h = Math.imul(h ^ c.codePointAt(0)!, 16777619)
  return h >>> 0
}
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const dailyWords = (lang: Lang, day = dayKey(new Date())) =>
  randomWords(lang, DAILY_WORDS, {}, mulberry32(hash(`thocktype|${day}|${lang}`)))

export function challengeNumber(date = new Date()) {
  const a = Date.UTC(LAUNCH.getFullYear(), LAUNCH.getMonth(), LAUNCH.getDate())
  const b = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((b - a) / 86400000) + 1
}

// one square per word: ■ typed right, □ wrong; rows of 10 like a tiny poster
export function grid(targets: string[], typed: string[]) {
  const cells = targets.map((w, i) => (typed[i] === w ? '■' : '□'))
  const rows: string[] = []
  for (let i = 0; i < cells.length; i += 10) rows.push(cells.slice(i, i + 10).join(''))
  return rows.join('\n')
}

export type DailyEntry = { wpm: number; acc: number; grid: string }
const KEY = 'thocktype.daily'
const entryKey = (lang: Lang, day: string) => `${day}|${lang}`

export function loadDaily(): Record<string, DailyEntry> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
export const officialFor = (all: Record<string, DailyEntry>, lang: Lang, day = dayKey(new Date())) => all[entryKey(lang, day)]
export function saveOfficial(all: Record<string, DailyEntry>, lang: Lang, e: DailyEntry, day = dayKey(new Date())) {
  const next = { ...all, [entryKey(lang, day)]: e }
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage blocked: skip */ }
  return next
}

// consecutive days (ending today or yesterday) with an official attempt in any language
export function dailyStreak(all: Record<string, DailyEntry>, now = new Date()) {
  const days = new Set(Object.keys(all).map(k => k.split('|')[0]))
  const d = new Date(now)
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1) }
  return n
}

export const shareText = (n: number, lang: Lang, e: DailyEntry) =>
  `ThockType · reto #${n} (${lang})\n${e.wpm} wpm · ${e.acc}%\n${e.grid}\n${APP_URL}`
