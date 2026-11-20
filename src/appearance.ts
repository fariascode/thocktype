// Per-device look of the typing area. Applied as <html data-*> attributes that index.css reads.
export const THEMES = {
  dark: 'carbón', light: 'claro', paper: 'papel', ink: 'tinta', contrast: 'alto contraste',
  lila: 'lila', lavanda: 'lavanda', catppuccin: 'catppuccin', rosepine: 'rosé pine',
  nord: 'nord', gruvbox: 'gruvbox', tokyonight: 'tokyo night', everforest: 'everforest',
} as const
export const MONO_THEMES = ['dark', 'light', 'paper', 'ink', 'contrast'] as const
export const SIZES = { s: 'chico', m: 'normal', l: 'grande', xl: 'enorme' } as const
export const FONTS = {
  cascadia: 'Cascadia Code', jetbrains: 'JetBrains Mono', plex: 'IBM Plex Mono', space: 'Space Mono', fira: 'Fira Code', source: 'Source Code Pro',
} as const
export const CARETS = { line: 'línea', block: 'bloque', underline: 'subrayado', outline: 'contorno' } as const

export type Theme = keyof typeof THEMES
export type Size = keyof typeof SIZES
export type Font = keyof typeof FONTS
export type Caret = keyof typeof CARETS
export type Appearance = { theme: Theme; size: Size; font: Font; caret: Caret }

export const isLight = (t: Theme) => t === 'light' || t === 'paper' || t === 'lavanda'

// Google Fonts families, downloaded only when chosen (Cascadia Code, the signature font, ships with the page)
const FONT_QUERY: Partial<Record<Font, string>> = {
  jetbrains: 'JetBrains+Mono:wght@400;500', plex: 'IBM+Plex+Mono:wght@400;500', space: 'Space+Mono:wght@400;700',
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

// [background, accent] for the theme swatches in the settings panel (keep in sync with index.css)
export const SWATCH: Record<Theme, [string, string]> = {
  dark: ['#101113', '#ededed'], light: ['#f3f3f1', '#18191b'], paper: ['#ece8df', '#2b2825'],
  ink: ['#000000', '#f4f4f4'], contrast: ['#000000', '#ffffff'],
  lila: ['#16131e', '#c9a7ff'], lavanda: ['#f3effa', '#7c55c9'], catppuccin: ['#181825', '#cba6f7'],
  rosepine: ['#191724', '#c4a7e7'], nord: ['#2e3440', '#88c0d0'], gruvbox: ['#282828', '#fabd2f'],
  tokyonight: ['#1a1b26', '#7aa2f7'], everforest: ['#2d353b', '#a7c080'],
}
export const FONT_FAMILY: Record<Font, string> = {
  cascadia: "'Cascadia Code', monospace", jetbrains: "'JetBrains Mono', monospace", plex: "'IBM Plex Mono', monospace", space: "'Space Mono', monospace",
  fira: "'Fira Code', monospace", source: "'Source Code Pro', monospace",
}
