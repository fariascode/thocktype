import { useEffect } from 'react'
import { CARETS, FONTS, FONT_FAMILY, LINES, MONO_THEMES, SIZES, WIDTHS, SWATCH, THEMES, loadFont, type Appearance, type Font, type Theme } from './appearance'

type Props = { a: Appearance; onChange: (next: Partial<Appearance>) => void; onClose: () => void }

const COLOR_THEMES = (Object.keys(THEMES) as Theme[]).filter(t => !(MONO_THEMES as readonly Theme[]).includes(t))
const swatch = (t: Theme) => (
  <span className="swatch-label">
    <span className="swatch" style={{ background: SWATCH[t][0], color: SWATCH[t][1] }}>Aa</span>{THEMES[t]}
  </span>
)

// Changes apply instantly (to the preview and to the page behind), and are saved per device
export default function SettingsPanel({ a, onChange, onClose }: Props) {
  useEffect(() => { (Object.keys(FONTS) as Font[]).forEach(loadFont) }, []) // so each option shows in its own font

  const group = <K extends keyof Appearance>(key: K, options: Record<Appearance[K], string>, render?: (v: Appearance[K]) => React.ReactNode, only?: readonly Appearance[K][]) => (
    <div className="set-options" role="radiogroup">
      {(only ?? (Object.keys(options) as Appearance[K][])).map(v => (
        <button key={v} role="radio" aria-checked={a[key] === v} className={a[key] === v ? 'on' : ''}
          onClick={() => onChange({ [key]: v } as Partial<Appearance>)}>
          {render ? render(v) : options[v]}
        </button>
      ))}
    </div>
  )

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div className="settings card" role="dialog" aria-modal="true" aria-label="ajustes"
        onMouseDown={e => e.stopPropagation()} onKeyDown={e => e.key === 'Escape' && onClose()}>
        <div className="settings-head">
          <h2>ajustes <small>se guardan en este dispositivo</small></h2>
          <button onClick={onClose} aria-label="cerrar" autoFocus>✕</button>
        </div>

        <div className="settings-preview" aria-hidden>
          <span className="ok">escribe rápido,</span>{' '}
          <span className="pv-next">e<span className="caret static" /></span>scribe limpio
        </div>

        {/* two columns on wide screens so the whole panel fits without scrolling */}
        <div className="set-col">
          <section><small>tamaño del texto</small>{group('size', SIZES)}</section>
          <section className="fonts"><small>fuente</small>{group('font', FONTS, f => <span style={{ fontFamily: FONT_FAMILY[f] }}>{FONTS[f]}</span>)}</section>
          <section><small>cursor</small>{group('caret', CARETS)}</section>
          <div className="set-pair">
            <section><small>líneas</small>{group('lines', LINES, v => v)}</section>
            <section className="width-opt"><small>ancho</small>{group('width', WIDTHS)}</section>
          </div>
        </div>
        <div className="set-col">
          <section className="themes"><small>tema · monocromáticos</small>{group('theme', THEMES, swatch, MONO_THEMES)}</section>
          <section className="themes"><small>tema · de color</small>{group('theme', THEMES, swatch, COLOR_THEMES)}</section>
        </div>
      </div>
    </div>
  )
}
