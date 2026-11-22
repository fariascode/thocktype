// Multi-line code for "bloque" mode: words to type, plus where lines break and how far the next line is indented.
// Indentation is never typed (the editor puts it), only the line break: Enter (or space) moves to the next line.
export type Block = { words: string[]; breaks: Record<number, number> } // breaks[i] = indent (spaces) of the line after word i

export function parseBlock(src: string): Block {
  const words: string[] = [], breaks: Record<number, number> = {}
  const lines = src.replace(/\t/g, '    ').split('\n').filter(l => l.trim())
  lines.forEach((line, li) => {
    words.push(...line.trim().split(/ +/))
    const next = lines[li + 1]
    if (next !== undefined) breaks[words.length - 1] = next.length - next.trimStart().length
  })
  return { words, breaks }
}
