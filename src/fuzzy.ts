// Fuzzy matching for the command palette: letters must appear in order, accents and case ignored.
// Higher score = better: consecutive letters and matches at word starts count more.
const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export function fuzzyScore(query: string, text: string): number {
  const q = norm(query).replace(/\s+/g, '')
  if (!q) return 0
  const t = norm(text)
  let score = 0, ti = 0, prev = -2
  for (const ch of q) {
    const at = t.indexOf(ch, ti)
    if (at < 0) return -1
    score += 1
    if (at === prev + 1) score += 3 // consecutive letters matter most
    if (at === 0 || /[\s:·/-]/.test(t[at - 1])) score += 2 // start of a word
    prev = at
    ti = at + 1
  }
  return score - t.length * 0.01 // shorter labels win ties
}

export function fuzzyFilter<T>(items: T[], query: string, text: (x: T) => string): T[] {
  if (!query.trim()) return items
  return items
    .map(x => ({ x, s: fuzzyScore(query, text(x)) }))
    .filter(r => r.s >= 0)
    .sort((a, b) => b.s - a.s)
    .map(r => r.x)
}
