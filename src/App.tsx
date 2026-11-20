import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { LANGS, randomWords, type Lang } from './words'
import { consistency, correctChars, loadHistory, saveResult, wpm, type Result } from './stats'
import Chart from './Chart'

const DURATIONS = [15, 30, 60, 120]

export default function App() {
  const [lang, setLang] = useState<Lang>('es')
  const [duration, setDuration] = useState(30)
  const [words, setWords] = useState(() => randomWords('es', 300))
  const [typed, setTyped] = useState<string[]>([''])
  const [timeLeft, setTimeLeft] = useState(30)
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [result, setResult] = useState<(Result & { samples: { wpm: number; raw: number }[] }) | null>(null)
  const [view, setView] = useState<'test' | 'history'>('test')

  // mutable test data read inside the timer
  const t = useRef({ start: 0, keys: 0, good: 0, secKeys: 0, samples: [] as { wpm: number; raw: number }[], typed: [''], words })
  t.current.typed = typed
  t.current.words = words

  const restart = useCallback((l = lang, d = duration) => {
    setWords(randomWords(l, 300))
    setTyped([''])
    setTimeLeft(d)
    setPhase('idle')
    setResult(null)
    setView('test')
    t.current = { ...t.current, start: 0, keys: 0, good: 0, secKeys: 0, samples: [] }
  }, [lang, duration])

  const finish = useCallback(() => {
    const { typed, words, keys, good, samples } = t.current
    const all = typed.join(' ').length
    const r: Result = {
      date: Date.now(),
      wpm: Math.round(wpm(correctChars(words, typed), duration)),
      raw: Math.round(wpm(all, duration)),
      acc: keys ? Math.round((good / keys) * 100) : 0,
      cons: Math.round(consistency(samples.map(s => s.raw))),
      lang, duration,
    }
    saveResult(r)
    setResult({ ...r, samples })
    setPhase('done')
  }, [duration, lang])

  // 1s tick: sample speed, count down
  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => {
      const c = t.current
      const sec = c.samples.length + 1
      c.samples.push({ wpm: Math.round(wpm(correctChars(c.words, c.typed), sec)), raw: Math.round(wpm(c.secKeys, 1)) })
      c.secKeys = 0
      setTimeLeft(duration - sec)
      if (sec >= duration) finish()
    }, 1000)
    return () => clearInterval(id)
  }, [phase, duration, finish])

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
      if (e.key.length !== 1 || e.ctrlKey) return
      e.preventDefault()
      if (phase === 'idle') { c.start = performance.now(); setPhase('running') }
      if (e.key === ' ') {
        if (cur === '') return
        c.keys++; c.secKeys++
        if (cur === target) c.good++
        setTyped([...typed, ''])
        if (i > words.length - 50) setWords([...words, ...randomWords(lang, 200)])
        return
      }
      c.keys++; c.secKeys++
      if (target[cur.length] === e.key) c.good++
      setTyped([...typed.slice(0, i), cur + e.key])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [typed, words, phase, view, lang, restart])

  // keep the active word on the second visible line
  const box = useRef<HTMLDivElement>(null)
  const active = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    if (box.current && active.current) box.current.scrollTop = Math.max(0, active.current.offsetTop - active.current.offsetHeight * 1.5)
  }, [typed.length])

  const pick = (l: Lang, d: number) => { setLang(l); setDuration(d); restart(l, d) }

  return (
    <main>
      <header>
        <h1 onClick={() => restart()}>thock<span>type</span></h1>
        <nav>
          <button className={view === 'test' ? 'on' : ''} onClick={() => restart()}>test</button>
          <button className={view === 'history' ? 'on' : ''} onClick={() => setView('history')}>historial</button>
        </nav>
      </header>

      {view === 'history' ? <History /> : phase === 'done' && result ? (
        <ResultView r={result} />
      ) : (
        <>
          <div className={`config ${phase === 'running' ? 'hide' : ''}`}>
            {(Object.keys(LANGS) as Lang[]).map(l => (
              <button key={l} className={l === lang ? 'on' : ''} onClick={() => pick(l, duration)}>{LANGS[l]}</button>
            ))}
            <span className="sep" />
            {DURATIONS.map(d => (
              <button key={d} className={d === duration ? 'on' : ''} onClick={() => pick(lang, d)}>{d}</button>
            ))}
          </div>
          <div className="timer">{phase === 'running' ? timeLeft : ''}</div>
          <div className="words" ref={box}>
            {words.slice(0, typed.length + 80).map((w, wi) => {
              const tw = typed[wi] ?? ''
              const isActive = wi === typed.length - 1
              const wrong = wi < typed.length - 1 && tw !== w
              return (
                <span key={wi} ref={isActive ? active : undefined} className={`word ${wrong ? 'wrong' : ''}`}>
                  {[...w].map((ch, ci) => (
                    <span key={ci} className={`${ci < tw.length ? (tw[ci] === ch ? 'ok' : 'bad') : ''} ${isActive && ci === tw.length ? 'caret' : ''}`}>{ch}</span>
                  ))}
                  {[...tw.slice(w.length)].map((ch, ci) => <span key={'x' + ci} className="extra">{ch}</span>)}
                  {isActive && tw.length >= w.length && <span className="caret end" />}
                </span>
              )
            })}
          </div>
          <p className="hint"><kbd>tab</kbd> reiniciar</p>
        </>
      )}
    </main>
  )
}

function ResultView({ r }: { r: Result & { samples: { wpm: number; raw: number }[] } }) {
  const labels = useMemo(() => r.samples.map((_, i) => i + 1), [r])
  const series = useMemo(() => [
    { label: 'wpm', data: r.samples.map(s => s.wpm) },
    { label: 'raw', data: r.samples.map(s => s.raw), dim: true },
  ], [r])
  return (
    <section className="result">
      <div className="big">
        <div><small>wpm</small><b>{r.wpm}</b></div>
        <div><small>precisión</small><b>{r.acc}%</b></div>
      </div>
      <Chart labels={labels} series={series} />
      <div className="small">
        <div><small>raw</small>{r.raw}</div>
        <div><small>consistencia</small>{r.cons}%</div>
        <div><small>modo</small>{LANGS[r.lang as Lang]} {r.duration}s</div>
      </div>
      <p className="hint"><kbd>tab</kbd> siguiente test</p>
    </section>
  )
}

function History() {
  const h = useMemo(loadHistory, [])
  const last = h.slice(-50)
  const labels = useMemo(() => last.map(r => new Date(r.date).toLocaleDateString()), [last])
  const series = useMemo(() => [{ label: 'wpm', data: last.map(r => r.wpm) }, { label: 'precisión', data: last.map(r => r.acc), dim: true }], [last])
  if (!h.length) return <p className="hint">aún no hay tests. ¡a escribir!</p>
  const avg = Math.round(h.reduce((a, r) => a + r.wpm, 0) / h.length)
  return (
    <section className="result">
      <div className="small">
        <div><small>tests</small>{h.length}</div>
        <div><small>promedio</small>{avg} wpm</div>
        {DURATIONS.map(d => {
          const best = Math.max(0, ...h.filter(r => r.duration === d).map(r => r.wpm))
          return <div key={d}><small>mejor {d}s</small>{best || '-'}</div>
        })}
      </div>
      <Chart labels={labels} series={series} />
    </section>
  )
}
