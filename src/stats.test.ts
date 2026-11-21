// Self-check: run with `npm run check`
import assert from 'node:assert'
import { correctChars, wpm, consistency, charStats, streak, modeKey, bestWpm, mergeKeys, weakKeys, dailyCounts, dayKey, longestStreak, type Result } from './stats.ts'

const ks = mergeKeys({ hits: { a: 10, b: 20 }, errs: { a: 1 } }, { hits: { a: 10, c: 20, ',': 20 }, errs: { b: 10, c: 2, ',': 15 } })
assert.deepEqual(ks.hits, { a: 20, b: 20, c: 20, ',': 20 })
assert.deepEqual(weakKeys(ks), ['b', 'c', 'a']) // ',' is not a letter; worst rate first

const old = { date: 0, wpm: 80, raw: 0, acc: 0, cons: 0, lang: 'es', duration: 30 } as Result
assert.equal(modeKey(old), modeKey({ ...old, mode: 'time', value: 30, punct: false }))
assert.notEqual(modeKey(old), modeKey({ ...old, mode: 'words', value: 30 }))
assert.equal(bestWpm([old, { ...old, wpm: 90, numbers: true }], modeKey(old)), 80)
assert.equal(bestWpm([old, { ...old, wpm: 99, pool: 200 }, { ...old, wpm: 98, plain: true }], modeKey(old)), 80) // 200-word and accent-free runs are their own records

assert.deepEqual(charStats(['hola', 'mundo', 'x'], ['hoka', 'mun', 'xyz']), { correct: 7, incorrect: 1, extra: 2, missed: 2 })
const day = 86400000, now = new Date(2026, 10, 19, 12).getTime()
const r = (date: number) => ({ date }) as Result
assert.equal(streak([r(now), r(now - day), r(now - 2 * day), r(now - 4 * day)], now), 3)
assert.equal(streak([r(now - day)], now), 1) // today not played yet keeps the streak
assert.equal(streak([r(now - 2 * day)], now), 0)

const hist = [r(now), r(now), r(now - day), r(now - 5 * day), r(now - 6 * day), r(now - 7 * day), r(now - 8 * day)]
assert.equal(dailyCounts(hist).get(dayKey(new Date(now))), 2)
assert.equal(longestStreak(hist), 4)
assert.equal(longestStreak([]), 0)
// month boundary: Oct 31 -> Nov 1 counts as consecutive
assert.equal(longestStreak([r(new Date(2026, 9, 31, 12).getTime()), r(new Date(2026, 10, 1, 12).getTime())]), 2)

assert.equal(correctChars(['hola', 'mundo'], ['hola', 'mundo']), 10) // 4 + space + 5
assert.equal(correctChars(['hola', 'mundo'], ['hola', 'mund']), 5) // partial last word does not count
assert.equal(correctChars(['hola', 'mundo'], ['hoka', 'mundo']), 5)
assert.equal(wpm(50, 60), 10)
assert.equal(consistency([60, 60, 60]), 100)
assert.equal(consistency([0, 0]), 0)
console.log('stats ok')

import { personalBests, lifetime, formatDuration } from './stats.ts'
const PR = (o: Partial<Result>) => ({ date: 0, wpm: 50, raw: 55, acc: 95, cons: 80, lang: 'es', duration: 30, ...o }) as Result
const pbHist = [
  PR({ wpm: 80 }), PR({ wpm: 90, acc: 92 }), PR({ wpm: 90, acc: 97 }),     // old time results (no mode/value), tie broken by accuracy
  PR({ mode: 'time', value: 60, duration: 60, wpm: 70 }),
  PR({ mode: 'words', value: 25, duration: 20, wpm: 100 }),
  PR({ mode: 'quote', wpm: 200 }), PR({ mode: 'daily', wpm: 150 }),        // not personal-best slots
]
const pbs = personalBests(pbHist)
assert.equal(pbs.time[30]!.acc, 97)
assert.equal(pbs.time[60]!.wpm, 70)
assert.equal(pbs.words[25]!.wpm, 100)
assert.equal(pbs.time[15], undefined)
const life = lifetime(pbHist)
assert.equal(life.tests, 7); assert.equal(life.top, 200); assert.equal(life.seconds, 30 * 6 + 20 + 60 - 30)
assert.equal(formatDuration(4510), '1 h 15 min'); assert.equal(formatDuration(95), '1 min 35 s'); assert.equal(formatDuration(42), '42 s')
console.log('personal bests ok')
