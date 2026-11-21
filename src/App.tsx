import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { LANGS, POOLS, bigramWords, plain, randomQuote, randomWords, weakWords, type Lang } from './words'
import {
  bestWpm, modeKey, charStats, consistency, correctChars, loadHistory, saveResult, streak, wpm,
  loadKeys, mergeKeys, saveKeys, weakKeys, DURATIONS, COUNTS, dayKey, type KeyStats, type Mode, type Result,
} from './stats'
import { chime, thock } from './sound'
import PrBanner from './PrBanner'
import { LevelChip, XpCard } from './LevelUi'
import { totalXp, xpFor } from './level'
import { useCountUp, useLayoutMotion } from './motion'
import Chart from './Chart'
import Heatmap from './Heatmap'
import History from './History'
import { inputDiff } from './inputDiff'
import { renderCard } from './shareCard'
import { copyText, shareImage } from './share'
import CoachCard from './CoachCard'
import DailyCard, { type RankProps } from './DailyCard'
import DailyRanking from './DailyRanking'
import CommandPalette, { type Command } from './CommandPalette'
import { APP_URL } from './config'
import AuthModal, { type AuthView } from './AuthModal'
import { supabase } from './supabase'
import type { Session } from '@supabase/supabase-js'
import { addPendingStats, syncAll, syncUp, type Synced } from './sync'
import { getMyProfile, type Profile } from './profile'
import ProfilePage from './ProfilePage'
import { applyAppearance, isLight, type Caret, type Font, type Lines, type Width, type Size, type Theme } from './appearance'
import SettingsPanel from './SettingsPanel'
import { challengeNumber, dailyWords, grid, loadDaily, officialFor, saveOfficial, type DailyEntry } from './daily'
import { addBigram, loadBigrams, mergeBigrams, saveBigrams, type Bigrams } from './coach'

// phones/tablets: no physical keyboard, so typing goes through a hidden input
const PROFILE_RE = /^\/u\/([a-z0-9_]{3,20})\/?$/
const COARSE = window.matchMedia?.('(pointer: coarse)').matches ?? false

const MODES: Record<Mode, string> = { time: 'tiempo', words: 'palabras', quote: 'cita', zen: 'zen', custom: 'libre', practice: 'práctica', daily: 'reto' }
const PRACTICE_WORDS = 40

type Settings = {
  lang: Lang; mode: Mode; duration: number; count: number; punct: boolean; numbers: boolean; custom: string
  pool: number // 200 or 1000 most frequent words (1000 = the whole list)
  plain: boolean // spanish without accents
  theme: Theme; size: Size; font: Font; caret: Caret; lines: Lines; width: Width; sound: boolean; live: boolean; ghost: boolean
  drill: string[] // coach letter pairs to practice; empty = practice weak keys
  rules: Rules
  v: number // settings format version, for one-time migrations
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
  lang: 'es', mode: 'time', duration: 30, count: 25, punct: false, numbers: false, pool: 200, plain: false,
  custom: 'escribe aquí tu propio texto para practicar', theme: 'dark', size: 'm', font: 'cascadia', caret: 'line', lines: '3', width: 'normal', sound: false, live: true, ghost: true, drill: [], rules: NO_RULES, v: 2,
}
const SKEY = 'thocktype.settings'
function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(SKEY) || '{}')
    // v1 saved JetBrains Mono as the default, not as a choice: move those to the new signature font
    if ((saved.v ?? 1) < 2 && saved.font === 'jetbrains') saved.font = 'cascadia'
    return { ...DEFAULTS, ...saved, rules: { ...NO_RULES, ...saved.rules }, v: 2 }
  } catch { return DEFAULTS }
}

