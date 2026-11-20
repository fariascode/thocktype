// Self-check: run with `npm run check`
import assert from 'node:assert'
import { toRow, fromRow, mergeHistory, toDailyRows, mergeDaily } from './syncData.ts'
import type { Result } from './stats.ts'

const r: Result = { date: Date.UTC(2026, 10, 19, 12), wpm: 90, raw: 95, acc: 97, cons: 80, lang: 'es', duration: 30 }
const row = toRow('u1', r)!
assert.equal(row.mode, 'time') // old results had no mode
assert.equal(row.value, 30)
assert.deepEqual(fromRow(row), { ...r, mode: 'time', value: 30, punct: false, numbers: false, rules: undefined })
assert.equal(toRow('u1', { ...r, wpm: 363 }), null) // over the server limit: skipped, not fatal
assert.equal(toRow('u1', { ...r, lang: 'fr' }), null)

const a = { ...r, date: 1 }, b = { ...r, date: 2 }, b2 = { ...r, date: 2, wpm: 50 }, c = { ...r, date: 3 }
assert.deepEqual(mergeHistory([c, b], [a, b2]).map(x => [x.date, x.wpm]), [[1, 90], [2, 90], [3, 90]])

const local = { '2026-11-19|es': { wpm: 80, acc: 99, grid: '■' }, '2026-11-01|es': { wpm: 70, acc: 90, grid: '□' }, '2026-11-19|fr': { wpm: 1, acc: 1, grid: '' } }
assert.deepEqual(toDailyRows('u1', local, '2026-11-18').map(x => x.day + x.lang), ['2026-11-19es'])
const merged = mergeDaily(local, [{ user_id: 'u1', day: '2026-11-19', lang: 'es', wpm: 60, acc: 95, grid: '■■' }])
assert.equal(merged['2026-11-19|es'].wpm, 60) // server's official attempt wins
console.log('syncData ok')
