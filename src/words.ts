import es from './data/es.ts'
import en from './data/en.ts'
import code from './data/code.ts'

// unique, whitespace-separated (lists can span several lines)
const words = (txt: string) => [...new Set(txt.split(/\s+/).filter(Boolean))]

const lists: Record<string, string[]> = { es: words(es), en: words(en), code: words(code) }

export const LANGS = { es: 'español', en: 'english', code: 'código' } as const
export type Lang = keyof typeof LANGS

// shortcut: a handful of quotes per language, move to a JSON file when the collection grows
const quotes: Record<Lang, { text: string; by: string }[]> = {
  es: [
    { text: 'En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor.', by: 'Miguel de Cervantes' },
    { text: 'Muchos años después, frente al pelotón de fusilamiento, el coronel Aureliano Buendía había de recordar aquella tarde remota en que su padre lo llevó a conocer el hielo.', by: 'Gabriel García Márquez' },
    { text: 'Caminante, no hay camino, se hace camino al andar.', by: 'Antonio Machado' },
    { text: 'Podrán cortar todas las flores, pero no podrán detener la primavera.', by: 'Pablo Neruda' },
    { text: 'La vida no es la que uno vivió, sino la que uno recuerda y cómo la recuerda para contarla.', by: 'Gabriel García Márquez' },
    { text: 'Andábamos sin buscarnos, pero sabiendo que andábamos para encontrarnos.', by: 'Julio Cortázar' },
    { text: 'El que lee mucho y anda mucho, ve mucho y sabe mucho.', by: 'Miguel de Cervantes' },
  ],
  en: [
    { text: 'The only way to do great work is to love what you do. If you have not found it yet, keep looking. Do not settle.', by: 'Steve Jobs' },
    { text: 'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.', by: 'Charles Dickens' },
    { text: 'Simplicity is prerequisite for reliability.', by: 'Edsger Dijkstra' },
    { text: 'Do not go where the path may lead, go instead where there is no path and leave a trail.', by: 'Ralph Waldo Emerson' },
    { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', by: 'Will Durant' },
    { text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.', by: 'Martin Fowler' },
  ],
  code: [
    { text: 'const sum = (a, b) => a + b; console.log(sum(2, 3));', by: 'javascript' },
    { text: 'for (let i = 0; i < items.length; i++) { if (items[i].done) count++; }', by: 'javascript' },
    { text: 'def fib(n): return n if n < 2 else fib(n - 1) + fib(n - 2)', by: 'python' },
    { text: 'const [state, setState] = useState(0); useEffect(() => { document.title = `${state}`; }, [state]);', by: 'react' },
    { text: 'SELECT name, COUNT(*) FROM users WHERE active = 1 GROUP BY name ORDER BY 2 DESC;', by: 'sql' },
    { text: 'git checkout -b feat/nueva && git commit -m "feat: algo nuevo" && git push', by: 'shell' },
  ],
}

export function randomQuote(lang: Lang) {
  const q = quotes[lang][Math.floor(Math.random() * quotes[lang].length)]
  return { words: q.text.split(' '), by: q.by }
}

const pick =<T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

// Keybr-style drill: words rich in the given weak letters, with some plain words so it still reads naturally
export function weakWords(lang: Lang, weak: string[], n: number): string[] {
  const score = (w: string) => [...w.toLowerCase()].filter(c => weak.includes(c)).length
  const pool = lists[lang].filter(w => score(w) > 0).sort((a, b) => score(b) - score(a))
  if (!pool.length) return randomWords(lang, n)
  const top = pool.slice(0, Math.max(20, Math.ceil(pool.length / 2))) // favour words with several weak letters
  return Array.from({ length: n }, () => (Math.random() < 0.8 ? pick(top) : pick(lists[lang])))
}

export type WordOpts ={ punct?: boolean; numbers?: boolean }

// punct: capitals + punctuation (ignored for code, which already has symbols); numbers: mixes in numbers
export function randomWords(lang: Lang, n: number, { punct = false, numbers = false }: WordOpts = {}): string[] {
  const list = lists[lang]
  const out: string[] = []
  let capNext = true
  for (let i = 0; i < n; i++) {
    let w = pick(list)
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
