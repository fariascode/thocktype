// Self-check: run with `npm run check`
import assert from 'node:assert'
import { inputDiff } from './inputDiff.ts'

assert.deepEqual(inputDiff('', 'h'), ['h'])
assert.deepEqual(inputDiff('h', 'hol'), ['o', 'l']) // composition grows
assert.deepEqual(inputDiff('hol', 'ho'), ['Backspace']) // delete inside composition
assert.deepEqual(inputDiff('hla', 'hola'), ['Backspace', 'Backspace', 'o', 'l', 'a']) // autocorrect rewrite
assert.deepEqual(inputDiff('ab', 'ab'), [])
assert.deepEqual(inputDiff('', 'á'), ['á'])
console.log('inputDiff ok')
