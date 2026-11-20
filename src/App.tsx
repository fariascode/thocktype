import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { LANGS, randomWords, type Lang } from './words'
import { bestWpm, charStats, consistency, correctChars, loadHistory, saveResult, streak, wpm, type Result } from './stats'
import { thock } from './sound'
import Chart from './Chart'
import Heatmap from './Heatmap'

const DURATIONS = [15, 30, 60, 120]

type Settings = { lang: Lang; duration: number; punct: boolean; theme: 'dark' | 'light'; sound: boolean; live: boolean; ghost: boolean }
const DEFAULTS: Settings = { lang: 'es', duration: 30, punct: false, theme: 'dark', sound: false, live: true, ghost: true }
const SKEY = 'thocktype.settings'
function loadSettings(): Settings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SKEY) || '{}') } } catch { return DEFAULTS }
}

type Sample = { wpm: number; raw: number }
type FullResult = Result & {
  samples: Sample[]; chars: ReturnType<typeof charStats>
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
  const [words, setWords] = useState(() => randomWords(s.lang, 300, { punct: s.punct }))
  const [typed, setTyped] = useState<string[]>([''])
  const [timeLeft, setTimeLeft] = useState(s.duration)
  const [liveWpm, setLiveWpm] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [result, setResult] = useState<FullResult | null>(null)
  const [view, setView] = useState<'test' | 'history'>('test')

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
    setWords(randomWords(ns.lang, 300, { punct: ns.punct }))
    setTyped([''])
    setTimeLeft(ns.duration)
    setLiveWpm(0)
    setPhase('idle')
    setResult(null)
    setView('test')
    t.current = { ...t.current, ...fresh() }
  }, [s])

  const pb = useMemo(() => bestWpm(history, s.lang, s.duration, s.punct), [history, s.lang, s.duration, s.punct])

  const finish = useCallback(() => {
    const { typed, words, keys, good, samples, hits, errs } = t.current
    const r: Result = {
      date: Date.now(),
      wpm: Math.round(wpm(correctChars(words, typed), s.duration)),
      raw: Math.round(wpm(typed.join(' ').length, s.duration)),
      acc: keys ? Math.round((good / keys) * 100) : 0,
      cons: Math.round(consistency(samples.map(x => x.raw))),
      lang: s.lang, duration: s.duration, punct: s.punct,
    }
    saveResult(r)
    setHistory(h => [...h, r])
    setResult({ ...r, samples, chars: charStats(words, typed), hits, errs, prevPb: pb })
    setPhase('done')
  }, [s, pb])

  // 1s tick: sample speed, count down
  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => {
      const c = t.current
      const sec = c.samples.length + 1
      const sample = { wpm: Math.round(wpm(correctChars(c.words, c.typed), sec)), raw: Math.round(wpm(c.secKeys, 1)) }
      c.samples.push(sample)
      c.secKeys = 0
      setLiveWpm(sample.wpm)
      setTimeLeft(s.duration - sec)
      if (sec >= s.duration) finish()
    }, 1000)
    return () => clearInterval(id)
  }, [phase, s.duration, finish])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab' || e.key === 'Escape') { e.preventDefault(); restart(); return }
      if (phase === 'done' || view !== 'test' || e.metaKey || e.altKey) return
      const c = t.current
      const i = typed.length - 1
      const cur = typed[i]
      const target = words[i]

      if (e.key === 'Backspace') {
        e.preventDefault()
        if (cur === '' && i > 0 && typed[i - 1] !== words[i - 1]) setTyped(typed.slice(0, -1)) // back into a wrong word
        else setTyped([...typed.slice(0, i), e.ctrlKey ? '' : cur.slice(0, -1)])
        return
      }
      // dead keys (´ ¨ ^) arrive as 'Dead' and are ignored; the composed letter (á) comes next
      if (e.key.length !== 1 || e.ctrlKey) return
      e.preventDefault()
      if (phase === 'idle') { c.start = performance.now(); setPhase('running') }
      c.keys++; c.secKeys++
      if (e.key === ' ') {
        if (cur === '') { c.keys--; c.secKeys--; return }
        if (cur === target) c.good++
        if (s.sound) thock(cur !== target)
        setTyped([...typed, ''])
        if (i > words.length - 50) setWords([...words, ...randomWords(s.lang, 200, { punct: s.punct })])
        return
      }
      const expected = target[cur.length]
      const ok = expected === e.key
      if (ok) c.good++
      if (expected) {
        const k = expected.toLowerCase()
        c.hits[k] = (c.hits[k] ?? 0) + 1
        if (!ok) c.errs[k] = (c.errs[k] ?? 0) + 1
      }
      if (s.sound) thock(!ok)
      setTyped([...typed.slice(0, i), cur + e.key])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [typed, words, phase, view, s, restart])

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
  }, [typed, view, phase])

  // TypeRacer-style ghost: a second caret running at your personal best for this mode
  useEffect(() => {
    const g = ghost.current
    if (!g) return
    g.style.display = 'none'
    if (phase !== 'running' || !s.ghost || !pb) return
    let raf = 0
    const loop = () => {
      const c = t.current
      let chars = (pb * 5 * (performance.now() - c.start)) / 60000
      let wi = 0
      while (wi < c.words.length && chars > c.words[wi].length) { chars -= c.words[wi].length + 1; wi++ }
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
  }, [phase, s.ghost, pb])

  const days = streak(history)

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
      ) : (
        <>
          <div className="config fade">
            {(Object.keys(LANGS) as Lang[]).map(l => (
              <button key={l} className={l === s.lang ? 'on' : ''} onClick={() => restart({ lang: l })}>{LANGS[l]}</button>
            ))}
            <span className="sep" />
            <button className={s.punct ? 'on' : ''} onClick={() => restart({ punct: !s.punct })} title="mayúsculas, puntuación y números">@ #</button>
            <span className="sep" />
            {DURATIONS.map(d => (
              <button key={d} className={d === s.duration ? 'on' : ''} onClick={() => restart({ duration: d })}>{d}</button>
            ))}
          </div>
          <div className="timer">
            {phase === 'running' ? <>{timeLeft}{s.live && <span className="live">{liveWpm} wpm</span>}</> : pb ? <span className="live">récord {pb} wpm</span> : ''}
          </div>
          <div className="words">
            <div className="inner" ref={inner}>
              {words.slice(0, typed.length + 80).map((w, wi) => {
                const tw = typed[wi] ?? ''
                const wrong = wi < typed.length - 1 && tw !== w
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
          <div className="toggles fade">
            <button className={s.sound ? 'on' : ''} onClick={() => setS({ ...s, sound: !s.sound })}>sonido</button>
            <button className={s.live ? 'on' : ''} onClick={() => setS({ ...s, live: !s.live })}>wpm en vivo</button>
            <button className={s.ghost ? 'on' : ''} onClick={() => setS({ ...s, ghost: !s.ghost })} title="un cursor fantasma corre a tu récord">fantasma</button>
            <button onClick={() => setS({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' })}>{s.theme === 'dark' ? 'claro' : 'oscuro'}</button>
          </div>
          <p className="hint fade"><kbd>tab</kbd> reiniciar</p>
        </>
      )}
    </main>
  )
}

function ResultView({ r, theme }: { r: FullResult; theme: string }) {
  const labels = useMemo(() => r.samples.map((_, i) => i + 1), [r])
  const series = useMemo(() => [
    { label: 'wpm', data: r.samples.map(x => x.wpm) },
    { label: 'raw', data: r.samples.map(x => x.raw), dim: true },
  ], [r])
  const newPb = r.wpm > r.prevPb
  return (
    <section className="result">
      {newPb && <div className="pb">{r.prevPb ? `nuevo récord · +${r.wpm - r.prevPb} wpm` : 'primer récord en este modo'}</div>}
      <div className="big">
        <div><small>wpm</small><b>{r.wpm}</b></div>
        <div><small>precisión</small><b>{r.acc}%</b></div>
      </div>
      <Chart key={theme} labels={labels} series={series} />
      <div className="small">
        <div><small>raw</small>{r.raw}</div>
        <div><small>consistencia</small>{r.cons}%</div>
        <div title="correctos / incorrectos / extra / faltantes"><small>caracteres</small>{r.chars.correct}/{r.chars.incorrect}/{r.chars.extra}/{r.chars.missed}</div>
        <div><small>modo</small>{LANGS[r.lang as Lang]} {r.duration}s{r.punct ? ' @#' : ''}</div>
      </div>
      <Heatmap hits={r.hits} errs={r.errs} />
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
  return (
    <section className="result">
      <div className="small">
        <div><small>tests</small>{h.length}</div>
        <div><small>promedio</small>{avg} wpm</div>
        <div><small>racha</small>{streak(h)} días</div>
        {DURATIONS.map(d => {
          const best = Math.max(0, ...h.filter(r => r.duration === d).map(r => r.wpm))
          return <div key={d}><small>mejor {d}s</small>{best || '-'}</div>
        })}
      </div>
      <Chart key={theme} labels={labels} series={series} />
    </section>
  )
}
