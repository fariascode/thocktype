// Self-check: run with `npm run check`
import assert from 'node:assert'
import { cleanExtract } from './wiki.ts'

const raw = 'Antíoco XII Dioniso (en griego antiguo: Ἀντίοχος Διόνυσος (nacido c. 100 a. C.)), fue un monarca “helenístico” seléucida — que reinó  en Siria. ' + 'Fue hijo de Antíoco VIII y su esposa Cleopatra Tryphaena, y gobernó desde el año 87 a. C. hasta su muerte en batalla contra los nabateos.'
const w = cleanExtract(raw)!
assert.ok(w, 'long enough')
assert.ok(!w.join(' ').includes('('), 'parentheses removed')
assert.ok(!w.some(x => /[Ͱ-Ͽ]/.test(x)), 'greek dropped')
assert.ok(w.includes('"helenístico"') && w.includes('-'), 'quotes and dashes normalized')
assert.equal(cleanExtract('Francisco Martínez puede referirse a: muchas personas distintas en la historia de España y de América.'), null)
assert.equal(cleanExtract('Muy corto.'), null)
const long = Array.from({ length: 80 }, (_, i) => (i % 10 === 9 ? 'fin.' : 'palabra')).join(' ')
assert.ok(cleanExtract(long)!.length <= 60 && cleanExtract(long)!.at(-1) === 'fin.', 'cut at a sentence end')
console.log('wiki ok')
