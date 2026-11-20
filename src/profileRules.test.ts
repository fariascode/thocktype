// Self-check: run with `npm run check`
import assert from 'node:assert'
import { checkProfile, suggestUsername } from './profileRules.ts'

const ok = { username: 'farias_code', display_name: 'Alfredo', bio: '' }
assert.equal(checkProfile(ok), null)
assert.match(checkProfile({ ...ok, username: 'ab' })!, /3 a 20/)
assert.match(checkProfile({ ...ok, username: 'Mayus' })!, /minúsculas/)
assert.match(checkProfile({ ...ok, username: 'con espacio' })!, /minúsculas/)
assert.match(checkProfile({ ...ok, bio: 'x'.repeat(161) })!, /160/)
assert.equal(suggestUsername('Alfredo Farías'), 'alfredo_farias')
assert.equal(suggestUsername('yo@mail.com'), 'yo_typer')
assert.equal(suggestUsername('Ñandú.Veloz+2026@x.com'), 'nandu_veloz_2026')
assert.equal(checkProfile({ ...ok, username: suggestUsername('a very long display name indeed') }), null)
console.log('profileRules ok')