// punctuation/numbers/word-list size only apply to generated words
const usesOpts = (m: Mode) => m === 'time' || m === 'words'
// 200-word lists: generated words in a natural language (code tokens have no frequency order)
const pool200 = (s: Settings) => usesOpts(s.mode) && s.lang !== 'code' && s.pool === 200
// accents can be dropped for spanish anywhere except the shared daily challenge and your own text
const usesPlain = (s: Settings) => s.lang === 'es' && s.plain && s.mode !== 'daily' && s.mode !== 'custom'
const wordOpts = (s: Settings) => ({ punct: s.punct, numbers: s.numbers, pool: pool200(s) ? 200 : undefined })
const variant = (s: Settings) => ({
  punct: usesOpts(s.mode) && s.punct, numbers: usesOpts(s.mode) && s.numbers,
  pool: pool200(s) ? 200 : undefined, plain: usesPlain(s) || undefined,
})
const testKey = (s: Settings) => modeKey({
  lang: s.lang, mode: s.mode, duration: 0,
  value: s.mode === 'time' ? s.duration : s.mode === 'words' ? s.count : 0, ...variant(s),
})

function buildTest(s: Settings, keys: KeyStats): { words: string[]; by?: string } {
  const t = generate(s, keys)
  return usesPlain(s) ? { ...t, words: t.words.map(plain) } : t
}
function generate(s: Settings, keys: KeyStats): { words: string[]; by?: string } {
  const opts = wordOpts(s)
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
  xpBefore?: number // account xp before this test (unset when the test didn't count)
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
  const [round, setRound] = useState(0) // bumps on every new test so the text fades in fresh
  const [view, setView] = useState<'test' | 'history'>('test')
  const [path, setPath] = useState(location.pathname)
  useEffect(() => {
    const onPop = () => setPath(location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const go = useCallback((p: string) => { if (location.pathname !== p) window.history.pushState(null, '', p); setPath(p) }, [])
  const profileName = path.match(PROFILE_RE)?.[1]
  const [editing, setEditing] = useState(false)
  const [palette, setPalette] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Caps Lock: browsers only report it on key events, so refresh it on every press/release
  const [caps, setCaps] = useState(false)
  useEffect(() => {
    const check = (e: KeyboardEvent) => setCaps(e.getModifierState?.('CapsLock') ?? false)
    window.addEventListener('keydown', check)
    window.addEventListener('keyup', check)
    return () => { window.removeEventListener('keydown', check); window.removeEventListener('keyup', check) }
  }, [])
  const [session, setSession] = useState<Session | null>(null)
  const [auth, setAuth] = useState<AuthView | null>(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      if (event === 'PASSWORD_RECOVERY') setAuth('newpass') // arrived from the "forgot password" email
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // cloud sync: everything on sign-in/app start, pending uploads when the connection returns
  const uid = session?.user.id
  const [me, setMe] = useState<Profile | null>(null)
  useEffect(() => {
    setMe(null)
    if (uid) getMyProfile(uid).then(setMe)
  }, [uid])
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle')
  const applySync = useCallback((p: Promise<Synced>) => {
    setSyncState('syncing')
    p.then(d => { setHistory(d.history); setDaily(d.daily); setKeyStats(d.keys); setSyncState('ok') })
      .catch(() => setSyncState('error')) // data stays local and is retried on the next sync
  }, [])
  useEffect(() => {
    if (!uid) { setSyncState('idle'); return }
    applySync(syncAll(uid))
    const online = () => applySync(syncUp(uid))
    window.addEventListener('online', online)
    return () => window.removeEventListener('online', online)
  }, [uid, applySync])

  const zen = s.mode === 'zen'
  const finite = s.mode !== 'time' && !zen

  useEffect(() => {
    applyAppearance(s)
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
    setRound(n => n + 1)
    setTyped([''])
    setClock(0)
    setLiveWpm(0)
    setPhase('idle')
    setResult(null)
    setView('test')
    go('/')
    setEditing(false)
    t.current = { ...t.current, ...fresh() }
  }, [s, keyStats, go])

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
      ...variant(s),
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
    addPendingStats({ keys: { hits, errs }, bigrams })
    if (uid) applySync(syncUp(uid))
    // daily challenge: only the first attempt of the day counts; later ones are practice
    let dailyInfo: FullResult['daily']
    if (s.mode === 'daily') {
      const prev = officialFor(daily, s.lang)
      const entry = prev ?? { wpm: r.wpm, acc: r.acc, grid: grid(words, done) }
      if (!prev) setDaily(saveOfficial(daily, s.lang, entry))
      dailyInfo = { n: challengeNumber(), official: !prev, entry }
    }
    if (s.sound && r.wpm > pb) chime()
    setResult({ ...r, samples, chars: charStats(targets, done), hits, errs, prevPb: pb, by: test.by, bigrams, daily: dailyInfo, xpBefore: totalXp(history) })
    setPhase('done')
  }, [s, pb, words, zen, test.by, keyStats, daily, uid, applySync, history])

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
      const k = e.key.toLowerCase()
      if (((e.ctrlKey || e.metaKey) && k === 'k') || (e.ctrlKey && e.shiftKey && k === 'p')) { e.preventDefault(); setPalette(p => !p); return }
      if (palette || auth || settingsOpen || profileName) return // dialogs handle their own keys; profiles aren't for typing
      // typing in a form (login, editor…) must not drive the test; the hidden touch input is the exception
      const el = e.target
      if (el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !el.classList.contains('touch-input'))) return
      // in the history Tab keeps moving focus, so keyboard users can reach its buttons (Esc still goes back)
      if ((e.key === 'Tab' && view === 'test') || e.key === 'Escape') { e.preventDefault(); restart(); return }
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
        if (s.mode === 'time' && i > words.length - 50) setTest({ words: [...words, ...randomWords(s.lang, 200, wordOpts(s)).map(w => (usesPlain(s) ? plain(w) : w))] })
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
  }, [typed, words, phase, view, editing, palette, auth, settingsOpen, profileName, s, zen, finite, restart, finish])

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
  // a web font finishing its download or the window resizing (phone rotation) moves letters: re-place the caret
  const [fontTick, setFontTick] = useState(0)
  useEffect(() => {
    const bump = () => setFontTick(n => n + 1)
    document.fonts?.addEventListener('loadingdone', bump)
    window.addEventListener('resize', bump)
    return () => { document.fonts?.removeEventListener('loadingdone', bump); window.removeEventListener('resize', bump) }
  }, [])
  const ghost = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const box = inner.current
    const word = box?.querySelectorAll<HTMLElement>('.word')[typed.length - 1]
    if (!box || !word || !caret.current) return
    // keep one typed line above the current one; with only 2 lines the current one goes on top so the next stays visible
    const shift = Math.max(0, word.offsetTop - (s.lines === '2' ? 0 : word.offsetHeight))
    box.style.transform = `translateY(${-shift}px)`
    const p = charPos(word, typed[typed.length - 1].length)
    caret.current.style.transform = `translate(${p.x}px, ${p.y}px)`
  }, [typed, view, phase, editing, s.size, s.font, s.lines, s.width, fontTick])

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

  const commands = (): Command[] => {
    const cmds: Command[] = []
    const add = (group: string, label: string, run: () => void) => cmds.push({ id: `${group}-${label}`, group, label, run })
    add('test', 'reiniciar', () => restart())
    add('test', `reto del día #${challengeNumber()}`, () => restart({ mode: 'daily' }))
    add('test', 'practicar teclas débiles', () => restart({ mode: 'practice', drill: [] }))
    add('ver', 'historial', () => { go('/'); setView('history') })
    add('ver', 'ranking del reto', () => { go('/'); setView('history') })
    if (me?.username) add('ver', 'mi perfil', () => go(`/u/${me.username}`))
    add('ver', 'test', () => restart())
    for (const m of Object.keys(MODES) as Mode[]) add('modo', MODES[m], () => restart({ mode: m }))
    for (const d of DURATIONS) add('tiempo', `${d} segundos`, () => restart({ mode: 'time', duration: d }))
    for (const c of COUNTS) add('palabras', `${c} palabras`, () => restart({ mode: 'words', count: c }))
    for (const l of Object.keys(LANGS) as Lang[]) add('idioma', LANGS[l], () => restart({ lang: l }))
    add('texto libre', 'editar mi texto', () => { restart({ mode: 'custom' }); setEditing(true) })
    const sw = (on: boolean) => (on ? 'desactivar' : 'activar')
    add('opciones', `${sw(s.punct)} puntuación`, () => restart({ punct: !s.punct }))
    add('opciones', `${sw(s.numbers)} números`, () => restart({ numbers: !s.numbers }))
    for (const p of POOLS) add('lista', `${p === 200 ? '200' : '1k'} palabras más comunes`, () => restart({ pool: p }))
    add('opciones', `${sw(s.plain)} español sin acentos`, () => restart({ plain: !s.plain }))
    for (const r of Object.keys(RULES) as (keyof Rules)[])
      add('reglas', `${sw(s.rules[r])} ${RULES[r][0]} · ${RULES[r][1]}`, () => restart({ rules: { ...s.rules, [r]: !s.rules[r] } }))
    add('preferencias', 'ajustes · tamaño, fuente, cursor y tema', () => setSettingsOpen(true))
    add('cuenta', session ? 'cerrar sesión' : 'iniciar sesión', () => (session ? supabase.auth.signOut() : setAuth('login')))
    add('preferencias', `${sw(s.sound)} sonido`, () => setS({ ...s, sound: !s.sound }))
    add('preferencias', `${sw(s.live)} wpm en vivo`, () => setS({ ...s, live: !s.live }))
    add('preferencias', `${sw(s.ghost)} fantasma`, () => setS({ ...s, ghost: !s.ghost }))
    add('preferencias', `tema ${isLight(s.theme) ? 'oscuro' : 'claro'}`, () => setS({ ...s, theme: isLight(s.theme) ? 'dark' : 'light' }))
    return cmds
  }

  // ranking props: refresh after each sync so a just-uploaded official attempt appears
  const rank: RankProps = { uid, hasUsername: !!me?.username, refresh: syncState, onOpenProfile: name => go(`/u/${name}`) }
  const days = streak(history)
  const xp = useMemo(() => totalXp(history), [history])
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
          {history.length > 0 && <LevelChip xp={xp} onClick={() => { go('/'); setView('history') }} />}
          {days > 0 && <span className="streak" title="días seguidos practicando">racha {days}d</span>}
          <button className="gear" onClick={() => setSettingsOpen(true)} title="ajustes" aria-label="ajustes">⚙</button>
          <button className="palette-btn" onClick={() => setPalette(true)} title="paleta de comandos (ctrl+k)">
            comandos{!COARSE && <kbd>ctrl k</kbd>}
          </button>
          <button className={view === 'test' && !profileName ? 'on' : ''} onClick={() => restart()}>test</button>
          <button className="account-btn" onClick={() => setAuth(session ? 'account' : 'login')} title={session ? session.user.email : 'iniciar sesión'}>
            {!session ? 'entrar'
              : me?.avatar_url ? <img className="avatar" src={me.avatar_url} alt="" referrerPolicy="no-referrer" />
              : <span className="avatar" aria-hidden>{(me?.username ?? session.user.email ?? '?')[0]}</span>}
          </button>
          <button className={view === 'history' && !profileName ? 'on' : ''} onClick={() => { go('/'); setView('history') }}>historial</button>
        </nav>
      </header>

      {profileName ? <ProfilePage username={profileName} theme={s.theme} isMe={me?.username === profileName} />
        : view === 'history' ? <>
          <div className="card">
            <small>reto #{challengeNumber()} · ranking de hoy · {LANGS[s.lang]}</small>
            <DailyRanking day={dayKey(new Date())} lang={s.lang} {...rank} />
          </div>
          <History h={history} theme={s.theme} keys={keyStats} bigrams={loadBigrams()} onDrill={drill => restart({ mode: 'practice', drill })} />
        </> : phase === 'done' && result ? (
        <ResultView r={result} theme={s.theme} onNext={() => restart()} onDrill={drill => restart({ mode: 'practice', drill })} rank={rank} />
      ) : editing ? (
        <CustomEditor initial={s.custom} onUse={text => restart({ mode: 'custom', custom: text })} onCancel={() => setEditing(false)} />
      ) : (
        <>
          <div className="timer">
            {phase === 'running'
              ? <>{progress}{s.live && <span className="live">{liveWpm} wpm</span>}{ruleTags}</>
              : <span className="live">{zen ? 'escribe libremente · shift+enter para terminar' : pb ? `récord ${pb} wpm` : ''}</span>}
            {caps && <span className="caps" role="status">⇪ mayúsculas activadas</span>}
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
          <div key={round} className={`words ${activeRules(s).blind ? 'blind' : ''}`}>
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

      {!profileName && view === 'test' && phase !== 'done' && !editing && (
        <StatusBar s={s} set={setS} restart={restart} edit={() => setEditing(true)} weak={weakKeys(keyStats)} today={todayDaily} />
      )}
      {auth && <AuthModal view={auth} session={session} syncState={syncState} me={me} onView={setAuth} onClose={() => setAuth(null)}
        onProfile={setMe} onOpenProfile={name => go(`/u/${name}`)} />}
      {settingsOpen && <SettingsPanel a={s} onChange={next => setS({ ...s, ...next })} onClose={() => setSettingsOpen(false)} />}
      {palette && <CommandPalette commands={commands()} onClose={() => setPalette(false)} />}
    </main>
  )
}

