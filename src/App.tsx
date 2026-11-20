import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { LANGS, bigramWords, randomQuote, randomWords, weakWords, type Lang } from './words'
import {
  bestWpm, modeKey, charStats, consistency, correctChars, loadHistory, saveResult, streak, wpm,
  loadKeys, mergeKeys, saveKeys, weakKeys, longestStreak, type KeyStats, type Mode, type Result,
} from './stats'
import { thock } from './sound'
import Chart from './Chart'
import Heatmap from './Heatmap'
import Calendar from './Calendar'
import { inputDiff } from './inputDiff'
import { renderCard } from './shareCard'
import { copyText, shareImage } from './share'
import CoachCard from './CoachCard'
import DailyCard from './DailyCard'
import { challengeNumber, dailyWords, grid, loadDaily, officialFor, saveOfficial, type DailyEntry } from './daily'
import { addBigram, loadBigrams, mergeBigrams, saveBigrams, type Bigrams } from './coach'

// phones/tablets: no physical keyboard, so typing goes through a hidden input
const COARSE = window.matchMedia?.('(pointer: coarse)').matches ?? false

const DURATIONS = [15, 30, 60, 120]
const COUNTS = [10, 25, 50, 100]
const MODES: Record<Mode, string> = { time: 'tiempo', words: 'palabras', quote: 'cita', zen: 'zen', custom: 'libre', practice: 'práctica', daily: 'reto' }
const PRACTICE_WORDS = 40

type Settings = {
  lang: Lang; mode: Mode; duration: number; count: number; punct: boolean; numbers: boolean; custom: string
  theme: 'dark' | 'light'; sound: boolean; live: boolean; ghost: boolean
  drill: string[] // coach letter pairs to practice; empty = practice weak keys
  rules: Rules
}
type Rules = { noBack: boolean; blind: boolean; brake: boolean; sudden: boolean }
const NO_RULES: Rules = { noBack: false, blind: false, brake: false, sudden: false }
const RULES: Record<keyof Rules, [label: string, help: string]> = {
  noBack: ['sin borrar', 'backspace desactivado'],
  blind: ['ciego', 'no ves tus errores hasta el final'],
  brake: ['frenar', 'no avanzas hasta teclear la letra correcta'],
  sudden: ['súbita', 'un error y se acaba el test'],
}
// the daily challenge is the same fair test for everyone, and zen has nothing to be wrong about
const activeRules = (s: Settings): Rules => (s.mode === 'daily' || s.mode === 'zen' ? NO_RULES : s.rules)
const DEFAULTS: Settings = {
  lang: 'es', mode: 'time', duration: 30, count: 25, punct: false, numbers: false,
  custom: 'escribe aquí tu propio texto para practicar', theme: 'dark', sound: false, live: true, ghost: true, drill: [], rules: NO_RULES,
}
const SKEY = 'thocktype.settings'
function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(SKEY) || '{}')
    return { ...DEFAULTS, ...saved, rules: { ...NO_RULES, ...saved.rules } }
  } catch { return DEFAULTS }
}

// punctuation/numbers only apply to generated words
const usesOpts = (m: Mode) => m === 'time' || m === 'words'
const testKey = (s: Settings) => modeKey({
  lang: s.lang, mode: s.mode, duration: 0,
  value: s.mode === 'time' ? s.duration : s.mode === 'words' ? s.count : 0,
  punct: usesOpts(s.mode) && s.punct, numbers: usesOpts(s.mode) && s.numbers,
})

function buildTest(s: Settings, keys: KeyStats): { words: string[]; by?: string } {
  const opts = { punct: s.punct, numbers: s.numbers }
  switch (s.mode) {
    case 'practice': return {
      words: s.drill.length ? bigramWords(s.lang, s.drill, PRACTICE_WORDS) : weakWords(s.lang, weakKeys(keys), PRACTICE_WORDS),
    }
    case 'time': return { words: randomWords(s.lang, 300, opts) }
    case 'words': return { words: randomWords(s.lang, s.count, opts) }
    case 'quote': return randomQuote(s.lang)
    case 'custom': return { words: s.custom.trim().split(/\s+/).filter(Boolean) }
    case 'zen': return { words: [] }
    case 'daily': return { words: dailyWords(s.lang) }
  }
}

