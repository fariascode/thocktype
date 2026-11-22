// Keystroke log of one test, for the word-by-word analysis and the replay on the result screen.
// Each entry is the state after a change: [ms since start, number of words, text of the last word].
// Earlier words keep the text they had, so applying the entries in order rebuilds what was typed at any moment.
export type LogEntry = [t: number, n: number, text: string]

export function stateAt(log: LogEntry[], t: number): string[] {
  const typed: string[] = []
  for (const [at, n, text] of log) {
    if (at > t) break
    typed.length = n
    typed[n - 1] = text
  }
  return Array.from(typed, w => w ?? '')
}

export type WordStat = { i: number; word: string; typed: string; wpm: number; errors: number; corrected: boolean }

// speed, mistakes and final text of every finished word; the last one counts if it was typed right
// (word tests end on its last letter, with no space), otherwise the word in progress at the end is left out
export function wordStats(log: LogEntry[], targets: string[]): WordStat[] {
  const typed: string[] = [], start: number[] = [], end: number[] = [], errors: number[] = []
  for (const [t, n, text] of log) {
    const i = n - 1, prev = typed[i] ?? ''
    if (n >= 2 && text === '' && typed.length === n - 1) end[i - 1] = t // a space finished word i-1
    if (text.length > prev.length) {
      if (start[i] === undefined) start[i] = t
      if (text[text.length - 1] !== targets[i]?.[text.length - 1]) errors[i] = (errors[i] ?? 0) + 1
    }
    typed.length = n
    typed[i] = text
  }
  const last = typed.length - 1
  const done = last >= 0 && typed[last] !== '' && typed[last] === targets[last]
  if (done) end[last] = log[log.length - 1][0]
  return targets.slice(0, Math.max(0, done ? typed.length : last)).map((word, i) => {
    const ms = Math.max(1, (end[i] ?? 0) - (start[i] ?? 0))
    const err = errors[i] ?? 0
    return { i, word, typed: typed[i] ?? '', wpm: Math.round((word.length + 1) / 5 / (ms / 60000)), errors: err, corrected: err > 0 && typed[i] === word }
  })
}

// slowest correctly finished words worth drilling (short words are mostly reaction time, so they're skipped)
export const slowest = (stats: WordStat[], n = 6) =>
  [...new Map(stats.filter(s => s.word.length >= 3 && s.typed === s.word).sort((a, b) => a.wpm - b.wpm).map(s => [s.word, s])).values()].slice(0, n)
