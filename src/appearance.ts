// Per-device look of the typing area. Applied as <html data-*> attributes that index.css reads.
export const THEMES = {
  auto: 'sistema',
  dark: 'carbón', light: 'claro', paper: 'papel', ink: 'tinta', contrast: 'contraste',
  lila: 'lila', lavanda: 'lavanda', sakura: 'sakura', matcha: 'matcha', ambar: 'ámbar', oceano: 'océano',
  catppuccin: 'catppuccin', rosepine: 'rosé pine', nord: 'nord', gruvbox: 'gruvbox', tokyonight: 'tokyo night',
  everforest: 'everforest', dracula: 'dracula', monokai: 'monokai', solarized: 'solarized', solarlight: 'solarized claro',
} as const
export const MONO_THEMES = ['auto', 'dark', 'light', 'paper', 'ink', 'contrast'] as const
export const SIZES = { s: 'chico', m: 'normal', l: 'grande', xl: 'enorme' } as const
export const FONTS = {
  cascadia: 'Cascadia Code', jetbrains: 'JetBrains Mono', plex: 'IBM Plex Mono', space: 'Space Mono', fira: 'Fira Code',
  source: 'Source Code Pro', geist: 'Geist Mono', roboto: 'Roboto Mono', ubuntu: 'Ubuntu Mono', inconsolata: 'Inconsolata',
} as const
export const LINES = { '2': '2 líneas', '3': '3 líneas', '4': '4 líneas' } as const
export const WIDTHS = { narrow: 'estrecho', normal: 'normal', wide: 'ancho' } as const
export const CARETS = { line: 'línea', block: 'bloque', underline: 'subrayado', outline: 'contorno' } as const
export const CARET_MOTION = { smooth: 'suave', instant: 'instantáneo' } as const
export const PROGRESS = { number: 'número', bar: 'barra', off: 'oculto' } as const
export const SOUNDS = { thock: 'thock', click: 'click', typewriter: 'máquina', soft: 'suave' } as const

export type Theme = keyof typeof THEMES
export type Size = keyof typeof SIZES
export type Font = keyof typeof FONTS
export type Caret = keyof typeof CARETS
export type Lines = keyof typeof LINES
export type Width = keyof typeof WIDTHS
export type CaretMotion = keyof typeof CARET_MOTION
export type Progress = keyof typeof PROGRESS
export type SoundKind = keyof typeof SOUNDS
export type Appearance = { theme: Theme; size: Size; font: Font; caret: Caret; lines: Lines; width: Width; caretMotion: CaretMotion; focus: boolean }

// "sistema" follows the device's light/dark setting
const prefersDark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
export const resolveTheme = (t: Theme): Exclude<Theme, 'auto'> => (t === 'auto' ? (prefersDark() ? 'dark' : 'light') : t)
const LIGHT: Theme[] = ['light', 'paper', 'lavanda', 'sakura', 'solarlight']
export const isLight = (t: Theme) => LIGHT.includes(resolveTheme(t))

// Google Fonts families, downloaded only when chosen (Cascadia Code, the signature font, ships with the page)
const FONT_QUERY: Partial<Record<Font, string>> = {
  jetbrains: 'JetBrains+Mono:wght@400;500', plex: 'IBM+Plex+Mono:wght@400;500', space: 'Space+Mono:wght@400;700',
  fira: 'Fira+Code:wght@400;500', source: 'Source+Code+Pro:wght@400;500', geist: 'Geist+Mono:wght@400;500',
  roboto: 'Roboto+Mono:wght@400;500', ubuntu: 'Ubuntu+Mono:wght@400;700', inconsolata: 'Inconsolata:wght@400;500',
}

export function loadFont(f: Font) {
  const q = FONT_QUERY[f]
  if (!q || document.getElementById(`font-${f}`)) return
  const link = Object.assign(document.createElement('link'), { id: `font-${f}`, rel: 'stylesheet', href: `https://fonts.googleapis.com/css2?family=${q}&display=swap` })
  document.head.append(link)
}

export function applyAppearance(a: Appearance) {
  const d = document.documentElement.dataset
  d.theme = resolveTheme(a.theme); d.size = a.size; d.font = a.font; d.caret = a.caret; d.lines = a.lines; d.width = a.width
  d.caretMotion = a.caretMotion; d.focus = a.focus ? 'on' : 'off'
  loadFont(a.font)
}

// [background, accent] for the theme swatches in the settings panel (keep in sync with index.css)
export const SWATCH: Record<Theme, [string, string]> = {
  auto: ['linear-gradient(135deg, #101113 50%, #f3f3f1 50%)', '#888888'],
  dark: ['#101113', '#ededed'], light: ['#f3f3f1', '#18191b'], paper: ['#ece8df', '#2b2825'],
  ink: ['#000000', '#f4f4f4'], contrast: ['#000000', '#ffffff'],
  lila: ['#16131e', '#c9a7ff'], lavanda: ['#f3effa', '#7c55c9'], sakura: ['#fbf1f3', '#c2456b'], matcha: ['#1b201a', '#9fd36a'],
  ambar: ['#0f0c05', '#ffb000'], oceano: ['#0d1b2a', '#5ec8f2'], catppuccin: ['#181825', '#cba6f7'],
  rosepine: ['#191724', '#c4a7e7'], nord: ['#2e3440', '#88c0d0'], gruvbox: ['#282828', '#fabd2f'],
  tokyonight: ['#1a1b26', '#7aa2f7'], everforest: ['#2d353b', '#a7c080'], dracula: ['#282a36', '#bd93f9'],
  monokai: ['#272822', '#a6e22e'], solarized: ['#002b36', '#b58900'], solarlight: ['#fdf6e3', '#2076b4'],
}
export const FONT_FAMILY: Record<Font, string> = {
  cascadia: "'Cascadia Code', monospace", jetbrains: "'JetBrains Mono', monospace", plex: "'IBM Plex Mono', monospace", space: "'Space Mono', monospace",
  fira: "'Fira Code', monospace", source: "'Source Code Pro', monospace", geist: "'Geist Mono', monospace",
  roboto: "'Roboto Mono', monospace", ubuntu: "'Ubuntu Mono', monospace", inconsolata: "'Inconsolata', monospace",
}
