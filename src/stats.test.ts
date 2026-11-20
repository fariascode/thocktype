// Self-check: run with `npm run check`
import assert from 'node:assert'
import { correctChars, wpm, consistency, charStats, streak, modeKey, bestWpm, type Result } from './stats.ts'

const old = { date: 0, wpm: 80, raw: 0, acc: 0, cons: 0, lang: 'es', duration: 30 } as Result
assert.equal(modeKey(old), modeKey({ ...old, mode: 'time', value: 30, punct: false }))
assert.notEqual(modeKey(old), modeKey({ ...old, mode: 'words', value: 30 }))
assert.equal(bestWpm([old, { ...old, wpm: 90, numbers: true }], modeKey(old)), 80)

assert.deepEqual(charStats(['hola', 'mundo', 'x'], ['hoka', 'mun', 'xyz']), { correct: 7, incorrect: 1, extra: 2, missed: 2 })
const day = 86400000, now = new Date(2026, 10, 19, 12).getTime()
const r = (date: number) => ({ date }) as Result
assert.equal(streak([r(now), r(now - day), r(now - 2 * day), r(now - 4 * day)], now), 3)
assert.equal(streak([r(now - day)], now), 1) // today not played yet keeps the streak
assert.equal(streak([r(now - 2 * day)], now), 0)

assert.equal(correctChars(['hola', 'mundo'], ['hola', 'mundo']), 10) // 4 + space + 5
assert.equal(correctChars(['hola', 'mundo'], ['hola', 'mund']), 5) // partial last word does not count
assert.equal(correctChars(['hola', 'mundo'], ['hoka', 'mundo']), 5)
assert.equal(wpm(50, 60), 10)
assert.equal(consistency([60, 60, 60]), 100)
assert.equal(consistency([0, 0]), 0)
console.log('stats ok')
