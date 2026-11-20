// Self-check: run with `npm run check`
import assert from 'node:assert'
import { fuzzyScore, fuzzyFilter } from './fuzzy.ts'

assert.equal(fuzzyScore('xyz', 'tiempo: 30s'), -1)
assert.ok(fuzzyScore('tie', 'tiempo: 30s') > 0)
assert.ok(fuzzyScore('espanol', 'idioma: español') > 0) // accents ignored
assert.ok(fuzzyScore('PRACT', 'modo: práctica') > 0) // case ignored
assert.ok(fuzzyScore('t30', 'tiempo: 30s') > fuzzyScore('t30', 'texto: 3 0'), 'consecutive digits beat scattered ones')
assert.ok(fuzzyScore('tie', 'tiempo') > fuzzyScore('tie', 'texto inicial empezar'), 'consecutive letters beat word starts')

const labels = ['modo: tiempo', 'tiempo: 30s', 'tema: claro', 'ir a historial']
assert.deepEqual(fuzzyFilter(labels, 'his', x => x), ['ir a historial'])
assert.equal(fuzzyFilter(labels, '', x => x).length, 4)
assert.equal(fuzzyFilter(labels, 'tiempo', x => x)[0], 'tiempo: 30s') // word-start match ranks first
console.log('fuzzy ok')
