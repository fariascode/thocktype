// Settings backup: pasted text is untrusted, so only known keys with the right type (and known themes/fonts) get through.
import { FONTS, THEMES } from './appearance.ts'

export type ImportResult = { ok: true; values: Record<string, unknown> } | { ok: false; error: string }

// defaults: the app's default settings, used as the list of allowed keys and their types
export function parseSettings(raw: string, defaults: Record<string, unknown>, skip: string[]): ImportResult {
  let data: unknown
  try { data = JSON.parse(raw.trim()) } catch { return { ok: false, error: 'eso no parece una copia de ajustes de ThockType' } }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, error: 'eso no parece una copia de ajustes de ThockType' }
  const values: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (!(k in defaults) || skip.includes(k)) continue
    const d = defaults[k]
    if (typeof v !== typeof d || Array.isArray(v) !== Array.isArray(d)) continue
    if (typeof v === 'string' && v.length > 200) continue
    if (typeof v === 'number' && !Number.isFinite(v)) continue
    if (k === 'theme' && !(v as string in THEMES)) continue
    if (k === 'font' && !(v as string in FONTS)) continue
    values[k] = v
  }
  if (!Object.keys(values).length) return { ok: false, error: 'no encontré ningún ajuste que se pueda usar' }
  return { ok: true, values }
}
