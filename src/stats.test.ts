// Self-check: run with `npm run check`
import assert from 'node:assert'
import { correctChars, wpm, consistency } from './stats.ts'

assert.equal(correctChars(['hola', 'mundo'], ['hola', 'mundo']), 10) // 4 + space + 5
assert.equal(correctChars(['hola', 'mundo'], ['hola', 'mund']), 5) // partial last word does not count
assert.equal(correctChars(['hola', 'mundo'], ['hoka', 'mundo']), 5)
assert.equal(wpm(50, 60), 10)
assert.equal(consistency([60, 60, 60]), 100)
assert.equal(consistency([0, 0]), 0)
console.log('stats ok')
