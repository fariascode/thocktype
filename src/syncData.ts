// Pure conversions between local data and Supabase rows (see supabase/schema.sql). No network here.
import type { Mode, Result } from './stats.ts'
import type { DailyEntry } from './daily.ts'

export type ResultRow = {
  user_id: string; date: string; wpm: number; raw: number; acc: number; cons: number; lang: string
  mode: Mode; value: number | null; duration: number; punct: boolean; numbers: boolean; rules: string[]
}

const LANGS = ['es', 'en', 'code']
const inRange = (n: number, lo: number, hi: number) => Number.isFinite(n) && n >= lo && n <= hi

// null when the result breaks a server limit, so one odd local result can't make a whole upload fail
export function toRow(uid: string, r: Result): ResultRow | null {
  const mode = r.mode ?? 'time'
  const row: ResultRow = {
    user_id: uid, date: new Date(r.date).toISOString(), wpm: r.wpm, raw: r.raw, acc: r.acc, cons: r.cons,
    lang: r.lang, mode, value: r.value ?? (mode === 'time' ? r.duration : null), duration: Math.max(1, r.duration),
    punct: !!r.punct, numbers: !!r.numbers, rules: r.rules ?? [],
  }
  const ok = inRange(row.wpm, 0, 350) && inRange(row.raw, 0, 450) && inRange(row.acc, 0, 100) && inRange(row.cons, 0, 100)
    && inRange(row.duration, 1, 3600) && LANGS.includes(row.lang) && !Number.isNaN(Date.parse(row.date))
  return ok ? row : null
}

export function fromRow(row: ResultRow): Result {
  return {
    date: Date.parse(row.date), wpm: row.wpm, raw: row.raw, acc: row.acc, cons: row.cons, lang: row.lang,
    duration: row.duration, mode: row.mode, value: row.value ?? undefined,
    punct: row.punct, numbers: row.numbers, rules: row.rules.length ? row.rules : undefined,
  }
}

// union by timestamp (a test's identity), oldest first; local copy wins on equal dates
export function mergeHistory(local: Result[], remote: Result[]): Result[] {
  const byDate = new Map(remote.map(r => [r.date, r]))
  for (const r of local) byDate.set(r.date, r)
  return [...byDate.values()].sort((a, b) => a.date - b.date)
}

export type DailyRow = { user_id: string; day: string; lang: string; wpm: number; acc: number; grid: string }

// local daily keys are "YYYY-MM-DD|lang"; the server only accepts recent days, so send just those
export function toDailyRows(uid: string, all: Record<string, DailyEntry>, minDay: string): DailyRow[] {
  return Object.entries(all)
    .map(([k, e]) => { const [day, lang] = k.split('|'); return { user_id: uid, day, lang, ...e } })
    .filter(r => r.day >= minDay && LANGS.includes(r.lang) && inRange(r.wpm, 0, 300))
}

// the server copy is the official one (it can't be edited), so it wins over local attempts
export function mergeDaily(local: Record<string, DailyEntry>, rows: DailyRow[]): Record<string, DailyEntry> {
  const out = { ...local }
  for (const r of rows) out[`${r.day}|${r.lang}`] = { wpm: r.wpm, acc: r.acc, grid: r.grid }
  return out
}
