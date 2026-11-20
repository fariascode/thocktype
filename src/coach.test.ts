// Self-check: run with `npm run check`
import assert from 'node:assert'
import { addBigram, mergeBigrams, slowBigrams, coachTip, type Bigrams } from './coach.ts'

const b: Bigrams = {}
for (let i = 0; i < 10; i++) addBigram(b, 'ho', 100)
for (let i = 0; i < 10; i++) addBigram(b, 'la', 100)
for (let i = 0; i < 3; i++) addBigram(b, 'qu', 300)
addBigram(b, 'zx', 900) // single sample: ignored (minN 2)
addBigram(b, 'a,', 900) // not two letters: ignored

const slow = slowBigrams(b)
assert.deepEqual(slow.map(x => x.pair), ['qu'])
assert.ok(slow[0].ratio > 1.5) // 300ms vs ~188ms average across all pairs
assert.deepEqual(slowBigrams({ ho: { n: 3, ms: 300 } }), []) // under 10 samples
assert.match(coachTip(slow), /«qu»/)
assert.match(coachTip([]), /parejo/)

const m = mergeBigrams({ ho: { n: 1, ms: 100 } }, { ho: { n: 2, ms: 300 }, la: { n: 1, ms: 50 } })
assert.deepEqual(m, { ho: { n: 3, ms: 400 }, la: { n: 1, ms: 50 } })
console.log('coach ok')
