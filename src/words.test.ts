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

import { isCode, LANGS as L, randomQuote as rq, randomWords as rw2 } from './words.ts'
import codeLangs from './data/codeLangs.ts'
for (const k of Object.keys(codeLangs)) {
  assert.ok(k in L, `${k} has a label`)
  const w = rw2(k as keyof typeof L, 50)
  assert.equal(w.length, 50); assert.ok(w.every(x => x && !/\s/.test(x)), `${k} words are single tokens`)
  assert.ok(rq(k as keyof typeof L).words.length > 2, `${k} has snippets`)
}
assert.ok(isCode('py') && isCode('code') && !isCode('es'))
assert.equal(rw2('py', 30, { punct: true }).some(x => /^[A-Z]/.test(x) && !/^(True|False|None)$/.test(x)), false) // no capitalizing code
console.log('code languages ok')
const sym = rw2('py', 2000).filter(x => !/\p{L}/u.test(x)).length / 2000
assert.ok(sym < 0.12, `symbol-only tokens are a minority (${sym})`)
console.log('code balance ok')

import { loadFreq, listReady, randomWords as rw3 } from './words.ts'
assert.equal(listReady('fr'), false)
await loadFreq('fr'); await loadFreq('es')
assert.ok(listReady('fr') && listReady('fr', 10000) && listReady('es', 5000))
assert.ok(rw3('fr', 50).every(w => /^\p{L}+$/u.test(w)), 'french words are letters only')
const top1k = rw3('fr', 500)
assert.ok(new Set(rw3('fr', 2000, { pool: 10000 })).size > new Set(top1k).size, '10k draws from more words than 1k')
assert.ok(listReady('es', 200) && rw3('es', 5, { pool: 200 }).length === 5, 'es 200 still uses the hand-made list')
console.log('levels ok')

import quotesExtra from './data/quotesExtra.ts'
for (const [lang, list] of Object.entries(quotesExtra)) {
  assert.ok(list.length >= 9, `${lang} has quotes`)
  for (const q of list) assert.ok(q.by && !/[’‘“”]/.test(q.text) && !q.text.includes('  '), `${lang}: "${q.text}" uses keyboard quotes and single spaces`)
  const q = rq(lang as keyof typeof L)
  assert.ok(list.some(x => x.text.split(' ').join(' ') === q.words.join(' ')), `${lang} cita mode draws from its quotes`)
}
console.log('extra quotes ok')

import codeBlocks from './data/codeBlocks.ts'
import codeBlocks2 from './data/codeBlocks2.ts'
import { parseBlock as pb } from './codeBlock.ts'
for (const [lang, { code }] of Object.entries(codeBlocks)) {
  const all = [...code, ...(codeBlocks2[lang] ?? [])]
  assert.ok(all.length >= 6, `${lang} has at least 6 blocks`)
  for (const src of all) {
    const b = pb(src)
    assert.ok(b.words.length >= 5 && !b.words.some(w => /\s/.test(w)), `${lang}: block parses into words`)
    assert.ok(src.split('\n').every(l => l.replace(/\t/g, '    ').length <= 90), `${lang}: lines fit the screen`)
    assert.ok(!src.includes('’') && !src.includes('“'), `${lang}: keyboard quotes only`)
  }
}
console.log('code blocks ok')
