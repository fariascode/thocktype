import es from './data/es.ts'
import en from './data/en.ts'
import code from './data/code.ts'
import quotes from './data/quotes.ts'

// unique, whitespace-separated (lists can span several lines)
const words = (txt: string) => [...new Set(txt.split(/\s+/).filter(Boolean))]

const lists: Record<string, string[]> = { es: words(es), en: words(en), code: words(code) }

export const LANGS = { es: 'español', en: 'english', code: 'código' } as const
export type Lang = keyof typeof LANGS

export function randomQuote(lang: Lang) {
  const q = quotes[lang][Math.floor(Math.random() * quotes[lang].length)]
  return { words: q.text.split(' '), by: q.by }
}

const pick = <T,>(a: T[], rng = Math.random) => a[Math.floor(rng() * a.length)]

// Keybr-style drill: words rich in the given weak letters, with some plain words so it still reads naturally
export function weakWords(lang: Lang, weak: string[], n: number): string[] {
  return drill(lang, w => [...w.toLowerCase()].filter(c => weak.includes(c)).length, n)
}

// coach drill: words containing the slow letter pairs (e.g. "qu", "ci")
export function bigramWords(lang: Lang, pairs: string[], n: number): string[] {
  return drill(lang, w => pairs.reduce((s, p) => s + w.toLowerCase().split(p).length - 1, 0), n)
}

function drill(lang: Lang, score: (w: string) => number, n: number): string[] {
  const pool = lists[lang].filter(w => score(w) > 0).sort((a, b) => score(b) - score(a))
  if (!pool.length) return randomWords(lang, n)
  const top = pool.slice(0, Math.max(20, Math.ceil(pool.length / 2))) // favour words with several weak letters
  return Array.from({ length: n }, () => (Math.random() < 0.8 ? pick(top) : pick(lists[lang])))
}

export type WordOpts ={ punct?: boolean; numbers?: boolean }

// punct: capitals + punctuation (ignored for code, which already has symbols); numbers: mixes in numbers
// rng: pass a seeded generator to get the same words for everyone (daily challenge)
export function randomWords(lang: Lang, n: number, { punct = false, numbers = false }: WordOpts = {}, rng = Math.random): string[] {
  const list = lists[lang]
  const out: string[] = []
  let capNext = true
  for (let i = 0; i < n; i++) {
    let w = pick(list, rng)
    if (numbers && Math.random() < 0.12) w = String(Math.floor(Math.random() * 10 ** (1 + Math.floor(Math.random() * 4))))
    if (punct && lang !== 'code') {
      if (capNext) w = w[0].toUpperCase() + w.slice(1)
      capNext = false
      const r = Math.random()
      if (r < 0.1) { w += pick(['.', '.', '?', '!']); capNext = true }
      else if (r < 0.2) w += pick([',', ',', ';', ':'])
      if (lang === 'es' && w.endsWith('?')) w = '¿' + w
    }
    out.push(w)
  }
  return out
}
