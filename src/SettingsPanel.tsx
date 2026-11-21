import { useEffect, useRef, useState } from 'react'
import { useLayoutMotion } from './motion'
import {
  CARETS, CARET_MOTION, FONTS, FONT_FAMILY, LINES, MONO_THEMES, PROGRESS, SIZES, SOUNDS, WIDTHS, SWATCH, THEMES, loadFont,
  type Appearance, type Font, type Progress, type SoundKind, type Theme,
} from './appearance'

export type Prefs = Appearance & { progress: Progress; sound: boolean; soundKind: SoundKind; volume: number; live: boolean; ghost: boolean }
type Props = { a: Prefs; onChange: (next: Partial<Prefs>) => void; onClose: () => void; onPreviewSound: (k: SoundKind, volume: number) => void }

const TABS = { tema: 'tema', texto: 'texto', escritura: 'escritura', sonido: 'sonido' } as const
type Tab = keyof typeof TABS
const COLOR_THEMES = (Object.keys(THEMES) as Theme[]).filter(t => !(MONO_THEMES as readonly Theme[]).includes(t))
const swatch = (t: Theme) => (
  <span className="swatch-label">
    <span className="swatch" style={{ background: SWATCH[t][0], color: SWATCH[t][1] }}>Aa</span>{THEMES[t]}
  </span>
)
let lastTab: Tab = 'tema' // reopening the panel returns to the tab you were on

// Changes apply instantly (to the preview and to the page behind), and are saved per device
export default function SettingsPanel({ a, onChange, onClose, onPreviewSound }: Props) {
  useEffect(() => { (Object.keys(FONTS) as Font[]).forEach(loadFont) }, []) // so each option shows in its own font
  const [tab, setTabState] = useState<Tab>(lastTab)
  const card = useRef<HTMLDivElement>(null)
  useLayoutMotion(card)
  const setTab = (t: Tab) => { lastTab = t; setTabState(t) }

  // single choice among string options
  const group = <K extends keyof Prefs>(key: K, options: Record<string, string>, render?: (v: string) => React.ReactNode, only?: readonly string[], onPick?: (v: string) => void) => (
    <div className="set-options" role="radiogroup">
      {(only ?? Object.keys(options)).map(v => (
        <button key={v} role="radio" aria-checked={a[key] === v} className={a[key] === v ? 'on' : ''}
          onClick={() => { onChange({ [key]: v } as Partial<Prefs>); onPick?.(v) }}>
          {render ? render(v) : options[v]}
        </button>
      ))}
    </div>
  )
  // on/off preference
  const toggle = (key: 'live' | 'ghost' | 'focus' | 'sound', label: string, help: string) => (
    <button role="switch" aria-checked={a[key]} className={`set-toggle ${a[key] ? 'on' : ''}`} onClick={() => onChange({ [key]: !a[key] })}>
      <span><b>{label}</b><small>{help}</small></span>
      <span className="switch" aria-hidden />
    </button>
  )

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div ref={card} className="settings card" role="dialog" aria-modal="true" aria-label="ajustes"
        onMouseDown={e => e.stopPropagation()} onKeyDown={e => e.key === 'Escape' && onClose()}>
        <div className="settings-head">
          <h2>ajustes <small>se guardan en este dispositivo</small></h2>
          <button onClick={onClose} aria-label="cerrar" autoFocus>✕</button>
        </div>

        <div className="settings-preview" aria-hidden>
          <span className="ok">escribe rápido,</span>{' '}
          <span className="pv-next">e<span className="caret static" /></span>scribe limpio
        </div>

        <div className="set-tabs" role="tablist" data-pill>
          <span className="seg-pill" aria-hidden />
          {(Object.keys(TABS) as Tab[]).map(t => (
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{TABS[t]}</button>
          ))}
        </div>

        <div className="set-page" key={tab} role="tabpanel">
          {tab === 'tema' && <>
            <section className="themes"><small>monocromáticos</small>{group('theme', THEMES, v => swatch(v as Theme), MONO_THEMES)}</section>
            <section className="themes"><small>de color</small>{group('theme', THEMES, v => swatch(v as Theme), COLOR_THEMES)}</section>
          </>}
          {tab === 'texto' && <>
            <section className="fonts"><small>fuente</small>{group('font', FONTS, f => <span style={{ fontFamily: FONT_FAMILY[f as Font] }}>{FONTS[f as Font]}</span>)}</section>
            <section><small>tamaño del texto</small>{group('size', SIZES)}</section>
            <div className="set-pair">
              <section><small>líneas</small>{group('lines', LINES, v => v)}</section>
              <section className="width-opt"><small>ancho</small>{group('width', WIDTHS)}</section>
            </div>
            <div className="set-pair">
              <section><small>cursor</small>{group('caret', CARETS)}</section>
              <section><small>movimiento</small>{group('caretMotion', CARET_MOTION)}</section>
            </div>
          </>}
          {tab === 'escritura' && <>
            <section><small>progreso del test</small>{group('progress', PROGRESS)}</section>
            <div className="set-toggles">
              {toggle('live', 'wpm en vivo', 'tu velocidad mientras escribes')}
              {toggle('ghost', 'fantasma', 'un cursor corre a la velocidad de tu récord')}
              {toggle('focus', 'modo enfoque', 'oculta también la cabecera mientras escribes')}
            </div>
          </>}
          {tab === 'sonido' && <>
            <div className="set-toggles">{toggle('sound', 'sonido al teclear', 'un golpe sintetizado por tecla; más grave al fallar')}</div>
            <section><small>tipo de sonido · toca para escucharlo</small>
              {group('soundKind', SOUNDS, undefined, undefined, k => onPreviewSound(k as SoundKind, a.volume))}
            </section>
            <section><small>volumen · {Math.round(a.volume * 100)}%</small>
              <input className="set-range" type="range" min={0.1} max={1} step={0.05} value={a.volume} aria-label="volumen"
                onChange={e => onChange({ volume: Number(e.target.value) })}
                onPointerUp={e => onPreviewSound(a.soundKind, Number(e.currentTarget.value))} />
            </section>
          </>}
        </div>
      </div>
    </div>
  )
}
