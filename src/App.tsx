import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { LANGS, randomQuote, randomWords, type Lang } from './words'
import { bestWpm, modeKey, charStats, consistency, correctChars, loadHistory, saveResult, streak, wpm, type Mode, type Result } from './stats'
import { thock } from './sound'
import Chart from './Chart'
import Heatmap from './Heatmap'

const DURATIONS = [15, 30, 60, 120]
const COUNTS = [10, 25, 50, 100]
const MODES: Record<Mode, string> = { time: 'tiempo', words: 'palabras', quote: 'cita', zen: 'zen', custom: 'libre' }

type Settings = {
  lang: Lang; mode: Mode; duration: number; count: number; punct: boolean; numbers: boolean; custom: string
  theme: 'dark' | 'light'; sound: boolean; live: boolean; ghost: boolean
}
const DEFAULTS: Settings = {
  lang: 'es', mode: 'time', duration: 30, count: 25, punct: false, numbers: false,
  custom: 'escribe aquí tu propio texto para practicar', theme: 'dark', sound: false, live: true, ghost: true,
}
const SKEY = 'thocktype.settings'
function loadSettings(): Settings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SKEY) || '{}') } } catch { return DEFAULTS }
}

// punctuation/numbers only apply to generated words
const usesOpts = (m: Mode) => m === 'time' || m === 'words'
const testKey = (s: Settings) => modeKey({
  lang: s.lang, mode: s.mode, duration: 0,
  value: s.mode === 'time' ? s.duration : s.mode === 'words' ? s.count : 0,
  punct: usesOpts(s.mode) && s.punct, numbers: usesOpts(s.mode) && s.numbers,
})

function buildTest(s: Settings): { words: string[]; by?: string } {
  const opts = { punct: s.punct, numbers: s.numbers }
  switch (s.mode) {
    case 'time': return { words: randomWords(s.lang, 300, opts) }
    case 'words': return { words: randomWords(s.lang, s.count, opts) }
    case 'quote': return randomQuote(s.lang)
    case 'custom': return { words: s.custom.trim().split(/\s+/).filter(Boolean) }
    case 'zen': return { words: [] }
  }
}

type Sample = { wpm: number; raw: number }
type FullResult = Result & {
  samples: Sample[]; chars: ReturnType<typeof charStats>; by?: string
  hits: Record<string, number>; errs: Record<string, number>; prevPb: number
}

// pixel position of character `ci` inside a word element (after the last char if past the end)
function charPos(word: HTMLElement, ci: number, sel = '.c') {
  const chars = word.querySelectorAll<HTMLElement>(sel)
  const el = chars[Math.min(ci, chars.length - 1)]
  if (!el) return { x: word.offsetLeft, y: word.offsetTop }
  return { x: el.offsetLeft + (ci >= chars.length ? el.offsetWidth : 0), y: el.offsetTop }
}

