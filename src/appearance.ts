// Per-device look of the typing area. Applied as <html data-*> attributes that index.css reads.
export const THEMES = { dark: 'carbón', light: 'claro', paper: 'papel', ink: 'tinta', contrast: 'alto contraste' } as const
export const SIZES = { s: 'chico', m: 'normal', l: 'grande', xl: 'enorme' } as const
export const FONTS = {
  jetbrains: 'JetBrains Mono', plex: 'IBM Plex Mono', space: 'Space Mono', fira: 'Fira Code', source: 'Source Code Pro',
} as const
export const CARETS = { line: 'línea', block: 'bloque', underline: 'subrayado', outline: 'contorno' } as const

export type Theme = keyof typeof THEMES
export type Size = keyof typeof SIZES
export type Font = keyof typeof FONTS
export type Caret = keyof typeof CARETS
export type Appearance = { theme: Theme; size: Size; font: Font; caret: Caret }

export const isLight = (t: Theme) => t === 'light' || t === 'paper'

// Google Fonts families, downloaded only when chosen (JetBrains Mono ships with the page)
const FONT_QUERY: Partial<Record<Font, string>> = {
  plex: 'IBM+Plex+Mono:wght@400;500', space: 'Space+Mono:wght@400;700',
  fira: 'Fira+Code:wght@400;500', source: 'Source+Code+Pro:wght@400;500',
}

export function loadFont(f: Font) {
  const q = FONT_QUERY[f]
  if (!q || document.getElementById(`font-${f}`)) return
  const link = Object.assign(document.createElement('link'), { id: `font-${f}`, rel: 'stylesheet', href: `https://fonts.googleapis.com/css2?family=${q}&display=swap` })
  document.head.append(link)
}

export function applyAppearance(a: Appearance) {
  const d = document.documentElement.dataset
  d.theme = a.theme; d.size = a.size; d.font = a.font; d.caret = a.caret
  loadFont(a.font)
}
