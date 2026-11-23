import es from './data/es.ts'
import en from './data/en.ts'
import code from './data/code.ts'
import quotes from './data/quotes.ts'
import quotesExtra from './data/quotesExtra.ts'
import codeLangs from './data/codeLangs.ts'
import codeQuotes from './data/codeQuotes.ts'
import codeBlocks from './data/codeBlocks.ts'
import codeBlocks2 from './data/codeBlocks2.ts'
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
// more natural languages; their word lists (from FrequencyWords) load on first use
export const EXTRA_LANGS = { pt: 'português', fr: 'français', de: 'deutsch', it: 'italiano', nl: 'nederlands', pl: 'polski' } as const
export const LANGS = { es: 'español', en: 'english', ...EXTRA_LANGS, ...CODE_LANGS, code: 'código' } as const
export type Lang = keyof typeof LANGS
export const BASE_LANGS = ['es', 'en', 'code'] as const // what the language chips show
export const isCode = (l: string) => l in CODE_LANGS

// frequency lists (10k words) for 5k/10k levels and the extra languages, downloaded only when needed
const freq: Partial<Record<string, string[]>> = {}
const FREQ = new Set(['es', 'en', ...Object.keys(EXTRA_LANGS)])
export function loadFreq(lang: string): Promise<void> {
  if (freq[lang] || !FREQ.has(lang)) return Promise.resolve()
  return import(`./data/freq/${lang}.ts`).then(m => { freq[lang] = (m.default as string).split(' ') })
}
// the words a test draws from: es/en keep their hand-made lists for 200/1k; bigger levels and other languages use frequency lists
function listFor(lang: string, pool?: number): string[] | undefined {
  if (lists[lang] && (!pool || pool <= 1000)) return pool ? lists[lang].slice(0, pool) : lists[lang]
  return freq[lang]?.slice(0, pool ?? 1000)
}
export const listReady = (lang: string, pool?: number) => !!listFor(lang, pool)

export function randomQuote(lang: Lang) {
  if (isCode(lang) && lang !== 'code' && codeQuotes[lang]) { // a snippet in that language
    const text = pick(codeQuotes[lang])
    return { words: text.split(' '), by: LANGS[lang] }
  }
  const pool = lang in EXTRA_LANGS ? quotesExtra[lang as keyof typeof quotesExtra] : quotes[isCode(lang) ? 'code' : (lang as 'es' | 'en')]
  const q = pool[Math.floor(Math.random() * pool.length)]
  return { words: q.text.split(' '), by: q.by }
}

const pick = <T,>(a: T[], rng = Math.random) => a[Math.floor(rng() * a.length)]

// "bloque" mode: a real multi-line function in that language ("code" = any language)
export function randomBlock(lang: Lang) {
  const key = codeBlocks[lang] ? lang : pick(Object.keys(codeBlocks)) as Lang
  const b = parseBlock(pick([...codeBlocks[key].code, ...(codeBlocks2[key] ?? [])]))
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
  const all = listFor(lang) ?? []
  const pool = all.filter(w => score(w) > 0).sort((a, b) => score(b) - score(a))
  if (!pool.length) return randomWords(lang, n)
  const top = pool.slice(0, Math.max(20, Math.ceil(pool.length / 2))) // favour words with several weak letters
  return Array.from({ length: n }, () => (Math.random() < 0.8 ? pick(top) : pick(all)))
}

// pool: draw only from the N most frequent words (lists are ordered by frequency); undefined = whole list
export type WordOpts = { punct?: boolean; numbers?: boolean; pool?: number }
export const POOLS = [200, 1000, 5000, 10000] as const

// "sin acentos": drops acute accents and diaeresis (á→a, ü→u) but keeps ñ, which is its own letter
export const plain = (w: string) => w.normalize('NFD').replace(/[\u0301\u0308]/g, '').normalize('NFC')

// punct: capitals + punctuation (ignored for code, which already has symbols); numbers: mixes in numbers
// rng: pass a seeded generator to get the same words for everyone (daily challenge)
export function randomWords(lang: Lang, n: number, { punct = false, numbers = false, pool }: WordOpts = {}, rng = Math.random): string[] {
  const list = listFor(lang, pool)
  if (!list) return [] // not loaded yet: call loadFreq first
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
