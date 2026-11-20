import { useEffect } from 'react'
import { CARETS, FONTS, FONT_FAMILY, SIZES, SWATCH, THEMES, loadFont, type Appearance, type Font } from './appearance'

type Props = { a: Appearance; onChange: (next: Partial<Appearance>) => void; onClose: () => void }

// Changes apply instantly (to the preview and to the page behind), and are saved per device
export default function SettingsPanel({ a, onChange, onClose }: Props) {
  useEffect(() => { (Object.keys(FONTS) as Font[]).forEach(loadFont) }, []) // so each option shows in its own font

  const group = <K extends keyof Appearance>(key: K, options: Record<Appearance[K], string>, render?: (v: Appearance[K]) => React.ReactNode) => (
    <div className="set-options" role="radiogroup">
      {(Object.keys(options) as Appearance[K][]).map(v => (
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
          <h2>ajustes</h2>
          <button onClick={onClose} aria-label="cerrar" autoFocus>✕</button>
        </div>

        <div className="settings-preview" aria-hidden>
          <span className="ok">escribe rápido,</span>{' '}
          <span className="pv-next">e<span className="caret static" /></span>scribe limpio
        </div>

        <section><small>tamaño del texto</small>{group('size', SIZES)}</section>
        <section><small>fuente</small>{group('font', FONTS, f => <span style={{ fontFamily: FONT_FAMILY[f] }}>{FONTS[f]}</span>)}</section>
        <section><small>cursor</small>{group('caret', CARETS)}</section>
        <section>
          <small>tema</small>
          {group('theme', THEMES, t => (
            <span className="swatch-label">
              <span className="swatch" style={{ background: SWATCH[t][0], color: SWATCH[t][1] }}>Aa</span>{THEMES[t]}
            </span>
          ))}
        </section>
        <p className="hint" style={{ textAlign: 'left' }}>se guardan en este dispositivo</p>
      </div>
    </div>
  )
}