type Sample = { wpm: number; raw: number }
type FullResult = Result & {
  samples: Sample[]; chars: ReturnType<typeof charStats>; by?: string
  hits: Record<string, number>; errs: Record<string, number>; prevPb: number; bigrams: Bigrams
  daily?: { n: number; official: boolean; entry: DailyEntry } // set for the daily challenge
  failed?: number // sudden death: index of the word where the test was lost
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
  const [keyStats, setKeyStats] = useState(loadKeys)
  const [daily, setDaily] = useState(loadDaily)
  const [test, setTest] = useState(() => buildTest(s, keyStats))
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

  const fresh = () => ({ start: 0, keys: 0, good: 0, secKeys: 0, samples: [] as Sample[], hits: {} as Record<string, number>, errs: {} as Record<string, number>, bigrams: {} as Bigrams, lastAt: 0 })
  // mutable test data read inside the timer and animation loop
  const t = useRef({ ...fresh(), typed, words })
  t.current.typed = typed
  t.current.words = words

  const restart = useCallback((next: Partial<Settings> = {}) => {
    const ns = { ...s, ...next }
    setS(ns)
    setTest(buildTest(ns, keyStats))
    setTyped([''])
    setClock(0)
    setLiveWpm(0)
    setPhase('idle')
    setResult(null)
    setView('test')
    setEditing(false)
    t.current = { ...t.current, ...fresh() }
  }, [s, keyStats])

  const key = testKey(s)
  const pb = useMemo(() => bestWpm(history, key), [history, key])

  const finish = useCallback((typed: string[], failed?: number) => {
    const { keys, good, samples, hits, errs, start, bigrams } = t.current
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
      rules: (Object.keys(RULES) as (keyof Rules)[]).filter(k => activeRules(s)[k]),
    }
    if (!done.length) { setPhase('idle'); return } // nothing typed (zen): don't record
    if (failed !== undefined) { // sudden death: show what happened, keep it out of history and records
      setResult({ ...r, samples, chars: charStats(targets, done), hits, errs, prevPb: pb, by: test.by, bigrams, failed })
      setPhase('done')
      return
    }
    saveResult(r)
    setHistory(h => [...h, r])
    const merged = mergeKeys(keyStats, { hits, errs })
    saveKeys(merged)
    setKeyStats(merged)
    saveBigrams(mergeBigrams(loadBigrams(), bigrams))
    // daily challenge: only the first attempt of the day counts; later ones are practice
    let dailyInfo: FullResult['daily']
    if (s.mode === 'daily') {
      const prev = officialFor(daily, s.lang)
      const entry = prev ?? { wpm: r.wpm, acc: r.acc, grid: grid(words, done) }
      if (!prev) setDaily(saveOfficial(daily, s.lang, entry))
      dailyInfo = { n: challengeNumber(), official: !prev, entry }
    }
    setResult({ ...r, samples, chars: charStats(targets, done), hits, errs, prevPb: pb, by: test.by, bigrams, daily: dailyInfo })
    setPhase('done')
  }, [s, pb, words, zen, test.by, keyStats, daily])

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
      if (zen && e.key === 'Enter' && e.shiftKey) { e.preventDefault(); if (phase === 'running') finish(t.current.typed); return }
      const c = t.current
      // read/write through the ref so several keys in one tick (mobile autocorrect) don't overwrite each other
      const typed = c.typed
      const type = (next: string[]) => { c.typed = next; setTyped(next) }
      const i = typed.length - 1
      const cur = typed[i]
      const target = zen ? undefined : words[i]
      if (!zen && target === undefined) return // empty custom text
      const rules = activeRules(s)

      if (e.key === 'Backspace') {
        e.preventDefault()
        if (rules.noBack) return
        if (cur === '' && i > 0 && (zen || typed[i - 1] !== words[i - 1])) type(typed.slice(0, -1)) // back into a wrong word
        else type([...typed.slice(0, i), e.ctrlKey ? '' : cur.slice(0, -1)])
        return
      }
      // dead keys (´ ¨ ^) arrive as 'Dead' and are ignored; the composed letter (á) comes next
      if (e.key.length !== 1 || e.ctrlKey) return
      e.preventDefault()
      if (phase === 'idle') { c.start = performance.now(); setPhase('running') }
      if (e.key === ' ') {
        if (cur === '') return
        if (rules.brake && cur !== target) { if (s.sound) thock(true); return } // must finish the word correctly first
        c.keys++; c.secKeys++
        const ok = zen || cur === target
        if (!ok && rules.sudden) { finish(typed, i); return }
        if (ok) c.good++
        c.lastAt = performance.now()
        if (s.sound) thock(!ok)
        if (finite && i === words.length - 1) { finish(typed); return } // space on the last word ends the test
        type([...typed, ''])
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
      // coach: time between two correct letters inside a word = cost of that letter pair
      const now = performance.now()
      if (ok && target && cur.length > 0 && cur[cur.length - 1] === target[cur.length - 1] && c.lastAt) {
        const dt = now - c.lastAt
        if (dt > 15 && dt < 2000) addBigram(c.bigrams, (target[cur.length - 1] + e.key).toLowerCase(), dt) // skip bursts and pauses
      }
      c.lastAt = now
      if (s.sound) thock(!ok)
      if (!ok && rules.sudden) { finish(typed, i); return }
      if (!ok && rules.brake) return // the mistake counts, but the caret stays until the right key
      const next = [...typed.slice(0, i), cur + e.key]
      type(next)
      if (finite && i === words.length - 1 && cur + e.key === target) finish(next) // last word typed correctly ends the test
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [typed, words, phase, view, editing, s, zen, finite, restart, finish])

  // touch keyboards: a hidden input whose changes are replayed as keydown events,
  // so phones go through exactly the same typing logic as physical keyboards
  const touch = useRef<HTMLInputElement>(null)
  const prevInput = useRef(' ') // leading space lets a backspace on an "empty" field still fire
  const [touchFocus, setTouchFocus] = useState(false)
  const resetTouch = (el: HTMLInputElement) => { el.value = ' '; prevInput.current = ' ' }
  const onTouchInput = (e: React.FormEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    for (const key of inputDiff(prevInput.current, el.value)) window.dispatchEvent(new KeyboardEvent('keydown', { key }))
    if ((e.nativeEvent as InputEvent).isComposing) prevInput.current = el.value
    else resetTouch(el)
  }

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
  const todayDaily = officialFor(daily, s.lang)
  const on = (Object.keys(RULES) as (keyof Rules)[]).filter(k => activeRules(s)[k])
  const ruleTags = on.length > 0 && <span className="rule-tags">{on.map(k => <span key={k}>{RULES[k][0]}</span>)}</span>
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
          {!todayDaily && s.mode !== 'daily' && (
            <button className="daily-pill" onClick={() => restart({ mode: 'daily' })} title="el mismo texto para todos hoy">reto #{challengeNumber()}</button>
          )}
          {days > 0 && <span className="streak" title="días seguidos practicando">racha {days}d</span>}
          <button className={view === 'test' ? 'on' : ''} onClick={() => restart()}>test</button>
          <button className={view === 'history' ? 'on' : ''} onClick={() => setView('history')}>historial</button>
        </nav>
      </header>

      {view === 'history' ? <History h={history} theme={s.theme} keys={keyStats} onDrill={drill => restart({ mode: 'practice', drill })} /> : phase === 'done' && result ? (
        <ResultView r={result} theme={s.theme} onNext={() => restart()} onDrill={drill => restart({ mode: 'practice', drill })} />
      ) : editing ? (
        <CustomEditor initial={s.custom} onUse={text => restart({ mode: 'custom', custom: text })} onCancel={() => setEditing(false)} />
      ) : (
        <>
          <div className="timer">
            {phase === 'running'
              ? <>{progress}{s.live && <span className="live">{liveWpm} wpm</span>}{ruleTags}</>
              : <span className="live">{zen ? 'escribe libremente · shift+enter para terminar' : pb ? `récord ${pb} wpm` : ''}</span>}
          </div>
          <div className="typing">
          {COARSE && (
            <>
              <input ref={touch} className="touch-input" defaultValue=" " aria-label="escribe aquí"
                autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint="next"
                onInput={onTouchInput} onCompositionEnd={e => resetTouch(e.currentTarget)}
                onFocus={e => {
                  setTouchFocus(true)
                  const el = e.currentTarget // wait for the on-screen keyboard to open, then keep the text visible
                  setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)
                }}
                onBlur={() => setTouchFocus(false)} />
              {!touchFocus && <button className="tap-hint" onClick={() => touch.current?.focus()}>toca para escribir</button>}
            </>
          )}
          <div className={`words ${activeRules(s).blind ? 'blind' : ''}`}>
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
          </div>
          {test.by && <p className="by fade">— {test.by}</p>}
          <p className="hint fade">
            {COARSE ? <button onClick={() => restart()}>↻ reiniciar</button> : <><kbd>tab</kbd> reiniciar</>}
          </p>
        </>
      )}

      {view === 'test' && phase !== 'done' && !editing && (
        <StatusBar s={s} set={setS} restart={restart} edit={() => setEditing(true)} weak={weakKeys(keyStats)} today={todayDaily} />
      )}
    </main>
  )
}

