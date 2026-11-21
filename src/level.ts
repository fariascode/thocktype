// Account level from XP. XP is derived from the history itself, so it syncs with it and needs no extra storage.
import type { Result } from './stats.ts'

// ≈ correctly typed characters, plus a flat bonus for finishing; the official daily challenge counts double
export function xpFor(r: Result): number {
  const chars = Math.round((r.wpm * 5 * r.duration) / 60)
  return (chars + 20) * (r.mode === 'daily' ? 2 : 1)
}
export const totalXp = (h: Result[]) => h.reduce((a, r) => a + xpFor(r), 0)

// xp to go from level L to L+1: grows gently so early levels come fast and later ones take real practice
export const need = (level: number) => 300 + 100 * level

export function levelOf(xp: number) {
  let level = 1, rest = xp
  while (rest >= need(level)) { rest -= need(level); level++ }
  return { level, into: rest, need: need(level), progress: rest / need(level) }
}

const TITLES = ['novato', 'aprendiz', 'constante', 'ágil', 'veloz', 'experto', 'maestro', 'virtuoso', 'leyenda']
export const titleFor = (level: number) => TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 10))]
