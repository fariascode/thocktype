// Self-check: every theme in index.css must stay readable (WCAG contrast ratios). Run with `npm run check`.
import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
const base = Object.fromEntries([...css.match(/^:root \{([\s\S]*?)\n\}/m)![1].matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map(m => [m[1], m[2]]))
const themes: Record<string, Record<string, string>> = { dark: base }
for (const m of css.matchAll(/:root\[data-theme='(\w+)'\](?:, \[data-preview='\w+'\])? \{([\s\S]*?)\}/g))
  themes[m[1]] = { ...base, ...Object.fromEntries([...m[2].matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map(x => [x[1], x[2]])) }

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

const problems: string[] = []
const need = (name: string, what: string, a: string, b: string, min: number) => {
  const c = contrast(a, b)
  if (c < min) problems.push(`${name}: ${what} ${c.toFixed(2)} < ${min}`)
}
for (const [name, t] of Object.entries(themes)) {
  const accent = t.accent ?? t['text-1'], err = t.err ?? t['text-2']
  need(name, 'typed text', t['text-1'], t.bg, 7)        // AAA body text
  need(name, 'words to type', t['text-3'], t.bg, 3)     // pending words: dim but legible
  need(name, 'caret/accent', accent, t.bg, 3)           // UI component contrast
  need(name, 'mistyped letter', t.bg, err, 4.5)         // letter drawn in bg color on the error color
}
assert.deepEqual(problems, [], problems.join('\n'))
console.log(`themes ok (${Object.keys(themes).length} checked)`)
