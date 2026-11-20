// Self-check: run with `npm run check`
import assert from 'node:assert'
import { rankEntries, type RankRow } from './rankList.ts'

const row = (id: string, wpm: number): RankRow => ({ user_id: id, wpm, acc: 98, created_at: '', profiles: { username: id, display_name: null, avatar_url: null } })
const top = [row('a', 120), row('b', 110), row('c', 100)]
assert.deepEqual(rankEntries(top, 'b').map(e => [e.place, e.isMe]), [[1, false], [2, true], [3, false]])
const far = rankEntries(top, 'z', { row: row('z', 60), place: 9 })
assert.deepEqual(far.map(e => [e.place, e.isMe, e.gapBefore]), [[1, false, false], [2, false, false], [3, false, false], [9, true, true]])
assert.equal(rankEntries(top, 'z', { row: row('z', 90), place: 4 }).at(-1)!.gapBefore, false) // right after the top: no gap
assert.equal(rankEntries(top, 'a', { row: row('a', 120), place: 1 }).length, 3) // already in the top: not repeated
assert.deepEqual(rankEntries([], undefined), [])
console.log('rankList ok')