// Editor-style status line: mode block on the left, options as segments, preferences on the right
function StatusBar({ s, set, restart, edit, weak, today }: {
  s: Settings; set: (s: Settings) => void; restart: (n?: Partial<Settings>) => void; edit: () => void; weak: string[]
  today?: DailyEntry
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
        {s.mode === 'daily' && (
          <span className="note">reto #{challengeNumber()} · {today ? `hecho · ${today.wpm} wpm · los siguientes intentos son práctica` : 'tu primer intento de hoy es el oficial'}</span>
        )}
        {s.mode === 'practice' && s.drill.length > 0 && (
          <span className="note" title="combinaciones lentas que detectó el coach">
            combinaciones <b className="weak">{s.drill.join(' ')}</b>
            <button onClick={() => restart({ drill: [] })} title="volver a teclas débiles" aria-label="quitar combinaciones">✕</button>
          </span>
        )}
        {s.mode === 'practice' && !s.drill.length && (weak.length
          ? <span className="note" title="tus teclas con más errores en todos tus tests">teclas <b className="weak">{weak.join(' ')}</b></span>
          : <span className="note">haz unos tests para detectar tus teclas débiles</span>)}
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
      {s.mode !== 'daily' && s.mode !== 'zen' && (
        <div className="seg" aria-label="reglas">
          {(Object.keys(RULES) as (keyof Rules)[]).map(k =>
            opt(s.rules[k], RULES[k][0], () => restart({ rules: { ...s.rules, [k]: !s.rules[k] } }), RULES[k][1]))}
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
    <section className="editor card">
      <small>tu texto · pega lo que quieras practicar</small>
      <textarea autoFocus value={text} onChange={e => setText(e.target.value)} rows={6} />
      <div className="row">
        <button className="on" disabled={!valid} onClick={() => onUse(text.trim())}>usar texto</button>
        <button onClick={onCancel}>cancelar</button>
      </div>
    </section>
  )
}

function ResultView({ r, theme, onNext, onDrill }: { r: FullResult; theme: string; onNext: () => void; onDrill: (pairs: string[]) => void }) {
  const labels = useMemo(() => r.samples.map((_, i) => i + 1), [r])
  const series = useMemo(() => [
    { label: 'wpm', data: r.samples.map(x => x.wpm) },
    { label: 'raw', data: r.samples.map(x => x.raw), dim: true },
  ], [r])
  const newPb = r.failed === undefined && r.wpm > r.prevPb
  const mode = r.mode ?? 'time'
  const detail = mode === 'time' ? `${r.duration}s` : mode === 'words' ? `${r.value} palabras · ${r.duration}s` : `${r.duration}s`
  return (
    <section className="result">
      {r.failed !== undefined && (
        <div className="failed" role="alert">
          <b>muerte súbita</b> · fallaste en la palabra {r.failed + 1}. Este intento no cuenta para tu historial ni tus récords.
        </div>
      )}
      {newPb && <div className="pb">{r.prevPb ? `nuevo récord · +${r.wpm - r.prevPb} wpm` : 'primer récord en este modo'}</div>}
      <div className="big">
        <div><small>wpm</small><b>{r.wpm}</b></div>
        <div><small>precisión</small><b>{r.acc}%</b></div>
      </div>
      {r.samples.length > 1 && <div className="card"><small>velocidad por segundo</small><Chart key={theme} labels={labels} series={series} /></div>}
      <div className="small">
        <div><small>raw</small>{r.raw}</div>
        <div><small>consistencia</small>{r.cons}%</div>
        <div title="correctos / incorrectos / extra / faltantes"><small>caracteres</small>{r.chars.correct}/{r.chars.incorrect}/{r.chars.extra}/{r.chars.missed}</div>
        <div><small>modo</small>{MODES[mode]} · {LANGS[r.lang as Lang]} · {detail}{r.punct ? ' @' : ''}{r.numbers ? ' #' : ''}{r.rules?.length ? ` · ${r.rules.map(k => RULES[k as keyof Rules][0]).join(', ')}` : ''}</div>
      </div>
      <ShareBar r={r} modeLabel={`${MODES[mode]} · ${LANGS[r.lang as Lang]} · ${detail}`} />
      {r.daily && <DailyCard n={r.daily.n} lang={r.lang as Lang} official={r.daily.official} entry={r.daily.entry} />}
      {r.by && <p className="by">— {r.by}</p>}
      {mode !== 'zen' && <CoachCard bigrams={r.bigrams} title="coach · este test" onDrill={onDrill} />}
      {mode !== 'zen' && <div className="card"><small>teclas de este test</small><Heatmap hits={r.hits} errs={r.errs} /></div>}
      <p className="hint">{COARSE ? <button onClick={onNext}>↻ siguiente test</button> : <><kbd>tab</kbd> siguiente test</>}</p>
    </section>
  )
}

function ShareBar({ r, modeLabel }: { r: FullResult; modeLabel: string }) {
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  // shortcut: no link in the text until the app has a public URL, add it after publishing
  const text = `ThockType · ${r.wpm} wpm · ${r.acc}% precisión · ${modeLabel}`
  const flash = (msg: string) => { setStatus(msg); setTimeout(() => setStatus(''), 2500) }
  const onImage = async () => {
    setBusy(true)
    try {
      const blob = await renderCard({
        wpm: r.wpm, acc: r.acc, raw: r.raw, cons: r.cons, modeLabel,
        samples: r.samples.map(x => x.wpm), date: r.date, pb: r.wpm > r.prevPb,
      })
      const how = await shareImage(blob, text)
      if (how === 'downloaded') flash('imagen descargada')
    } catch { flash('no se pudo crear la imagen') }
    setBusy(false)
  }
  return (
    <div className="share">
      <button onClick={onImage} disabled={busy}>{busy ? 'creando…' : '↗ compartir imagen'}</button>
      <button onClick={async () => flash((await copyText(text)) ? 'texto copiado' : 'no se pudo copiar')}>⧉ copiar texto</button>
      <span className="share-status" role="status">{status}</span>
    </div>
  )
}

function History({ h, theme, keys, onDrill }: { h: Result[]; theme: string; keys: KeyStats; onDrill: (pairs: string[]) => void }) {
  const lifetime = useMemo(loadBigrams, [h])
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
        <div><small>racha más larga</small>{longestStreak(h)} días</div>
        {DURATIONS.map(d => {
          const best = Math.max(0, ...timed.filter(r => r.duration === d).map(r => r.wpm))
          return <div key={d}><small>mejor {d}s</small>{best || '-'}</div>
        })}
      </div>
      <div className="card"><small>actividad · últimos 6 meses</small><Calendar h={h} /></div>
      <div className="card"><small>últimos 50 tests · wpm y precisión</small><Chart key={theme} labels={labels} series={series} /></div>
      <CoachCard bigrams={lifetime} title="coach · todos tus tests" minN={8} onDrill={onDrill} />
      <div className="card"><small>todas tus teclas</small><Heatmap hits={keys.hits} errs={keys.errs} /></div>
    </section>
  )
}
