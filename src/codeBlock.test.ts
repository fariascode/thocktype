// Self-check: run with `npm run check`
import assert from 'node:assert'
import { parseBlock } from './codeBlock.ts'

const b = parseBlock(`def total(items):
    s = 0

    for x in items:
        s += x
    return s`)
assert.deepEqual(b.words, ['def', 'total(items):', 's', '=', '0', 'for', 'x', 'in', 'items:', 's', '+=', 'x', 'return', 's'])
assert.deepEqual(b.breaks, { 1: 4, 4: 4, 8: 8, 11: 4 }) // blank lines are skipped; no break after the last line
assert.deepEqual(parseBlock('a b').breaks, {})
console.log('codeBlock ok')
