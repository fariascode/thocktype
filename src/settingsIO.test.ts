// node src/settingsIO.test.ts
import assert from 'node:assert/strict'
import { parseSettings } from './settingsIO.ts'

const defaults = { theme: 'dark', font: 'cascadia', size: 'm', volume: 0.7, sound: false, rules: { noBack: false }, presets: [] }
const skip = ['presets']

const ok = parseSettings(JSON.stringify({ theme: 'nord', font: 'fira', volume: 0.3, sound: true, extra: 1, presets: [{ name: 'x' }] }), defaults, skip)
assert.ok(ok.ok)
assert.deepEqual(ok.ok && ok.values, { theme: 'nord', font: 'fira', volume: 0.3, sound: true }) // unknown keys and skipped ones dropped

const bad = parseSettings(JSON.stringify({ theme: 'nope', font: '<script>', volume: '9', sound: 'yes', size: 'x'.repeat(500), rules: [] }), defaults, skip)
assert.equal(bad.ok, false) // wrong types, unknown theme/font, overlong text: nothing usable

assert.equal(parseSettings('not json', defaults, skip).ok, false)
assert.equal(parseSettings('[1,2]', defaults, skip).ok, false)
assert.equal(parseSettings('null', defaults, skip).ok, false)
console.log('settingsIO ok')
