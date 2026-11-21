// Self-check: run with `npm run check`
import assert from 'node:assert'
import { levelOf, need, titleFor, totalXp, xpFor } from './level.ts'
import type { Result } from './stats.ts'

const r = (o: Partial<Result>) => ({ date: 0, wpm: 60, raw: 60, acc: 100, cons: 90, lang: 'es', duration: 30, ...o }) as Result
assert.equal(xpFor(r({})), 150 + 20)
assert.equal(xpFor(r({ mode: 'daily' })), 340)
assert.equal(totalXp([r({}), r({ wpm: 0 })]), 170 + 20)
assert.deepEqual(levelOf(0), { level: 1, into: 0, need: 400, progress: 0 })
assert.equal(levelOf(399).level, 1)
assert.equal(levelOf(400).level, 2)
assert.equal(levelOf(400 + need(2)).level, 3)
assert.equal(titleFor(1), 'novato'); assert.equal(titleFor(11), 'aprendiz'); assert.equal(titleFor(500), 'leyenda')
console.log('level ok')
