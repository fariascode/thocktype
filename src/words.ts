import es from './data/es.ts'
import en from './data/en.ts'
import code from './data/code.ts'
import quotes from './data/quotes.ts'
import codeLangs from './data/codeLangs.ts'
import codeQuotes from './data/codeQuotes.ts'
import codeBlocks from './data/codeBlocks.ts'
import { parseBlock } from './codeBlock.ts'

// unique, whitespace-separated (lists can span several lines)
const words = (txt: string) => [...new Set(txt.split(/\s+/).filter(Boolean))]

const lists: Record<string, string[]> = {
  es: words(es), en: words(en), code: words(code),
  ...Object.fromEntries(Object.entries(codeLangs).map(([k, v]) => [k, words(v)])),
}

// programming languages; "code" is the original mixed list
export const CODE_LANGS = {
  code: 'mixto', js: 'JavaScript', ts: 'TypeScript', py: 'Python', java: 'Java', c: 'C', cpp: 'C++', cs: 'C#', go: 'Go',
  rs: 'Rust', php: 'PHP', rb: 'Ruby', kt: 'Kotlin', swift: 'Swift', sql: 'SQL', html: 'HTML', css: 'CSS', sh: 'Bash',
} as const
export const LANGS = { es: 'español', en: 'english', ...CODE_LANGS, code: 'código' } as const
export type Lang = keyof typeof LANGS
export const BASE_LANGS = ['es', 'en', 'code'] as const // what the language chips show
export const isCode = (l: string) => l !== 'es' && l !== 'en'

export function randomQuote(lang: Lang) {
  if (isCode(lang) && lang !== 'code' && codeQuotes[lang]) { // a snippet in that language
    const text = pick(codeQuotes[lang])
    return { words: text.split(' '), by: LANGS[lang] }
  }
  const pool = quotes[isCode(lang) ? 'code' : (lang as 'es' | 'en')]
  const q = pool[Math.floor(Math.random() * pool.length)]
  return { words: q.text.split(' '), by: q.by }
}

const pick = <T,>(a: T[], rng = Math.random) => a[Math.floor(rng() * a.length)]

// "bloque" mode: a real multi-line function in that language ("code" = any language)
export function randomBlock(lang: Lang) {
  const key = codeBlocks[lang] ? lang : pick(Object.keys(codeBlocks)) as Lang
  const b = parseBlock(pick(codeBlocks[key].code))
  return { ...b, by: LANGS[key], kw: codeBlocks[key].kw.split(' ').filter(Boolean) }
}

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

// pool: draw only from the N most frequent words (lists are ordered by frequency); undefined = whole list
export type WordOpts = { punct?: boolean; numbers?: boolean; pool?: number }
export const POOLS = [200, 1000] as const

// "sin acentos": drops acute accents and diaeresis (á→a, ü→u) but keeps ñ, which is its own letter
export const plain = (w: string) => w.normalize('NFD').replace(/[\u0301\u0308]/g, '').normalize('NFC')

// punct: capitals + punctuation (ignored for code, which already has symbols); numbers: mixes in numbers
// rng: pass a seeded generator to get the same words for everyone (daily challenge)
export function randomWords(lang: Lang, n: number, { punct = false, numbers = false, pool }: WordOpts = {}, rng = Math.random): string[] {
  const list = pool ? lists[lang].slice(0, pool) : lists[lang]
  const out: string[] = []
  let capNext = true
  for (let i = 0; i < n; i++) {
    let w = pick(list, rng)
    // code: tokens with no letters (=, {}, %) show up about a third as often as words, like in real code
    if (isCode(lang)) for (let k = 0; k < 2 && !/\p{L}/u.test(w); k++) w = pick(list, rng)
    if (numbers && Math.random() < 0.12) w = String(Math.floor(Math.random() * 10 ** (1 + Math.floor(Math.random() * 4))))
    if (punct && !isCode(lang)) {
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
