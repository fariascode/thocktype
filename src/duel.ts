// Duel links: the exact words, the challenger's result and their keystroke log travel inside the URL, so a friend
// races the real run (pauses and mistakes included) with no server involved.
import type { LogEntry } from './replay.ts'

export type Duel = { name?: string; lang: string; mode: 'time' | 'words' | 'quote'; value: number; words: string[]; log: LogEntry[]; wpm: number; acc: number }

// one op per log entry: a typed character, or one of these markers (never typed: they are control characters)
const BACK = '\u0001', CLEAR = '\u0002', PREV = '\u0003', NEXT = ' '
const dt36 = (ms: number) => Math.max(0, Math.min(46655, Math.round(ms))).toString(36).padStart(3, '0')

export function encodeLog(log: LogEntry[]): string | null {
  const typed = [''] // a test starts with one empty word
  let out = '', last = 0
  for (const [t, n, text] of log) {
    const prev = typed[n - 1] ?? ''
    let op: string
    if (n === typed.length + 1 && text === '') op = NEXT
    else if (n === typed.length - 1 && text === typed[n - 1]) op = PREV
    else if (n !== typed.length) return null
    else if (text.length === prev.length + 1 && text.startsWith(prev) && text.slice(-1) > '\u0003') op = text.slice(-1)
    else if (text === prev.slice(0, -1)) op = BACK
    else if (text === '') op = CLEAR
    else return null // a change this format can't describe: no duel link rather than a wrong one
    out += dt36(t - last) + op
    last = t
    typed.length = n
    typed[n - 1] = text
  }
  return out
}

export function decodeLog(s: string): LogEntry[] {
  const log: LogEntry[] = [], typed = ['']
  let t = 0
  for (let i = 0; i < s.length; ) {
    t += parseInt(s.slice(i, i + 3), 36)
    const ch = [...s.slice(i + 3, i + 5)][0] // one character, even outside the basic plane
    i += 3 + ch.length
    if (ch === NEXT) typed.push('')
    else if (ch === PREV) typed.pop()
    else if (ch === BACK) typed[typed.length - 1] = typed[typed.length - 1].slice(0, -1)
    else if (ch === CLEAR) typed[typed.length - 1] = ''
    else typed[typed.length - 1] += ch
    log.push([t, typed.length, typed[typed.length - 1]])
  }
  return log
}

const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)))

export function encodeDuel(d: Duel): string | null {
  const k = encodeLog(d.log)
  if (k === null) return null
  return b64(JSON.stringify({ v: 1, n: d.name, l: d.lang, m: d.mode, x: d.value, w: d.words.join(' '), k, s: d.wpm, a: d.acc }))
}

// links come from anyone: everything is checked before it is used
export function decodeDuel(code: string): Duel | null {
  try {
    const o = JSON.parse(unb64(code))
    const ok = o.v === 1 && ['es', 'en', 'code'].includes(o.l) && ['time', 'words', 'quote'].includes(o.m)
      && typeof o.w === 'string' && o.w.length <= 6000 && typeof o.k === 'string' && o.k.length <= 20000
      && Number.isFinite(o.s) && o.s >= 0 && o.s <= 350 && Number.isFinite(o.a) && o.a >= 0 && o.a <= 100 && Number.isFinite(o.x)
    if (!ok) return null
    const words = o.w.split(' ').filter(Boolean)
    if (!words.length) return null
    return { name: typeof o.n === 'string' ? o.n.slice(0, 40) : undefined, lang: o.l, mode: o.m, value: o.x, words, log: decodeLog(o.k), wpm: o.s, acc: o.a }
  } catch { return null }
}