// Editor-style status line: mode block on the left, options as segments, preferences on the right
function StatusBar({ s, set, restart, edit, weak, today }: {
  s: Settings; set: (s: Settings) => void; restart: (n?: Partial<Settings>) => void; edit: () => void; weak: string[]
  today?: DailyEntry
}) {
  const opt = (on: boolean, label: string, onClick: () => void, title?: string) =>
    <button key={label} className={on ? 'on' : ''} onClick={onClick} title={title}>{label}</button>
  const bar = useRef<HTMLElement>(null)
  useLayoutMotion(bar)
  return (
    <footer className="status fade" ref={bar}>
      {/* pairs: mode | length, language | extras, rules | interface */}
      <div className="status-row">
      <div className="seg mode p1" aria-label="modo" data-pill>
        <span className="seg-pill" aria-hidden />
        {(Object.keys(MODES) as Mode[]).map(m => (
          <button key={m} className={m === s.mode ? 'on' : ''} onClick={() => restart({ mode: m })}>{MODES[m]}</button>
        ))}
      </div>
      <div className="seg p2" aria-label="duración" data-pill key={s.mode}>
        <span className="seg-pill" aria-hidden />
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
        <div className="seg p3" aria-label="idioma">
          <span className="seg-label" aria-hidden>idioma</span>
          <span className="pill-group" data-pill>
            <span className="seg-pill" aria-hidden />
            {(Object.keys(LANGS) as Lang[]).map(l => opt(l === s.lang, LANGS[l], () => restart({ lang: l })))}
          </span>
          {usesOpts(s.mode) && s.lang !== 'code' && (
            <span className="pill-group lista" data-pill title="palabras más comunes del idioma">
              <span className="seg-pill" aria-hidden />
              {POOLS.map(p => opt(p === s.pool, p === 200 ? '200' : '1k', () => restart({ pool: p })))}
            </span>
          )}
        </div>
      )}
      </div>
      <div className="status-row">
      {usesOpts(s.mode) && (
        <div className="seg p4" aria-label="extras">
          <span className="seg-label" aria-hidden>extras</span>
          {opt(s.punct, '@ puntuación', () => restart({ punct: !s.punct }), 'mayúsculas y puntuación')}
          {opt(s.numbers, '# números', () => restart({ numbers: !s.numbers }))}
          {s.lang === 'es' && opt(s.plain, 'sin acentos', () => restart({ plain: !s.plain }), 'á → a, ü → u; la ñ se queda')}
        </div>
      )}
      {s.mode !== 'daily' && s.mode !== 'zen' && (
        <div className="seg p5" aria-label="reglas">
          <span className="seg-label" aria-hidden>reglas</span>
          {(Object.keys(RULES) as (keyof Rules)[]).map(k =>
            opt(s.rules[k], RULES[k][0], () => restart({ rules: { ...s.rules, [k]: !s.rules[k] } }), RULES[k][1]))}
        </div>
      )}
      <div className="seg prefs p6" aria-label="preferencias">
          <span className="seg-label" aria-hidden>interfaz</span>
        {opt(s.sound, 'sonido', () => set({ ...s, sound: !s.sound }))}
        {opt(s.live, 'wpm', () => set({ ...s, live: !s.live }), 'wpm en vivo')}
        {opt(s.ghost, 'fantasma', () => set({ ...s, ghost: !s.ghost }), 'un cursor fantasma corre a tu récord')}
        {opt(false, isLight(s.theme) ? '◑ oscuro' : '◐ claro', () => set({ ...s, theme: isLight(s.theme) ? 'dark' : 'light' }))}
      </div>
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

