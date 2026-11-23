// Self-check: run with `npm run check`
import assert from 'node:assert'
import { setUiLang, t } from './i18n.ts'
import en from './i18n/en.ts'

const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',')
for (const [es, eng] of Object.entries(en)) {
  assert.ok(eng.trim(), `empty translation for "${es}"`)
  assert.equal(holes(eng), holes(es), `placeholders differ: "${es}" → "${eng}"`)
}
setUiLang('es'); assert.equal(t('hola {n}', { n: 3 }), 'hola 3')
setUiLang('en'); assert.equal(t('texto sin traducir'), 'texto sin traducir') // falls back to Spanish
console.log(`i18n ok (${Object.keys(en).length} texts)`)
