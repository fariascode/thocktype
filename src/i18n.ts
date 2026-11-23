// Interface language. Texts stay written in Spanish in the code and go through t(); English comes from the
// dictionary below, keyed by the Spanish text. A missing entry falls back to Spanish instead of breaking.
// The language of the *test words* is a separate setting (Settings.lang).
import en from './i18n/en.ts'

export type UiLang = 'es' | 'en'
export const UI_LANGS: Record<UiLang, string> = { es: 'español', en: 'English' }

// browsers in Spanish get Spanish; everyone else gets English
export const detectUiLang = (): UiLang =>
  (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en')

let current: UiLang = detectUiLang()
export const uiLang = () => current
export function setUiLang(l: UiLang) {
  current = l
  if (typeof document !== 'undefined') document.documentElement.lang = l
}

// t('reto #{n}', { n: 4 }) → "challenge #4" in English
export function t(es: string, vars?: Record<string, string | number>): string {
  let s = current === 'en' ? (en[es] ?? es) : es
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  return s
}
