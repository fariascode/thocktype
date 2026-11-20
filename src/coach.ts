// Typing coach: times every pair of consecutive letters (bigram) and finds the ones that slow you down.
// Letters alone hide the real problem: "q" may be fine but "qu" after a space is slow.
export type Bigrams = Record<string, { n: number; ms: number }> // n samples, ms total time

export function addBigram(b: Bigrams, pair: string, dt: number) {
  const e = (b[pair] ??= { n: 0, ms: 0 })
  e.n++
  e.ms += dt
}

export function mergeBigrams(a: Bigrams, b: Bigrams): Bigrams {
  const out: Bigrams = structuredClone(a)
  for (const [p, e] of Object.entries(b)) {
    const o = (out[p] ??= { n: 0, ms: 0 })
    o.n += e.n
    o.ms += e.ms
  }
  return out
}

export type Insight = { pair: string; avg: number; ratio: number }

// pairs at least 30% slower than your average pair, worst first
export function slowBigrams(b: Bigrams, minN = 2, top = 3): Insight[] {
  const all = Object.values(b)
  const n = all.reduce((s, e) => s + e.n, 0)
  if (n < 10) return [] // too little data to judge
  const overall = all.reduce((s, e) => s + e.ms, 0) / n
  return Object.entries(b)
    .filter(([p, e]) => e.n >= minN && /^\p{L}{2}$/u.test(p))
    .map(([pair, e]) => ({ pair, avg: e.ms / e.n, ratio: e.ms / e.n / overall }))
    .filter(x => x.ratio >= 1.3)
    .sort((x, y) => y.ratio - x.ratio)
    .slice(0, top)
}

export function coachTip(ins: Insight[]): string {
  if (!ins.length) return 'ritmo parejo: ninguna combinación de letras te está frenando'
  const [w] = ins
  const pct = Math.round((w.ratio - 1) * 100)
  return `«${w.pair}» te cuesta un ${pct}% más que tu promedio. Practicarla suelta los dedos para esa transición.`
}

const KEY = 'thocktype.bigrams'
export function loadBigrams(): Bigrams {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
export function saveBigrams(b: Bigrams) {
  try { localStorage.setItem(KEY, JSON.stringify(b)) } catch { /* storage blocked: skip */ }
}
