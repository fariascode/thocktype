// node src/friends.test.ts
import assert from 'node:assert/strict'
import { cleanQuery } from './profileRules.ts'

assert.equal(cleanQuery('  ana_99 '), 'ana_99')
assert.equal(cleanQuery('José Peña'), 'José Peña')
assert.equal(cleanQuery('a,b(c)%*\\.d'), 'abcd') // PostgREST operators can't sneak into the filter
assert.equal(cleanQuery('x'.repeat(50)).length, 30)
console.log('friends ok')
