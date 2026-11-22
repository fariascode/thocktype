// Self-check: run with `npm run check`
import assert from 'node:assert'
import { slowest, stateAt, wordStats, type LogEntry } from './replay.ts'

// "hola mundo": h-o-l-a, space, m-u-x (wrong), backspace, n-d-o
const log: LogEntry[] = [
  [0, 1, 'h'], [100, 1, 'ho'], [200, 1, 'hol'], [300, 1, 'hola'], [400, 2, ''],
  [500, 2, 'm'], [600, 2, 'mu'], [700, 2, 'mux'], [800, 2, 'mu'], [900, 2, 'mun'], [1000, 2, 'mund'], [1100, 2, 'mundo'], [1200, 3, ''],
]
assert.deepEqual(stateAt(log, 750), ['hola', 'mux'])
assert.deepEqual(stateAt(log, 1250), ['hola', 'mundo', ''])
assert.deepEqual(stateAt(log, -1), [])
const ws = wordStats(log, ['hola', 'mundo', 'otra'])
assert.deepEqual(ws.map(w => [w.word, w.errors, w.corrected, w.typed]), [['hola', 0, false, 'hola'], ['mundo', 1, true, 'mundo']])
assert.equal(ws[0].wpm, Math.round(5 / 5 / (400 / 60000))) // 4 letters + space in 400 ms = 150 wpm
// going back into a wrong word keeps its earlier text
assert.deepEqual(stateAt([[0, 1, 'ab'], [10, 2, ''], [20, 1, 'ab'], [30, 1, 'a']], 30), ['a'])
assert.deepEqual(slowest(ws).map(w => w.word), ['mundo', 'hola'])
// a test that ends on the last letter (word mode) still counts its last word
assert.deepEqual(wordStats([[0, 1, 'a'], [100, 1, 'ab'], [200, 2, ''], [300, 2, 'c']], ['ab', 'c']).map(w => w.word), ['ab', 'c'])
assert.deepEqual(wordStats([[0, 1, 'a'], [100, 1, 'ab'], [200, 2, ''], [300, 2, 'x']], ['ab', 'cd']).map(w => w.word), ['ab'])
console.log('replay ok')