export default function App() {
  const [s, setS] = useState(loadSettings)
  const [history, setHistory] = useState(loadHistory)
  const [test, setTest] = useState(() => buildTest(s))
  const words = test.words
  const [typed, setTyped] = useState<string[]>([''])
  const [clock, setClock] = useState(0) // seconds elapsed
  const [liveWpm, setLiveWpm] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [result, setResult] = useState<FullResult | null>(null)
  const [view, setView] = useState<'test' | 'history'>('test')
  const [editing, setEditing] = useState(false)

  const zen = s.mode === 'zen'
  const finite = s.mode !== 'time' && !zen

  useEffect(() => {
    document.documentElement.dataset.theme = s.theme
    try { localStorage.setItem(SKEY, JSON.stringify(s)) } catch { /* storage blocked */ }
  }, [s])

  const fresh = () => ({ start: 0, keys: 0, good: 0, secKeys: 0, samples: [] as Sample[], hits: {} as Record<string, number>, errs: {} as Record<string, number> })
  // mutable test data read inside the timer and animation loop
  const t = useRef({ ...fresh(), typed, words })
  t.current.typed = typed
  t.current.words = words

  const restart = useCallback((next: Partial<Settings> = {}) => {
    const ns = { ...s, ...next }
    setS(ns)
    setTest(buildTest(ns))
    setTyped([''])
    setClock(0)
    setLiveWpm(0)
    setPhase('idle')
    setResult(null)
    setView('test')
    setEditing(false)
    t.current = { ...t.current, ...fresh() }
  }, [s])

  const key = testKey(s)
  const pb = useMemo(() => bestWpm(history, key), [history, key])

  const finish = useCallback((typed: string[]) => {
    const { keys, good, samples, hits, errs, start } = t.current
    const done = typed[typed.length - 1] === '' ? typed.slice(0, -1) : typed
    const targets = zen ? done : words
    const secs = s.mode === 'time' ? s.duration : Math.max(1, (performance.now() - start) / 1000)
    const r: Result = {
      date: Date.now(),
      wpm: Math.round(wpm(correctChars(targets, done), secs)),
      raw: Math.round(wpm(done.join(' ').length, secs)),
      acc: keys ? Math.round((good / keys) * 100) : 0,
      cons: Math.round(consistency(samples.map(x => x.raw))),
      lang: s.lang, duration: Math.round(secs), mode: s.mode,
      value: s.mode === 'time' ? s.duration : s.mode === 'words' ? s.count : 0,
      punct: usesOpts(s.mode) && s.punct, numbers: usesOpts(s.mode) && s.numbers,
    }
    if (!done.length) { setPhase('idle'); return } // nothing typed (zen): don't record
    saveResult(r)
    setHistory(h => [...h, r])
    setResult({ ...r, samples, chars: charStats(targets, done), hits, errs, prevPb: pb, by: test.by })
    setPhase('done')
  }, [s, pb, words, zen, test.by])

  // 1s tick: sample speed, count the clock
  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => {
      const c = t.current
      const sec = c.samples.length + 1
      const targets = zen ? c.typed : c.words
      const sample = { wpm: Math.round(wpm(correctChars(targets, c.typed), sec)), raw: Math.round(wpm(c.secKeys, 1)) }
      c.samples.push(sample)
      c.secKeys = 0
      setLiveWpm(sample.wpm)
      setClock(sec)
      if (s.mode === 'time' && sec >= s.duration) finish(c.typed)
    }, 1000)
    return () => clearInterval(id)
  }, [phase, s.mode, s.duration, finish, zen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Tab' || e.key === 'Escape') { e.preventDefault(); restart(); return }
      if (phase === 'done' || view !== 'test' || editing || e.metaKey || e.altKey) return
      if (zen && e.key === 'Enter' && e.shiftKey) { e.preventDefault(); if (phase === 'running') finish(typed); return }
      const c = t.current
      const i = typed.length - 1
      const cur = typed[i]
      const target = zen ? undefined : words[i]
      if (!zen && target === undefined) return // empty custom text

      if (e.key === 'Backspace') {
        e.preventDefault()
        if (cur === '' && i > 0 && (zen || typed[i - 1] !== words[i - 1])) setTyped(typed.slice(0, -1)) // back into a wrong word
        else setTyped([...typed.slice(0, i), e.ctrlKey ? '' : cur.slice(0, -1)])
        return
      }
      // dead keys (´ ¨ ^) arrive as 'Dead' and are ignored; the composed letter (á) comes next
      if (e.key.length !== 1 || e.ctrlKey) return
      e.preventDefault()
      if (phase === 'idle') { c.start = performance.now(); setPhase('running') }
      if (e.key === ' ') {
        if (cur === '') return
        c.keys++; c.secKeys++
        const ok = zen || cur === target
        if (ok) c.good++
        if (s.sound) thock(!ok)
        if (finite && i === words.length - 1) { finish(typed); return } // space on the last word ends the test
        setTyped([...typed, ''])
        if (s.mode === 'time' && i > words.length - 50) setTest({ words: [...words, ...randomWords(s.lang, 200, s)] })
        return
      }
      c.keys++; c.secKeys++
      const expected = target?.[cur.length]
      const ok = zen || expected === e.key
      if (ok) c.good++
      if (expected) {
        const k = expected.toLowerCase()
        c.hits[k] = (c.hits[k] ?? 0) + 1
        if (!ok) c.errs[k] = (c.errs[k] ?? 0) + 1
      }
      if (s.sound) thock(!ok)
      const next = [...typed.slice(0, i), cur + e.key]
      setTyped(next)
      if (finite && i === words.length - 1 && cur + e.key === target) finish(next) // last word typed correctly ends the test
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [typed, words, phase, view, editing, s, zen, finite, restart, finish])

  // smooth caret + smooth line scroll
  const inner = useRef<HTMLDivElement>(null)
  const caret = useRef<HTMLSpanElement>(null)
  const ghost = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const box = inner.current
    const word = box?.querySelectorAll<HTMLElement>('.word')[typed.length - 1]
    if (!box || !word || !caret.current) return
    const shift = Math.max(0, word.offsetTop - word.offsetHeight)
    box.style.transform = `translateY(${-shift}px)`
    const p = charPos(word, typed[typed.length - 1].length)
    caret.current.style.transform = `translate(${p.x}px, ${p.y}px)`
  }, [typed, view, phase, editing])

  // TypeRacer-style ghost: a second caret running at your personal best for this mode
  useEffect(() => {
    const g = ghost.current
    if (!g) return
    g.style.display = 'none'
    if (phase !== 'running' || !s.ghost || !pb || zen) return
    let raf = 0
    const loop = () => {
      const c = t.current
      let chars = (pb * 5 * (performance.now() - c.start)) / 60000
      let wi = 0
      while (wi < c.words.length - 1 && chars > c.words[wi].length) { chars -= c.words[wi].length + 1; wi++ }
      const word = inner.current?.querySelectorAll<HTMLElement>('.word')[wi]
      if (word) {
        const p = charPos(word, Math.max(0, Math.floor(chars)), '.l')
        g.style.display = 'block'
        g.style.transform = `translate(${p.x}px, ${p.y}px)`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [phase, s.ghost, pb, zen])

  const days = streak(history)
  const shown = zen ? typed : words.slice(0, typed.length + 80)
  const progress =
    s.mode === 'time' ? s.duration - clock
    : zen ? clock
    : `${typed.length - 1}/${words.length}`

  return (
    <main className={phase === 'running' ? 'running' : ''}>
      <header>
        <h1 onClick={() => restart()}>thock<span>type</span></h1>
        <nav>
          {days > 0 && <span className="streak" title="días seguidos practicando">racha {days}d</span>}
          <button className={view === 'test' ? 'on' : ''} onClick={() => restart()}>test</button>
          <button className={view === 'history' ? 'on' : ''} onClick={() => setView('history')}>historial</button>
        </nav>
      </header>

      {view === 'history' ? <History h={history} theme={s.theme} /> : phase === 'done' && result ? (
        <ResultView r={result} theme={s.theme} />
      ) : editing ? (
        <CustomEditor initial={s.custom} onUse={text => restart({ mode: 'custom', custom: text })} onCancel={() => setEditing(false)} />
      ) : (
        <>
          <div className="timer">
            {phase === 'running'
              ? <>{progress}{s.live && <span className="live">{liveWpm} wpm</span>}</>
              : <span className="live">{zen ? 'escribe libremente · shift+enter para terminar' : pb ? `récord ${pb} wpm` : ''}</span>}
          </div>
          <div className="words">
            <div className="inner" ref={inner}>
              {shown.map((w, wi) => {
                const tw = typed[wi] ?? ''
                const wrong = !zen && wi < typed.length - 1 && tw !== w
                return (
                  <span key={wi} className={`word ${wrong ? 'wrong' : ''}`}>
                    {[...w].map((ch, ci) => (
                      <span key={ci} className={`c l ${ci < tw.length ? (tw[ci] === ch ? 'ok' : 'bad') : ''}`}>{ch}</span>
                    ))}
                    {[...tw.slice(w.length)].map((ch, ci) => <span key={'x' + ci} className="c extra">{ch}</span>)}
                  </span>
                )
              })}
              <span className={`caret ${phase === 'idle' ? 'blink' : ''}`} ref={caret} />
              <span className="ghost" ref={ghost} />
            </div>
          </div>
          {test.by && <p className="by fade">— {test.by}</p>}
          <p className="hint fade"><kbd>tab</kbd> reiniciar</p>
        </>
      )}

      {view === 'test' && phase !== 'done' && !editing && (
        <StatusBar s={s} set={setS} restart={restart} edit={() => setEditing(true)} />
      )}
    </main>
  )
}

// Editor-style status line: mode block on the left, options as segments, preferences on the right
function StatusBar({ s, set, restart, edit }: {
  s: Settings; set: (s: Settings) => void; restart: (n?: Partial<Settings>) => void; edit: () => void
}) {
  const opt = (on: boolean, label: string, onClick: () => void, title?: string) =>
    <button className={on ? 'on' : ''} onClick={onClick} title={title}>{label}</button>
  return (
    <footer className="status fade">
      <div className="seg mode">
        {(Object.keys(MODES) as Mode[]).map(m => (
          <button key={m} className={m === s.mode ? 'on' : ''} onClick={() => restart({ mode: m })}>{MODES[m]}</button>
        ))}
      </div>
      <div className="seg">
        {s.mode === 'time' && DURATIONS.map(d => opt(d === s.duration, `${d}s`, () => restart({ duration: d })))}
        {s.mode === 'words' && COUNTS.map(c => opt(c === s.count, `${c}`, () => restart({ count: c })))}
        {s.mode === 'quote' && opt(false, 'otra cita', () => restart())}
        {s.mode === 'custom' && opt(false, 'editar texto', edit)}
        {s.mode === 'zen' && <span className="note">sin límite</span>}
      </div>
      {s.mode !== 'custom' && (
        <div className="seg">
          {(Object.keys(LANGS) as Lang[]).map(l => opt(l === s.lang, LANGS[l], () => restart({ lang: l })))}
        </div>
      )}
      {usesOpts(s.mode) && (
        <div className="seg">
          {opt(s.punct, '@ puntuación', () => restart({ punct: !s.punct }), 'mayúsculas y puntuación')}
          {opt(s.numbers, '# números', () => restart({ numbers: !s.numbers }))}
        </div>
      )}
      <div className="seg prefs">
        {opt(s.sound, 'sonido', () => set({ ...s, sound: !s.sound }))}
        {opt(s.live, 'wpm', () => set({ ...s, live: !s.live }), 'wpm en vivo')}
        {opt(s.ghost, 'fantasma', () => set({ ...s, ghost: !s.ghost }), 'un cursor fantasma corre a tu récord')}
        {opt(false, s.theme === 'dark' ? '◐ claro' : '◑ oscuro', () => set({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))}
      </div>
    </footer>
  )
}

function CustomEditor({ initial, onUse, onCancel }: { initial: string; onUse: (t: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(initial)
  const valid = text.trim().length > 0
  return (
    <section className="editor">
      <small>tu texto · pega lo que quieras practicar</small>
      <textarea autoFocus value={text} onChange={e => setText(e.target.value)} rows={6} />
      <div className="row">
        <button className="on" disabled={!valid} onClick={() => onUse(text.trim())}>usar texto</button>
        <button onClick={onCancel}>cancelar</button>
      </div>
    </section>
  )
}

function ResultView({ r, theme }: { r: FullResult; theme: string }) {
  const labels = useMemo(() => r.samples.map((_, i) => i + 1), [r])
  const series = useMemo(() => [
    { label: 'wpm', data: r.samples.map(x => x.wpm) },
    { label: 'raw', data: r.samples.map(x => x.raw), dim: true },
  ], [r])
  const newPb = r.wpm > r.prevPb
  const mode = r.mode ?? 'time'
  const detail = mode === 'time' ? `${r.duration}s` : mode === 'words' ? `${r.value} palabras · ${r.duration}s` : `${r.duration}s`
  return (
    <section className="result">
      {newPb && <div className="pb">{r.prevPb ? `nuevo récord · +${r.wpm - r.prevPb} wpm` : 'primer récord en este modo'}</div>}
      <div className="big">
        <div><small>wpm</small><b>{r.wpm}</b></div>
        <div><small>precisión</small><b>{r.acc}%</b></div>
      </div>
      {r.samples.length > 1 && <Chart key={theme} labels={labels} series={series} />}
      <div className="small">
        <div><small>raw</small>{r.raw}</div>
        <div><small>consistencia</small>{r.cons}%</div>
        <div title="correctos / incorrectos / extra / faltantes"><small>caracteres</small>{r.chars.correct}/{r.chars.incorrect}/{r.chars.extra}/{r.chars.missed}</div>
        <div><small>modo</small>{MODES[mode]} · {LANGS[r.lang as Lang]} · {detail}{r.punct ? ' @' : ''}{r.numbers ? ' #' : ''}</div>
      </div>
      {r.by && <p className="by">— {r.by}</p>}
      {mode !== 'zen' && <Heatmap hits={r.hits} errs={r.errs} />}
      <p className="hint"><kbd>tab</kbd> siguiente test</p>
    </section>
  )
}

function History({ h, theme }: { h: Result[]; theme: string }) {
  const last = useMemo(() => h.slice(-50), [h])
  const labels = useMemo(() => last.map(r => new Date(r.date).toLocaleDateString()), [last])
  const series = useMemo(() => [{ label: 'wpm', data: last.map(r => r.wpm) }, { label: 'precisión', data: last.map(r => r.acc), dim: true }], [last])
  if (!h.length) return <p className="hint">aún no hay tests. ¡a escribir!</p>
  const avg = Math.round(h.reduce((a, r) => a + r.wpm, 0) / h.length)
  const timed = h.filter(r => (r.mode ?? 'time') === 'time')
  return (
    <section className="result">
      <div className="small">
        <div><small>tests</small>{h.length}</div>
        <div><small>promedio</small>{avg} wpm</div>
        <div><small>racha</small>{streak(h)} días</div>
        {DURATIONS.map(d => {
          const best = Math.max(0, ...timed.filter(r => r.duration === d).map(r => r.wpm))
          return <div key={d}><small>mejor {d}s</small>{best || '-'}</div>
        })}
      </div>
      <Chart key={theme} labels={labels} series={series} />
    </section>
  )
}