function ResultView({ r, theme, onNext, onDrill, rank }: { r: FullResult; theme: string; onNext: () => void; onDrill: (pairs: string[]) => void; rank: RankProps }) {
  const labels = useMemo(() => r.samples.map((_, i) => i + 1), [r])
  const series = useMemo(() => [
    { label: 'wpm', data: r.samples.map(x => x.wpm) },
    { label: 'raw', data: r.samples.map(x => x.raw), dim: true },
  ], [r])
  const newPb = r.failed === undefined && r.wpm > r.prevPb
  const mode = r.mode ?? 'time'
  const shownWpm = useCountUp(r.wpm), shownAcc = useCountUp(r.acc)
  const detail = (mode === 'time' ? `${r.duration}s` : mode === 'words' ? `${r.value} palabras · ${r.duration}s` : `${r.duration}s`)
    + (r.pool ? ` · top ${r.pool}` : '') + (r.plain ? ' · sin acentos' : '')
  return (
    <section className="result">
      {r.failed !== undefined && (
        <div className="failed" role="alert">
          <b>muerte súbita</b> · fallaste en la palabra {r.failed + 1}. Este intento no cuenta para tu historial ni tus récords.
        </div>
      )}
      {newPb && <PrBanner wpm={r.wpm} prev={r.prevPb} mode={`${MODES[mode]} · ${LANGS[r.lang as Lang]} · ${detail}`} />}
      <div className={`big ${newPb ? 'is-pb' : ''}`}>
        <div><small>wpm</small><b>{shownWpm}</b></div>
        <div><small>precisión</small><b>{shownAcc}%</b></div>
      </div>
      {r.samples.length > 1 && <div className="card"><small>velocidad por segundo</small><Chart key={theme} labels={labels} series={series} /></div>}
      <div className="small">
        <div><small>raw</small>{r.raw}</div>
        <div><small>consistencia</small>{r.cons}%</div>
        <div title="correctos / incorrectos / extra / faltantes"><small>caracteres</small>{r.chars.correct}/{r.chars.incorrect}/{r.chars.extra}/{r.chars.missed}</div>
        <div><small>modo</small>{MODES[mode]} · {LANGS[r.lang as Lang]} · {detail}{r.punct ? ' @' : ''}{r.numbers ? ' #' : ''}{r.rules?.length ? ` · ${r.rules.map(k => RULES[k as keyof Rules][0]).join(', ')}` : ''}</div>
      </div>
      {r.xpBefore !== undefined && <XpCard before={r.xpBefore} gained={xpFor(r)} />}
      <ShareBar r={r} modeLabel={`${MODES[mode]} · ${LANGS[r.lang as Lang]} · ${detail}`} />
      {r.daily && <DailyCard n={r.daily.n} lang={r.lang as Lang} official={r.daily.official} entry={r.daily.entry} rank={rank} />}
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
  const text = `ThockType · ${r.wpm} wpm · ${r.acc}% precisión · ${modeLabel}\n${APP_URL}`
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

