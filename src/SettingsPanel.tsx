import { UI_LANGS, t, type UiLang } from './i18n'
import { useEffect, useRef, useState } from 'react'
import { useLayoutMotion } from './motion'
import { copyText } from './share'
import {
  CARETS, CARET_MOTION, FONTS, FONT_FAMILY, GHOST_SOURCES, HIGHLIGHTS, KEYMAPS, LINES, LIVE_COLORS, MONO_THEMES, PROGRESS, SIZES,
  ORIGINAL_THEMES, SOUNDS, TAPE, TAPE_MARGINS, TYPED_EFFECTS, WIDTHS, THEMES, loadFont, resolveTheme,
  type Appearance, type Font, type GhostSource, type Keymap, type Progress, type SoundKind, type Theme,
} from './appearance'

export type Prefs = Appearance & {
  progress: Progress; sound: boolean; soundKind: SoundKind; volume: number; live: boolean; ghost: boolean
  ghostSource: GhostSource; ghostWpm: number; liveAcc: boolean; liveBurst: boolean; keymap: Keymap
  synced: boolean // signed in: settings follow the account
  uiLang: UiLang | 'auto'
  timeWarn: boolean
  themeShuffle: boolean // a different theme on every visit
}
type Flag = { [K in keyof Prefs]: Prefs[K] extends boolean ? K : never }[keyof Prefs]
type Props = {
  a: Prefs; onChange: (next: Partial<Prefs>) => void; onClose: () => void; onPreviewSound: (k: SoundKind, volume: number) => void
  presets: string[]; onSavePreset: (name: string) => void; onApplyPreset: (name: string) => void; onDeletePreset: (name: string) => void
  onExport: () => string; onImport: (text: string) => string | null; onReset: () => void // import returns an error message, or null when applied
}
const MAX_PRESETS = 12

// search index: [tab, label shown on the section, extra words people may type]
const INDEX: [Tab, string, string][] = [
  ['tema', 'monocromáticos', 'tema sistema automático claro oscuro carbón papel tinta contraste blanco negro'],
  ['tema', 'originales', 'tema colores lila lavanda sakura matcha ámbar océano medianoche bosque neón café arena menta'],
  ['tema', 'populares', 'tema colores catppuccin latte rosé pine nord gruvbox tokyo night everforest dracula monokai solarized one dark ayu kanagawa night owl github'],
  ['tema', 'tema al azar', 'aleatorio dado sorpresa cada visita cambiar'],
  ['texto', 'fuente', 'tipografía letra cascadia jetbrains plex space fira source geist roboto ubuntu inconsolata local instalada'],
  ['texto', 'tamaño del texto', 'letra grande chico enorme zoom'],
  ['texto', 'líneas', 'renglones visibles 2 3 4'],
  ['texto', 'ancho', 'estrecho normal ancho anchura'],
  ['cursor', 'estilo', 'cursor caret línea bloque subrayado contorno'],
  ['cursor', 'movimiento', 'cursor suave rápido instantáneo animación smooth'],
  ['cursor', 'fantasma', 'pace caret ritmo récord promedio velocidad fija test anterior ventaja'],
  ['vista', 'desplazamiento', 'cinta tape una línea scroll horizontal margen'],
  ['vista', 'resaltar', 'highlight letra palabra'],
  ['vista', 'palabras escritas', 'atenuar ocultar efecto typed'],
  ['vista', 'teclado en pantalla', 'keymap teclas siguiente reacción'],
  ['vista', 'movimiento', 'cambio de línea suave scroll animación'],
  ['vivo', 'progreso del test', 'tiempo contador barra número oculto'],
  ['vivo', 'mostrar mientras escribes', 'wpm velocidad precisión ráfaga burst en vivo'],
  ['vivo', 'color de los números', 'tenue normal acento'],
  ['vivo', 'otros', 'modo enfoque focus cabecera gráficas desde cero eje'],
  ['sonido', 'sonido al teclear', 'audio teclas clic'],
  ['sonido', 'tipo de sonido', 'thock click máquina de escribir suave'],
  ['sonido', 'volumen', 'audio fuerte bajo'],
  ['sonido', 'aviso de tiempo', 'últimos segundos alarma pitido final'],
  ['perfiles', 'guardar los ajustes actuales', 'perfil preset configuración guardar'],
  ['perfiles', 'tus perfiles', 'perfil preset aplicar borrar'],
  ['perfiles', 'copia de seguridad', 'exportar importar copiar pegar restablecer reiniciar valores por defecto backup'],
]
const fold = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
// every word you type must appear somewhere in the label, the tab name or the extra words
const search = (q: string) => {
  const words = fold(q).split(/\s+/).filter(Boolean)
  return INDEX.filter(([tab, label, extra]) => { const hay = fold(`${label} ${TABS[tab]} ${extra} ${t(label)} ${t(TABS[tab])}`); return words.every(w => hay.includes(w)) })
}

