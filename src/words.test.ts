// Self-check: run with `npm run check`
import assert from 'node:assert'
import { weakWords, randomWords } from './words.ts'

const w = weakWords('es', ['ñ', 'z'], 200)
assert.equal(w.length, 200)
assert.ok(w.filter(x => /[ñz]/i.test(x)).length > 120, 'mostly weak-letter words')
assert.equal(weakWords('es', ['§'], 5).length, 5) // no matching words falls back to random
assert.ok(randomWords('en', 300, { numbers: true }).some(x => /^\d+$/.test(x)))
for (const lang of ['es', 'en'] as const) {
  const sample = randomWords(lang, 500)
  assert.ok(sample.includes('es') || sample.includes('is') || sample.some(w => w.includes('s')), `${lang}: words keep their letter s`)
  assert.ok(sample.every(w => w.length > 0 && !/\s/.test(w)), `${lang}: no empty or spaced words`)
}
console.log('words ok')
