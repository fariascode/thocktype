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

import { randomQuote } from './words.ts'
for (let i = 0; i < 50; i++) {
  const q = randomQuote((['es', 'en', 'code'] as const)[i % 3])
  assert.ok(q.words.length > 2 && q.words.every(w => w.length > 0) && q.by, 'quotes split into words with an author')
}
console.log('quotes ok')

import { bigramWords } from './words.ts'
const bw = bigramWords('es', ['qu', 'ci'], 200)
assert.equal(bw.length, 200)
assert.ok(bw.filter(w => /qu|ci/i.test(w)).length > 120, 'mostly words with the slow pairs')
console.log('bigramWords ok')

import { plain, randomWords as rw } from './words.ts'
assert.equal(plain('acción ñandú pingüino ¿Qué?'), 'accion ñandu pinguino ¿Que?')
import en from './data/en.ts'
const first200 = new Set([...new Set(en.split(/\s+/).filter(Boolean))].slice(0, 200))
assert.ok(rw('en', 500, { pool: 200 }).every(x => first200.has(x))) // drawn only from the 200 most frequent
console.log('pools ok')