const TABS = { tema: 'tema', texto: 'texto', cursor: 'cursor', vista: 'vista', vivo: 'en vivo', sonido: 'sonido', perfiles: 'perfiles' } as const
type Tab = keyof typeof TABS
const ALL_THEMES = Object.keys(THEMES) as Theme[]
const POPULAR_THEMES = ALL_THEMES.filter(th => !(MONO_THEMES as readonly Theme[]).includes(th) && !(ORIGINAL_THEMES as readonly Theme[]).includes(th))
let lastTab: Tab = 'tema' // reopening the panel returns to the tab you were on
// eslint-disable-next-line react-refresh/only-export-components -- a plain setter, fast refresh doesn't need to track it
export const openOnTab = (to: Tab) => { lastTab = to } // e.g. the theme name in the footer opens the theme tab

// Changes apply instantly (to the preview and to the page behind), and are saved per device
export default function SettingsPanel({ a, onChange, onClose, onPreviewSound, presets, onSavePreset, onApplyPreset, onDeletePreset, onExport, onImport, onReset }: Props) {
  // hovering a theme card previews it on the whole page; leaving (or closing the panel) puts yours back
  const peek = (th: Theme) => { document.documentElement.dataset.theme = resolveTheme(th) }
  const unpeek = () => { document.documentElement.dataset.theme = resolveTheme(a.theme) }
  const themeNow = useRef(a.theme)
  themeNow.current = a.theme
  useEffect(() => () => { document.documentElement.dataset.theme = resolveTheme(themeNow.current) }, [])
  const themeCard = (th: Theme) => (
    <button key={th} role="radio" aria-checked={a.theme === th} className={`theme-card ${a.theme === th ? 'on' : ''}`} data-preview={resolveTheme(th)}
      onClick={() => onChange({ theme: th })} onMouseEnter={() => peek(th)} onMouseLeave={unpeek} onFocus={() => peek(th)} onBlur={unpeek}>
      <span className="tc-sample" aria-hidden><span className="tc-ok">thock</span><span className="tc-caret" /><span className="tc-bad">t</span>ype</span>
      <span className="tc-name">{t(THEMES[th])}</span>
    </button>
  )
  const surprise = () => {
    const pool = ALL_THEMES.filter(th => th !== 'auto' && th !== a.theme)
    onChange({ theme: pool[Math.floor(Math.random() * pool.length)] })
  }
  // backup: copy, paste back, or reset (asks twice)
  const [copied, setCopied] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importText, setImportText] = useState('')
  const [ioMsg, setIoMsg] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const exportIt = async () => { setCopied(await copyText(onExport())); setTimeout(() => setCopied(false), 2000) }
  const importIt = () => { const err = onImport(importText); setIoMsg(err ?? 'ajustes aplicados'); if (!err) { setImportText(''); setImporting(false) } }
  const [presetName, setPresetName] = useState('')
  const [query, setQuery] = useState('')
  // jump to the tab of a search result and briefly highlight that option
  const reveal = (to: Tab, label: string) => {
    setQuery(''); setTab(to)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const hit = [...(card.current?.querySelectorAll('.set-page small, .set-page .set-toggle b') ?? [])].find(e => e.textContent?.startsWith(t(label)))
      const target = hit?.closest('section, .set-toggle') as HTMLElement | null
      target?.scrollIntoView({ block: 'nearest' })
      target?.classList.remove('flash'); void target?.offsetWidth; target?.classList.add('flash')
    }))
  }
  const [justSaved, setJustSaved] = useState('')
  const savePreset = (e: React.FormEvent) => {
    e.preventDefault()
    const name = presetName.trim()
    if (!name || (presets.length >= MAX_PRESETS && !presets.includes(name))) return
    onSavePreset(name); setPresetName(''); setJustSaved(name)
  }
  useEffect(() => { (Object.keys(FONTS) as Font[]).forEach(loadFont) }, []) // so each option shows in its own font
  const [tab, setTabState] = useState<Tab>(lastTab)
  const card = useRef<HTMLDivElement>(null)
  useLayoutMotion(card)
  const setTab = (to: Tab) => { lastTab = to; setTabState(to) }

  // single choice among string options
  const group = <K extends keyof Prefs>(key: K, options: Record<string, string>, render?: (v: string) => React.ReactNode, only?: readonly string[], onPick?: (v: string) => void) => (
    <div className="set-options" role="radiogroup">
      {(only ?? Object.keys(options)).map(v => (
        <button key={v} role="radio" aria-checked={a[key] === v} className={a[key] === v ? 'on' : ''}
          onClick={() => { onChange({ [key]: v } as Partial<Prefs>); onPick?.(v) }}>
          {render ? render(v) : t(options[v])}
        </button>
      ))}
    </div>
  )
  // on/off preference
  // compact on/off chip, for options that read fine without an explanation
  const flag = (key: Flag, label: string, title?: string) => (
    <button key={key} role="switch" aria-checked={a[key]} className={a[key] ? 'on' : ''} title={title && t(title)} onClick={() => onChange({ [key]: !a[key] })}>{t(label)}</button>
  )
  const toggle = (key: Flag, label: string, help: string) => (
    <button role="switch" aria-checked={a[key]} className={`set-toggle ${a[key] ? 'on' : ''}`} onClick={() => onChange({ [key]: !a[key] })}>
      <span><b>{t(label)}</b><small>{t(help)}</small></span>
      <span className="switch" aria-hidden />
    </button>
  )

  const preview = t('escribe rápido, escribe limpio').split(', ') // typed half, then the caret after one letter
  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div ref={card} className="settings card" role="dialog" aria-modal="true" aria-label={t('ajustes')}
        onMouseDown={e => e.stopPropagation()} onKeyDown={e => e.key === 'Escape' && onClose()}>
        <div className="settings-head">
          <h2>{t('ajustes')} <small>{t(a.synced ? 'se guardan en tu cuenta' : 'se guardan en este dispositivo')}</small></h2>
          <input className="set-input set-search" type="search" placeholder={t('buscar: cinta, fantasma…')} aria-label={t('buscar ajuste')}
            value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { const first = search(query)[0]; if (e.key === 'Enter' && first) reveal(first[0], first[1]) }} />
          <button onClick={onClose} aria-label={t('cerrar')} autoFocus>✕</button>
        </div>

        <div className="settings-preview" aria-hidden>
          <span className="ok">{preview[0]},</span>{' '}
          <span className="pv-next">{preview[1][0]}<span className="caret static" /></span>{preview[1].slice(1)}
        </div>

        {query.trim() ? (
          <div className="set-page set-results" role="listbox" aria-label={t('resultados')}>
            {search(query).length ? search(query).map(([to, label]) => (
              <button key={to + label} role="option" aria-selected={false} onClick={() => reveal(to, label)}>
                <b>{t(label)}</b><small>{t(TABS[to])}</small>
              </button>
            )) : <p className="set-help">{t('ningún ajuste coincide con «{q}»', { q: query })}</p>}
          </div>
        ) : <>
        <div className="set-tabs" role="tablist" data-pill>
          <span className="seg-pill" aria-hidden />
          {(Object.keys(TABS) as Tab[]).map(tb => (
            <button key={tb} role="tab" aria-selected={tab === tb} className={tab === tb ? 'on' : ''} onClick={() => setTab(tb)}>{t(TABS[tb])}</button>
          ))}
        </div>

        <div className="set-page" key={tab} role="tabpanel">
          {tab === 'tema' && <>
            <section><small>{t('idioma de la interfaz')}</small>{group('uiLang', { auto: 'automático', ...UI_LANGS })}</section>
            <section><small>{t('tema al azar')}</small>
              <div className="set-options">
                <button onClick={surprise}>🎲 {t('sorpréndeme')}</button>
                {flag('themeShuffle', 'distinto en cada visita', 'al abrir ThockType se elige un tema al azar')}
              </div>
            </section>
            {([['monocromáticos', MONO_THEMES], ['originales', ORIGINAL_THEMES], ['populares', POPULAR_THEMES]] as const).map(([label, list]) => (
              <section key={label}><small>{t(label)} · {list.length}</small>
                <div className="theme-grid" role="radiogroup" aria-label={t(label)}>{list.map(th => themeCard(th as Theme))}</div>
              </section>
            ))}
          </>}
          {tab === 'texto' && <>
            <section className="fonts"><small>{t('fuente')}</small>{group('font', FONTS, f => <span style={{ fontFamily: FONT_FAMILY[f as Font] }}>{FONTS[f as Font]}</span>)}</section>
            {a.font === 'local' && (
              <input className="set-input" placeholder={t('nombre de una fuente instalada, p. ej. Consolas')} aria-label={t('fuente local')} autoFocus
                value={a.localFont} maxLength={60} onChange={e => onChange({ localFont: e.target.value })} />
            )}
            <section><small>{t('tamaño del texto')}</small>{group('size', SIZES)}</section>
            <div className="set-pair">
              <section><small>{t('líneas')}</small>{group('lines', LINES, v => v)}</section>
              <section className="width-opt"><small>{t('ancho')}</small>{group('width', WIDTHS)}</section>
            </div>
          </>}
          {tab === 'cursor' && <>
            <section><small>{t('estilo')}</small>{group('caret', CARETS)}</section>
            <section><small>{t('movimiento')}</small>{group('caretMotion', CARET_MOTION)}</section>
            <div className="set-toggles">{toggle('ghost', 'fantasma', 'un segundo cursor corre a ritmo fijo; en vivo ves cuántas letras le llevas')}</div>
            {a.ghost && <>
              <section><small>{t('el fantasma corre a')}</small>
                <div className="set-row">
                  {group('ghostSource', GHOST_SOURCES)}
                  {a.ghostSource === 'fixed' && (
                    <label className="set-num">
                      <input type="number" min={10} max={300} value={a.ghostWpm} aria-label={t('wpm del fantasma')}
                        onChange={e => onChange({ ghostWpm: Math.max(10, Math.min(300, Number(e.target.value) || 0)) })} /> wpm
                    </label>
                  )}
                </div>
              </section>
              <section><small>{t('estilo del fantasma')}</small>{group('ghostStyle', CARETS)}</section>
            </>}
          </>}
          {tab === 'vista' && <>
            <div className="set-pair">
              <section><small>{t('desplazamiento')}</small>{group('tape', TAPE)}</section>
              {a.tape === 'on' && <section><small>{t('cursor en la cinta')}</small>{group('tapeMargin', TAPE_MARGINS)}</section>}
            </div>
            <section><small>{t('resaltar')}</small>{group('highlight', HIGHLIGHTS)}</section>
            <section><small>{t('palabras escritas')}</small>{group('typedEffect', TYPED_EFFECTS)}</section>
            <section><small>{t('teclado en pantalla')}</small>{group('keymap', KEYMAPS)}</section>
            <section><small>{t('movimiento')}</small><div className="set-options">{flag('smoothScroll', 'cambio de línea suave')}</div></section>
          </>}
          {tab === 'vivo' && <>
            <section><small>{t('progreso del test')}</small>{group('progress', PROGRESS)}</section>
            <section><small>{t('mostrar mientras escribes')}</small>
              <div className="set-options">{flag('live', 'wpm')}{flag('liveAcc', 'precisión')}{flag('liveBurst', 'ráfaga', 'velocidad de tu última palabra')}</div>
            </section>
            <section><small>{t('color de los números')}</small>{group('liveColor', LIVE_COLORS)}</section>
            <section><small>{t('otros')}</small>
              <div className="set-options">{flag('focus', 'modo enfoque', 'oculta también la cabecera mientras escribes')}{flag('graphZero', 'gráficas desde cero', 'el eje de las gráficas empieza en 0')}</div>
            </section>
          </>}
          {tab === 'perfiles' && <>
            <section><small>{t('guardar los ajustes actuales')}</small>
              <form className="set-row" onSubmit={savePreset}>
                <input className="set-input preset-name" placeholder={t('nombre, p. ej. sprint 15s')} maxLength={30} aria-label={t('nombre del perfil')}
                  value={presetName} onChange={e => setPresetName(e.target.value)} />
                <button className="on" type="submit" disabled={!presetName.trim() || (presets.length >= MAX_PRESETS && !presets.includes(presetName.trim()))}>
                  {t(presets.includes(presetName.trim()) ? 'reemplazar' : 'guardar')}
                </button>
              </form>
              <small className="set-help">{t('guarda modo, idioma, reglas, tema, cursor, vista y sonido. Se aplica con un clic o desde ctrl+k → «perfil».')}</small>
            </section>
            <section><small>{t('tus perfiles')} · {presets.length}/{MAX_PRESETS}</small>
              {presets.length ? (
                <ul className="preset-list">
                  {presets.map(name => (
                    <li key={name} className={justSaved === name ? 'fresh' : ''}>
                      <span>{name}</span>
                      <button onClick={() => { onApplyPreset(name); onClose() }}>{t('aplicar')}</button>
                      <button onClick={() => onDeletePreset(name)} aria-label={`borrar ${name}`}>✕</button>
                    </li>
                  ))}
                </ul>
              ) : <p className="set-help">{t('aún no tienes perfiles')}</p>}
            </section>
            <section><small>{t('copia de seguridad')}</small>
              <div className="set-options">
                <button onClick={exportIt}>{copied ? `✓ ${t('copiado')}` : `⧉ ${t('copiar mis ajustes')}`}</button>
                <button className={importing ? 'on' : ''} onClick={() => { setImporting(!importing); setIoMsg('') }}>{t('importar')}</button>
                <button className={confirmReset ? 'danger' : ''} onBlur={() => setConfirmReset(false)}
                  onClick={() => { if (confirmReset) { onReset(); setConfirmReset(false); setIoMsg('ajustes restablecidos') } else setConfirmReset(true) }}>
                  {t(confirmReset ? '¿seguro? toca otra vez' : 'restablecer todo')}
                </button>
              </div>
              {importing && (
                <div className="set-import">
                  <textarea className="set-input" rows={3} placeholder={t('pega aquí tus ajustes copiados')} aria-label={t('ajustes para importar')}
                    value={importText} onChange={e => setImportText(e.target.value)} autoFocus />
                  <button className="on" disabled={!importText.trim()} onClick={importIt}>{t('aplicar')}</button>
                </div>
              )}
              <small className="set-help" role="status">{ioMsg ? t(ioMsg) : t('copia tus ajustes para pasarlos a otro navegador. Restablecer no borra tus perfiles, etiquetas ni resultados.')}</small>
            </section>
          </>}
          {tab === 'sonido' && <>
            <div className="set-toggles">
              {toggle('sound', 'sonido al teclear', 'un golpe sintetizado por tecla; más grave al fallar')}
              {toggle('timeWarn', 'aviso de tiempo', 'un pitido suave en los últimos 5 segundos de los tests de tiempo')}
            </div>
            <section><small>{t('tipo de sonido · toca para escucharlo')}</small>
              {group('soundKind', SOUNDS, undefined, undefined, k => onPreviewSound(k as SoundKind, a.volume))}
            </section>
            <section><small>{t('volumen')} · {Math.round(a.volume * 100)}%</small>
              <input className="set-range" type="range" min={0.1} max={1} step={0.05} value={a.volume} aria-label={t('volumen')}
                onChange={e => onChange({ volume: Number(e.target.value) })}
                onPointerUp={e => onPreviewSound(a.soundKind, Number(e.currentTarget.value))} />
            </section>
          </>}
        </div>
        </>}
      </div>
    </div>
  )
}
