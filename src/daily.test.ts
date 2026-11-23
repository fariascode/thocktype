// Self-check: run with `npm run check`
import assert from 'node:assert'
import { dailyWords, challengeNumber, grid, dailyStreak, shareText, DAILY_WORDS } from './daily.ts'

// same day + language -> identical words (this is what makes it a shared challenge)
assert.deepEqual(dailyWords('es', '2026-11-19'), dailyWords('es', '2026-11-19'))
assert.equal(dailyWords('es', '2026-11-19').length, DAILY_WORDS)
assert.notDeepEqual(dailyWords('es', '2026-11-19'), dailyWords('es', '2026-11-20'))
assert.notDeepEqual(dailyWords('es', '2026-11-19'), dailyWords('en', '2026-11-19'))

assert.equal(challengeNumber(new Date(2026, 10, 19, 23)), 1)
assert.equal(challengeNumber(new Date(2026, 11, 1, 8)), 13)

assert.equal(grid(['a', 'b', 'c'], ['a', 'x', 'c']), '■□■')
assert.equal(grid(Array(12).fill('a'), Array(12).fill('a')).split('\n').length, 2)

const e = { wpm: 80, acc: 97, grid: '■■' }
const now = new Date(2026, 10, 19, 12)
assert.equal(dailyStreak({ '2026-11-19|es': e, '2026-11-18|en': e, '2026-11-16|es': e }, now), 2)
assert.equal(dailyStreak({}, now), 0)
assert.equal(shareText(1, 'es', e), 'ThockType · reto #1 (es)\n80 wpm · 97%\n■■\nhttps://thocktype.app')
console.log('daily ok')
