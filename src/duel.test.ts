// Self-check: run with `npm run check`
import assert from 'node:assert'
import { decodeDuel, decodeLog, encodeDuel, encodeLog } from './duel.ts'
import type { LogEntry } from './replay.ts'

// "año ab" with a mistake, a backspace, going back into the previous word, and ctrl+backspace
const log: LogEntry[] = [
  [0, 1, 'a'], [90, 1, 'añ'], [180, 1, 'añx'], [260, 1, 'añ'], [330, 1, 'año'], [420, 2, ''], [500, 1, 'año'],
  [560, 2, ''], [640, 2, 'a'], [700, 2, ''], [760, 2, 'a'], [5000, 2, 'ab'],
]
assert.deepEqual(decodeLog(encodeLog(log)!), log)
assert.equal(encodeLog([[0, 1, 'ab']]), null) // two letters at once: not describable, so no link

const d = { name: 'Ana', lang: 'es', mode: 'words' as const, value: 10, words: ['año', 'ab'], log, wpm: 88, acc: 96 }
assert.deepEqual(decodeDuel(encodeDuel(d)!), d)
assert.equal(decodeDuel('basura'), null)
assert.equal(decodeDuel(encodeDuel({ ...d, wpm: 999 })!), null) // impossible result rejected
console.log('duel ok')
