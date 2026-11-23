import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { BASE_LANGS, CODE_LANGS, EXTRA_LANGS, LANGS, POOLS, bigramWords, isCode, listReady, loadFreq, plain, randomBlock, randomQuote, randomWords, weakWords, type Lang } from './words'
import {
  bestWpm, modeKey, charStats, consistency, correctChars, loadHistory, saveResult, streak, wpm,
  loadKeys, mergeKeys, saveKeys, weakKeys, DURATIONS, COUNTS, dayKey, type KeyStats, type Mode, type Result,
} from './stats'
import { chime, thock, tick } from './sound'
import TagPicker from './TagPicker'
import WordReplay from './WordReplay'
import LeaderboardPage from './LeaderboardPage'
import { stateAt, type LogEntry } from './replay'
import { randomArticle } from './wiki'
import { canSpeak, speak, stopSpeaking } from './speech'
import { decodeDuel, encodeDuel, type Duel } from './duel'
import PrBanner from './PrBanner'
import { LevelChip, XpCard } from './LevelUi'
import { levelOf, titleFor, totalXp, xpFor } from './level'
import { reducedMotion, useCountUp, useLayoutMotion } from './motion'
import { logoIntro, logoWave, preloadFx, resultIntro } from './fx'
import Chart from './Chart'
import Heatmap from './Heatmap'
import Keymap from './Keymap'
import History from './History'
import { inputDiff } from './inputDiff'
import { renderCard } from './shareCard'
import { copyText, shareImage } from './share'
import CoachCard from './CoachCard'
import DailyCard, { type RankProps } from './DailyCard'
import DailyRanking from './DailyRanking'
import CommandPalette, { type Command } from './CommandPalette'
import { APP_URL } from './config'
import AuthModal, { Icon, type AuthView } from './AuthModal'
import AccountMenu from './AccountMenu'
import { supabase } from './supabase'
import type { Session } from '@supabase/supabase-js'
import { addPendingStats, syncAll, syncUp, type Synced } from './sync'
import { getMyProfile, type Profile } from './profile'
import { markChanged, pushSettings, syncSettings } from './settingsSync'
import ProfilePage from './ProfilePage'
import { GHOST_SOURCES, KEYMAPS, applyAppearance, isLight, type Appearance, type GhostSource, type Keymap as KeymapMode, type Caret, type CaretMotion, type Font, type Lines, type Progress, type SoundKind, type Width, type Size, type Theme } from './appearance'
import SettingsPanel from './SettingsPanel'
import { challengeNumber, dailyWords, grid, loadDaily, officialFor, saveOfficial, type DailyEntry } from './daily'
import { addBigram, loadBigrams, mergeBigrams, saveBigrams, type Bigrams } from './coach'

// phones/tablets: no physical keyboard, so typing goes through a hidden input
const PROFILE_RE = /^\/u\/([a-z0-9_]{3,20})\/?$/
const COARSE = window.matchMedia?.('(pointer: coarse)').matches ?? false

const MODES: Record<Mode, string> = { time: 'tiempo', words: 'palabras', quote: 'cita', zen: 'zen', custom: 'libre', practice: 'práctica', daily: 'reto', wiki: 'wiki', dictation: 'dictado' }
const PRACTICE_WORDS = 40

type Settings = {
  lang: Lang; mode: Mode; duration: number; count: number; punct: boolean; numbers: boolean; custom: string
  pool: number // 200 or 1000 most frequent words (1000 = the whole list)
  plain: boolean // spanish without accents
  theme: Theme; size: Size; font: Font; caret: Caret; lines: Lines; width: Width;
  caretMotion: CaretMotion; focus: boolean; progress: Progress; soundKind: SoundKind; volume: number; sound: boolean; live: boolean; ghost: boolean
  ghostSource: GhostSource; ghostWpm: number; liveAcc: boolean; liveBurst: boolean; keymap: KeymapMode
  ghostStyle: Caret; liveColor: Appearance['liveColor']; highlight: Appearance['highlight']; typedEffect: Appearance['typedEffect']
  tape: Appearance['tape']; tapeMargin: Appearance['tapeMargin']; smoothScroll: boolean; graphZero: boolean; localFont: string
  drill: string[] // coach letter pairs to practice; empty = practice weak keys
  rules: Rules
  save: boolean // false = "práctica libre": results are not recorded
  tags: string[]; activeTags: string[] // your labels and the ones saved with the next tests
  codeLang: Lang // programming language used when lang is "code" ("code" itself = the mixed list)
  timeWarn: boolean // beep during the last 5 seconds of a timed test
  presets: Preset[]
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
  custom: 'escribe aquí tu propio texto para practicar', theme: 'dark', size: 'm', font: 'cascadia', caret: 'line', lines: '3', width: 'normal', caretMotion: 'smooth', focus: false, progress: 'number', soundKind: 'thock', volume: 0.7, sound: false, live: true, ghost: true, drill: [],
  ghostSource: 'pb', ghostWpm: 80, liveAcc: false, liveBurst: false, keymap: 'off', ghostStyle: 'line', liveColor: 'dim',
  highlight: 'letter', typedEffect: 'normal', tape: 'off', tapeMargin: '40', smoothScroll: true, graphZero: true, localFont: '', rules: NO_RULES, save: true, tags: [], activeTags: [], codeLang: 'code', timeWarn: false, presets: [], v: 2,
}
const SKEY = 'thocktype.settings'
// one-time hints, remembered per device
const seenHint = (k: string) => { try { return !!localStorage.getItem('thocktype.hint.' + k) } catch { return true } }
const markHint = (k: string) => { try { localStorage.setItem('thocktype.hint.' + k, '1') } catch { /* storage blocked */ } }

// fills in options added after the copy was saved (local or from the cloud)
function normalize(saved: Partial<Settings> & { v?: number }): Settings {
  // v1 saved JetBrains Mono as the default, not as a choice: move those to the new signature font
  if ((saved.v ?? 1) < 2 && saved.font === 'jetbrains') saved.font = 'cascadia'
  return { ...DEFAULTS, ...saved, rules: { ...NO_RULES, ...saved.rules }, presets: Array.isArray(saved.presets) ? saved.presets : [], v: 2 }
}
function loadSettings(): Settings {
  try { return normalize(JSON.parse(localStorage.getItem(SKEY) || '{}')) } catch { return DEFAULTS }
}
// a preset keeps every option except your own text, the coach drill and the list of presets itself
type Preset = { name: string; data: Partial<Settings> }
// tags and "práctica libre" are excluded: applying an old preset must not delete newer tags or silently stop saving tests
const NOT_IN_PRESET = ['custom', 'drill', 'presets', 'v', 'tags', 'activeTags', 'save']
const presetData = (s: Partial<Settings>) => Object.fromEntries(Object.entries(s).filter(([k]) => !NOT_IN_PRESET.includes(k))) as Partial<Settings>
const presetOf = (name: string, s: Settings): Preset => ({ name, data: presetData(s) })

// punctuation/numbers/word-list size only apply to generated words
const usesOpts = (m: Mode) => m === 'time' || m === 'words'
// 200-word lists: generated words in a natural language (code tokens have no frequency order)
// the list a test actually uses: with "código" chosen, the selected programming language (the daily challenge stays shared)
const tl = (s: Settings): Lang => (s.lang === 'code' && s.mode !== 'daily' ? s.codeLang : s.lang)
// level of a generated test: 200 / 1k / 5k / 10k most frequent words (1k is the default list, stored as no pool)
const poolOf = (s: Settings) => (usesOpts(s.mode) && !isCode(tl(s)) && s.pool !== 1000 ? s.pool : undefined)
const POOL_LABEL: Record<number, string> = { 200: '200', 1000: '1k', 5000: '5k', 10000: '10k' }
// a natural language for spoken and wiki text (code falls back to Spanish)
const textLang = (s: Settings) => (isCode(s.lang) ? 'es' : s.lang)
// accents can be dropped for spanish anywhere except the shared daily challenge and your own text
const usesPlain = (s: Settings) => s.lang === 'es' && s.plain && s.mode !== 'daily' && s.mode !== 'custom'
const wordOpts = (s: Settings) => ({ punct: s.punct, numbers: s.numbers, pool: poolOf(s) })
const variant = (s: Settings) => ({
  punct: usesOpts(s.mode) && s.punct, numbers: usesOpts(s.mode) && s.numbers,
  pool: poolOf(s), plain: usesPlain(s) || undefined,
})
const testKey = (s: Settings) => modeKey({
  lang: tl(s), mode: s.mode, duration: 0,
  value: s.mode === 'time' ? s.duration : s.mode === 'words' ? s.count : 0, ...variant(s),
})

// breaks: a code block's line breaks (word index → indent of the next line); kw: that language's keywords
type Test = { words: string[]; by?: string; url?: string; error?: string; breaks?: Record<number, number>; kw?: string[]; loading?: boolean }
function buildTest(s: Settings, keys: KeyStats): Test {
  const t = generate(s, keys)
  return usesPlain(s) ? { ...t, words: t.words.map(plain) } : t
}
function generate(s: Settings, keys: KeyStats): Test {
  // big levels and extra languages download their list first (see the loader effect in App)
  const usesList = !['custom', 'zen', 'wiki'].includes(s.mode) && !isCode(tl(s))
  if (usesList && !listReady(tl(s), s.mode === 'daily' ? undefined : poolOf(s))) return { words: [], loading: true }
  const opts = wordOpts(s)
  switch (s.mode) {
    case 'practice': return {
      words: s.drill.length ? bigramWords(tl(s), s.drill, PRACTICE_WORDS) : weakWords(tl(s), weakKeys(keys), PRACTICE_WORDS),
    }
    case 'time': return { words: randomWords(tl(s), 300, opts) }
    case 'words': return { words: randomWords(tl(s), s.count, opts) }
    case 'quote': return isCode(tl(s)) ? randomBlock(tl(s)) : randomQuote(tl(s))
    case 'wiki': return { words: [] } // filled in by the article loader below
    case 'dictation': { // a sentence to hear: lowercase, no punctuation, accents kept (that's the spelling practice)
      const q = randomQuote(textLang(s) as Lang)
      return { words: q.words.map(w => w.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, '')).filter(Boolean), by: q.by }
    }
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
  unsaved?: boolean // free practice: shown but not recorded
  vs?: { name?: string; wpm: number; acc: number } // duel: the challenger's result
  log: LogEntry[]; targets: string[] // for the word-by-word analysis and the replay
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
  const [test, setTest] = useState<Test>(() => buildTest(s, keyStats))
  const words = test.words
  const [typed, setTyped] = useState<string[]>([''])
  const [clock, setClock] = useState(0) // seconds elapsed
  const [liveWpm, setLiveWpm] = useState(0)
  const [liveAcc, setLiveAcc] = useState(100)
  const [burst, setBurst] = useState(0) // wpm of the last finished word
  const [ghostDelta, setGhostDelta] = useState(0) // characters ahead (+) or behind (-) the pace caret
  const [pressed, setPressed] = useState<{ key: string; ok: boolean; n: number }>() // last key, for the reacting keymap
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [result, setResult] = useState<FullResult | null>(null)
  // duel opened from a link (?duelo=…): same words, the challenger's real run as the ghost
  const [duel, setDuel] = useState<Duel | null>(() => { const c = new URLSearchParams(location.search).get('duelo'); return c ? decodeDuel(c) : null })
  const duelRef = useRef(duel)
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
  const onBoard = path === '/ranking' || path === '/ranking/'
  const [editing, setEditing] = useState(false)
  const [palette, setPalette] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)
  // first visit: a welcome strip until the first finished test; a nudge to sign up on the first results
  const [welcome, setWelcome] = useState(() => !seenHint('welcome') && loadHistory().length === 0)
  const [nudge, setNudge] = useState(() => !seenHint('signup'))
  const closeWelcome = () => { markHint('welcome'); setWelcome(false) }
  const headerRef = useRef<HTMLElement>(null)
  const logo = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => { if (logo.current) logoIntro(logo.current) }, [])
  const closeAuth = useCallback(() => setAuth(null), [])
  useLayoutMotion(headerRef) // the section pill slides between test / historial / ranking
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
  const [acctAnchor, setAcctAnchor] = useState<DOMRect | null>(null) // where the account dropdown hangs from
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
  const dictation = s.mode === 'dictation'
  const spokenLang = textLang(s) // language of wiki articles and dictation

  // levels 5k/10k and extra languages: download the word list, then build the test
  useEffect(() => {
    if (!test.loading) return
    let live = true
    loadFreq(tl(s)).then(() => { if (live) setTest(buildTest(s, keyStats)) })
      .catch(() => { if (live) setTest({ words: [], error: 'sin conexión: no se pudo descargar la lista de palabras' }) })
    return () => { live = false }
  }, [test, s, keyStats])

  // wiki: fetch a random article whenever a new wiki test starts empty
  useEffect(() => {
    if (s.mode !== 'wiki' || test.words.length || test.error) return
    let live = true
    randomArticle(spokenLang)
      .then(a => { if (live) setTest(a ?? { words: [], error: 'no encontré un artículo con texto suficiente' }) })
      .catch(() => { if (live) setTest({ words: [], error: 'sin conexión con Wikipedia' }) })
    return () => { live = false }
  }, [s.mode, spokenLang, test])
  const finite = s.mode !== 'time' && !zen

  // dictation: read the text in chunks of a few words; the next chunk is read when you reach it, enter repeats
  const CHUNK = 4
  const chunk = Math.floor(Math.max(0, typed.length - 1) / CHUNK)
  const sayChunk = useCallback(() => speak(words.slice(chunk * CHUNK, chunk * CHUNK + CHUNK).join(' '), spokenLang), [words, chunk, spokenLang])
  useEffect(() => { // a new dictation test reads its first chunk (after the click that started it, so the browser allows audio)
    if (!dictation || !words.length) return
    const id = setTimeout(() => speak(words.slice(0, CHUNK).join(' '), spokenLang), 350)
    return () => clearTimeout(id)
  }, [dictation, round, words.length === 0]) // eslint-disable-line react-hooks/exhaustive-deps -- once per new text
  useEffect(() => { if (dictation && phase === 'running' && chunk > 0) sayChunk() }, [chunk]) // eslint-disable-line react-hooks/exhaustive-deps -- only when you reach a new chunk
  useEffect(() => { if (!dictation || phase === 'done') stopSpeaking() }, [dictation, phase])

  // settings follow your account: pull on sign-in, push a couple of seconds after you change something
  const savedJson = useRef(JSON.stringify(s))
  const fromCloud = useRef(false)
  useEffect(() => {
    if (!uid) return
    syncSettings(uid, normalize(JSON.parse(savedJson.current))).then(remote => {
      if (!remote) return
      const next = normalize(remote as Partial<Settings>)
      if (JSON.stringify(next) !== savedJson.current) { fromCloud.current = true; setS(next) }
    }).catch(() => { /* offline or table missing: settings stay on this device */ })
  }, [uid])
  useEffect(() => {
    const json = JSON.stringify(s)
    if (json === savedJson.current) return
    savedJson.current = json
    if (fromCloud.current) { fromCloud.current = false; return } // applying the cloud copy is not a new change
    markChanged()
    if (!uid) return
    const id = setTimeout(() => pushSettings(uid, s).catch(() => { /* retried on the next change or sign-in */ }), 2000)
    return () => clearTimeout(id)
  }, [s, uid])

  useEffect(() => {
    applyAppearance(s)
    try { localStorage.setItem(SKEY, JSON.stringify(s)) } catch { /* storage blocked */ }
    if (s.theme !== 'auto') return
    // "sistema": follow the device when it switches between light and dark
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    const follow = () => applyAppearance(s)
    mq?.addEventListener('change', follow)
    return () => mq?.removeEventListener('change', follow)
  }, [s])

  // settings changes; a new theme crossfades the whole page instead of swapping colors at once
  const update = (next: Settings) => {
    const vt = (document as Document & { startViewTransition?: (cb: () => void) => unknown }).startViewTransition
    if (next.theme === s.theme || !vt || reducedMotion()) { setS(next); return }
    vt.call(document, () => { flushSync(() => setS(next)); applyAppearance(next) })
  }

  const fresh = () => ({ start: 0, keys: 0, good: 0, secKeys: 0, samples: [] as Sample[], hits: {} as Record<string, number>, errs: {} as Record<string, number>, bigrams: {} as Bigrams, lastAt: 0, wordStart: 0, log: [] as LogEntry[] })
  // mutable test data read inside the timer and animation loop
  const t = useRef({ ...fresh(), typed, words })
  t.current.typed = typed
  t.current.words = words

  const restart = useCallback((next: Partial<Settings> = {}) => {
    const ns = { ...s, ...next }
    setS(ns)
    if (Object.keys(next).length) { duelRef.current = null; setDuel(null) } // changing an option leaves the duel
    setTest(duelRef.current ? { words: duelRef.current.words } : buildTest(ns, keyStats))
    setRound(n => n + 1)
    setTyped([''])
    setClock(0)
    setLiveWpm(0); setLiveAcc(100); setBurst(0); setGhostDelta(0)
    setPhase('idle')
    setResult(null)
    setView('test')
    go('/')
    setEditing(false)
    t.current = { ...t.current, ...fresh() }
  }, [s, keyStats, go])

  // opened from a duel link: switch to the challenger's mode and words, then clean the address bar
  useEffect(() => {
    const d = duelRef.current
    if (!d) return
    window.history.replaceState(null, '', '/')
    restart({ mode: d.mode, ...(isCode(d.lang) ? { lang: 'code' as Lang, codeLang: d.lang as Lang } : { lang: d.lang as Lang }), ...(d.mode === 'time' ? { duration: d.value } : d.mode === 'words' ? { count: d.value } : {}) })
    duelRef.current = d; setDuel(d); setTest({ words: d.words })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- once, on load
  const leaveDuel = () => { duelRef.current = null; setDuel(null); restart() }

  const key = testKey(s)
  const pb = useMemo(() => bestWpm(history, key), [history, key])
  // speed of the pace caret ("fantasma"); 0 = no ghost
  const pace = useMemo(() => {
    if (!s.ghost || s.mode === 'zen') return 0
    const now = Date.now(), last10 = history.slice(-10)
    switch (s.ghostSource) {
      case 'pb': return pb
      case 'avg': return last10.length ? Math.round(last10.reduce((a, r) => a + r.wpm, 0) / last10.length) : 0
      case 'day': return Math.max(0, ...history.filter(r => now - r.date < 86400000).map(r => r.wpm))
      case 'last': return history[history.length - 1]?.wpm ?? 0
      case 'fixed': return Math.max(1, Math.min(300, s.ghostWpm))
    }
  }, [s.ghost, s.mode, s.ghostSource, s.ghostWpm, pb, history])

  const finish = useCallback((typed: string[], failed?: number) => {
    const { keys, good, samples, hits, errs, start, bigrams, log } = t.current
    const done = typed[typed.length - 1] === '' ? typed.slice(0, -1) : typed
    const targets = zen ? done : words
    const secs = s.mode === 'time' ? s.duration : Math.max(1, (performance.now() - start) / 1000)
    const r: Result = {
      date: Date.now(),
      wpm: Math.round(wpm(correctChars(targets, done), secs)),
      raw: Math.round(wpm(done.join(' ').length, secs)),
      acc: keys ? Math.round((good / keys) * 100) : 0,
      cons: Math.round(consistency(samples.map(x => x.raw))),
      lang: tl(s), duration: Math.round(secs), mode: s.mode,
      value: s.mode === 'time' ? s.duration : s.mode === 'words' ? s.count : 0,
      ...variant(s),
      rules: (Object.keys(RULES) as (keyof Rules)[]).filter(k => activeRules(s)[k]),
      ...(s.activeTags.length ? { tags: s.activeTags.filter(t => s.tags.includes(t)) } : {}),
    }
    if (!done.length) { setPhase('idle'); return } // nothing typed (zen): don't record
    if (failed !== undefined || !s.save) { // sudden death or free practice: show the result, keep it out of history and records
      setResult({ ...r, vs: duel ? { name: duel.name, wpm: duel.wpm, acc: duel.acc } : undefined, log, targets: zen ? [] : words, samples, chars: charStats(targets, done), hits, errs, prevPb: pb, by: test.by, bigrams, failed, unsaved: !s.save })
      setPhase('done')
      return
    }
    saveResult(r)
    setHistory(h => [...h, r])
    if (welcome) { markHint('welcome'); setWelcome(false) } // you've got the hang of it
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
    setResult({ ...r, vs: duel ? { name: duel.name, wpm: duel.wpm, acc: duel.acc } : undefined, log, targets: zen ? [] : words, samples, chars: charStats(targets, done), hits, errs, prevPb: pb, by: test.by, bigrams, daily: dailyInfo, xpBefore: totalXp(history) })
    setPhase('done')
  }, [s, pb, words, zen, test.by, keyStats, daily, uid, applySync, history, duel, welcome])

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
      setLiveAcc(c.keys ? Math.round((c.good / c.keys) * 100) : 100)
      if (duel) setGhostDelta(correctChars(targets, c.typed) - correctChars(targets, stateAt(duel.log, sec * 1000)))
      else if (pace) setGhostDelta(Math.round(correctChars(targets, c.typed) - (pace * 5 * sec) / 60))
      setClock(sec)
      if (s.mode === 'time' && s.timeWarn && s.duration - sec <= 5 && s.duration - sec > 0) tick(s.volume)
      if (s.mode === 'time' && sec >= s.duration) finish(c.typed)
    }, 1000)
    return () => clearInterval(id)
  }, [phase, s.mode, s.duration, s.timeWarn, s.volume, finish, zen, pace, duel])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (((e.ctrlKey || e.metaKey) && k === 'k') || (e.ctrlKey && e.shiftKey && k === 'p')) { e.preventDefault(); setPalette(p => !p); return }
      if (palette || auth || settingsOpen || tagsOpen || profileName || onBoard) return // dialogs handle their own keys; profiles aren't for typing
      // typing in a form (login, editor…) must not drive the test; the hidden touch input is the exception
      const el = e.target
      if (el instanceof HTMLTextAreaElement || (el instanceof HTMLInputElement && !el.classList.contains('touch-input'))) return
      // in the history Tab keeps moving focus, so keyboard users can reach its buttons (Esc still goes back)
      if ((e.key === 'Tab' && view === 'test') || e.key === 'Escape') { e.preventDefault(); restart(); return }
      if (phase === 'done' || view !== 'test' || editing || e.metaKey || e.altKey) return
      if (dictation && e.key === 'Enter') { e.preventDefault(); sayChunk(); return }
      if (zen && e.key === 'Enter' && e.shiftKey) { e.preventDefault(); if (phase === 'running') finish(t.current.typed); return }
      const c = t.current
      // read/write through the ref so several keys in one tick (mobile autocorrect) don't overwrite each other
      const typed = c.typed
      const type = (next: string[]) => {
        c.typed = next; setTyped(next)
        if (!zen) c.log.push([Math.round(performance.now() - c.start), next.length, next[next.length - 1]]) // for the replay
      }
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
      const lineBreak = e.key === 'Enter' && test.breaks?.[i] !== undefined // code blocks: Enter ends the line
      if ((e.key.length !== 1 && !lineBreak) || e.ctrlKey) return
      e.preventDefault()
      if (phase === 'idle') { c.start = performance.now(); setPhase('running'); preloadFx() } // animations ready by the result screen
      if (e.key === ' ' || lineBreak) {
        if (cur === '') return
        if (rules.brake && cur !== target) { if (s.sound) thock(true, s.soundKind, s.volume); return } // must finish the word correctly first
        c.keys++; c.secKeys++
        const ok = zen || cur === target
        if (!ok && rules.sudden) { finish(typed, i); return }
        if (ok) c.good++
        c.lastAt = performance.now()
        if (c.wordStart) setBurst(Math.round(wpm(cur.length, (c.lastAt - c.wordStart) / 1000)))
        c.wordStart = 0
        if (s.sound) thock(!ok, s.soundKind, s.volume)
        if (finite && i === words.length - 1) { finish(typed); return } // space on the last word ends the test
        type([...typed, ''])
        if (s.mode === 'time' && i > words.length - 50) setTest({ words: [...words, ...randomWords(tl(s), 200, wordOpts(s)).map(w => (usesPlain(s) ? plain(w) : w))] })
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
      if (!c.wordStart) c.wordStart = now
      if (ok && target && cur.length > 0 && cur[cur.length - 1] === target[cur.length - 1] && c.lastAt) {
        const dt = now - c.lastAt
        if (dt > 15 && dt < 2000) addBigram(c.bigrams, (target[cur.length - 1] + e.key).toLowerCase(), dt) // skip bursts and pauses
      }
      c.lastAt = now
      if (s.sound) thock(!ok, s.soundKind, s.volume)
      if (s.keymap === 'react') setPressed(p => ({ key: e.key.toLowerCase(), ok, n: (p?.n ?? 0) + 1 }))
      if (!ok && rules.sudden) { finish(typed, i); return }
      if (!ok && rules.brake) return // the mistake counts, but the caret stays until the right key
      const next = [...typed.slice(0, i), cur + e.key]
      type(next)
      if (finite && i === words.length - 1 && cur + e.key === target) finish(next) // last word typed correctly ends the test
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [typed, words, test, phase, view, editing, palette, auth, settingsOpen, tagsOpen, profileName, onBoard, dictation, sayChunk, s, zen, finite, restart, finish])

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
  // Caret and text glide toward their targets in one animation loop. CSS transitions restart on every key and stutter
  // when you type fast; chasing the target each frame (exponential smoothing) stays fluid at any speed.
  const glide = useRef({ cx: 0, cy: 0, tcx: 0, tcy: 0, ix: 0, iy: 0, tix: 0, tiy: 0, raf: 0, last: 0, snap: true, tauC: 40, tauI: 110 })
  useEffect(() => () => cancelAnimationFrame(glide.current.raf), [])
  useLayoutEffect(() => {
    const box = inner.current
    const word = box?.querySelectorAll<HTMLElement>('.word')[typed.length - 1]
    if (!box || !word || !caret.current) return
    const g = glide.current
    const p = charPos(word, typed[typed.length - 1].length)
    g.tcx = p.x; g.tcy = p.y
    const still = reducedMotion()
    if (s.tape === 'on' && !test.breaks) { // tape: one line sliding left (code blocks keep their lines)
      const lead = (box.parentElement!.clientWidth * Number(s.tapeMargin)) / 100
      g.tix = Math.min(0, lead - p.x); g.tiy = 0
      // same speed for text and caret, so the caret stays perfectly still while the line glides under it
      g.tauC = g.tauI = still || !s.smoothScroll ? 0 : 70
    } else {
      // keep one typed line above the current one; with only 2 lines the current one goes on top so the next stays visible
      g.tix = 0; g.tiy = -Math.max(0, word.offsetTop - (s.lines === '2' ? 0 : word.offsetHeight))
      g.tauC = still || s.caretMotion === 'instant' ? 0 : s.caretMotion === 'fast' ? 16 : 40
      g.tauI = still || !s.smoothScroll ? 0 : 130
    }
    if (typed.length === 1 && typed[0] === '') g.snap = true // new test: start in place, no slide from the old spot
    const step = (now: number) => {
      const dt = Math.min(48, now - g.last) // a long pause (hidden tab) must not overshoot
      g.last = now
      const k = (tau: number) => (g.snap || tau <= 0 ? 1 : 1 - Math.exp(-dt / tau))
      const kc = k(g.tauC), ki = k(g.tauI)
      g.snap = false
      g.cx += (g.tcx - g.cx) * kc; g.cy += (g.tcy - g.cy) * kc
      g.ix += (g.tix - g.ix) * ki; g.iy += (g.tiy - g.iy) * ki
      const near = (a: number, b: number) => Math.abs(a - b) < 0.05
      if (near(g.cx, g.tcx) && near(g.cy, g.tcy) && near(g.ix, g.tix) && near(g.iy, g.tiy)) {
        g.cx = g.tcx; g.cy = g.tcy; g.ix = g.tix; g.iy = g.tiy; g.raf = 0
      } else g.raf = requestAnimationFrame(step)
      caret.current?.style.setProperty('transform', `translate3d(${g.cx}px, ${g.cy}px, 0)`)
      inner.current?.style.setProperty('transform', `translate3d(${g.ix}px, ${g.iy}px, 0)`)
    }
    if (g.snap) { g.last = performance.now(); cancelAnimationFrame(g.raf); step(g.last) } // place now, before paint
    else if (!g.raf) { g.last = performance.now(); g.raf = requestAnimationFrame(step) }
  }, [typed, view, phase, editing, s.size, s.font, s.lines, s.width, s.tape, s.tapeMargin, s.caretMotion, s.smoothScroll, fontTick, round, test.breaks])

  // TypeRacer-style ghost: a second caret running at the chosen pace
  useEffect(() => {
    const g = ghost.current
    if (!g) return
    g.style.display = 'none'
    if (phase !== 'running' || (!pace && !duel)) return
    let raf = 0
    const loop = () => {
      const c = t.current
      let chars: number, wi = 0
      if (duel) { // the challenger's actual run, pauses and mistakes included
        const st = stateAt(duel.log, performance.now() - c.start)
        wi = Math.max(0, st.length - 1); chars = st[wi]?.length ?? 0
      } else {
        chars = (pace * 5 * (performance.now() - c.start)) / 60000
        while (wi < c.words.length - 1 && chars > c.words[wi].length) { chars -= c.words[wi].length + 1; wi++ }
      }
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
  }, [phase, pace, duel])

  const commands = (): Command[] => {
    const cmds: Command[] = []
    const add = (group: string, label: string, run: () => void) => cmds.push({ id: `${group}-${label}`, group, label, run })
    add('test', 'reiniciar', () => restart())
    add('test', `reto del día #${challengeNumber()}`, () => restart({ mode: 'daily' }))
    add('test', 'practicar teclas débiles', () => restart({ mode: 'practice', drill: [] }))
    add('ver', 'historial', () => { go('/'); setView('history') })
    add('ver', 'ranking del reto', () => { go('/'); setView('history') })
    add('ver', 'ranking global · 15 s y 60 s', () => go('/ranking'))
    if (me?.username) add('ver', 'mi perfil', () => go(`/u/${me.username}`))
    add('ver', 'test', () => restart())
    for (const m of Object.keys(MODES) as Mode[]) add('modo', MODES[m], () => restart({ mode: m }))
    for (const d of DURATIONS) add('tiempo', `${d} segundos`, () => restart({ mode: 'time', duration: d }))
    for (const c of COUNTS) add('palabras', `${c} palabras`, () => restart({ mode: 'words', count: c }))
    for (const l of BASE_LANGS) add('idioma', LANGS[l], () => restart({ lang: l }))
    for (const [k, l] of Object.entries(CODE_LANGS)) add('lenguaje', `código: ${l}`, () => restart({ lang: 'code', codeLang: k as Lang }))
    add('texto libre', 'editar mi texto', () => { restart({ mode: 'custom' }); setEditing(true) })
    const sw = (on: boolean) => (on ? 'desactivar' : 'activar')
    add('opciones', `${sw(s.punct)} puntuación`, () => restart({ punct: !s.punct }))
    add('opciones', `${sw(s.numbers)} números`, () => restart({ numbers: !s.numbers }))
    for (const p of POOLS) add('nivel', `${POOL_LABEL[p]} palabras más comunes`, () => restart({ pool: p }))
    for (const [k, l] of Object.entries(EXTRA_LANGS)) add('idioma', l, () => restart({ lang: k as Lang }))
    add('opciones', `${sw(s.plain)} español sin acentos`, () => restart({ plain: !s.plain }))
    for (const r of Object.keys(RULES) as (keyof Rules)[])
      add('reglas', `${sw(s.rules[r])} ${RULES[r][0]} · ${RULES[r][1]}`, () => restart({ rules: { ...s.rules, [r]: !s.rules[r] } }))
    add('preferencias', 'ajustes · tamaño, fuente, cursor y tema', () => setSettingsOpen(true))
    for (const p of s.presets) add('perfiles', `perfil: ${p.name}`, () => restart(presetData(p.data)))
    for (const t of s.tags) add('etiquetas', `${s.activeTags.includes(t) ? 'quitar' : 'activar'} etiqueta #${t}`,
      () => setS({ ...s, activeTags: s.activeTags.includes(t) ? s.activeTags.filter(x => x !== t) : [...s.activeTags, t] }))
    add('etiquetas', 'crear o editar etiquetas', () => { restart(); setTagsOpen(true) })
    add('opciones', `${s.save ? 'activar' : 'desactivar'} práctica libre (no guardar resultados)`, () => update({ ...s, save: !s.save }))
    add('cuenta', session ? 'cerrar sesión' : 'iniciar sesión', () => (session ? supabase.auth.signOut() : setAuth('login')))
    add('preferencias', `${sw(s.sound)} sonido`, () => setS({ ...s, sound: !s.sound }))
    add('preferencias', `${sw(s.live)} wpm en vivo`, () => setS({ ...s, live: !s.live }))
    add('preferencias', `${sw(s.ghost)} fantasma`, () => setS({ ...s, ghost: !s.ghost }))
    for (const [k, l] of Object.entries(GHOST_SOURCES)) add('fantasma', `el fantasma corre a: ${l}`, () => setS({ ...s, ghost: true, ghostSource: k as GhostSource }))
    add('vista', s.tape === 'on' ? 'volver a líneas' : 'modo cinta (una sola línea)', () => setS({ ...s, tape: s.tape === 'on' ? 'off' : 'on' }))
    for (const [k, l] of Object.entries(KEYMAPS)) add('vista', `teclado en pantalla: ${l}`, () => setS({ ...s, keymap: k as KeymapMode }))
    add('preferencias', `tema ${isLight(s.theme) ? 'oscuro' : 'claro'}`, () => update({ ...s, theme: isLight(s.theme) ? 'dark' : 'light' }))
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
  const progress = s.progress !== 'number' ? null
    : s.mode === 'time' ? s.duration - clock
    : zen ? clock
    : `${typed.length - 1}/${words.length}`
  // 0..1 for the progress bar; zen has no end
  const done01 = zen ? 0 : s.mode === 'time' ? clock / s.duration : (typed.length - 1) / Math.max(1, words.length)

  return (
    <main className={phase === 'running' ? 'running' : ''}>
      {/* three groups, one style each: where you are · how you're doing · actions */}
      <header ref={headerRef}>
        <div className="hdr-left">
          <h1 ref={logo} onClick={() => restart()} onMouseEnter={() => logo.current && logoWave(logo.current)} aria-label="thocktype">
            {[...'thock'].map((c, i) => <span key={i} className="lg" aria-hidden>{c}</span>)}
            <span className="lg-type" aria-hidden>{[...'type'].map((c, i) => <span key={i} className="lg">{c}</span>)}</span>
            <span className="lg-caret" aria-hidden />
          </h1>
          <nav className="hdr-nav" data-pill aria-label="secciones">
            <span className="seg-pill" aria-hidden />
            <button className={view === 'test' && !profileName && !onBoard ? 'on' : ''} onClick={() => restart()}>test</button>
            <button className={view === 'history' && !profileName && !onBoard ? 'on' : ''} onClick={() => { go('/'); setView('history') }}>historial</button>
            <button className={onBoard ? 'on' : ''} onClick={() => go('/ranking')}>ranking</button>
          </nav>
        </div>
        <div className="hdr-right">
          <div className="hdr-stats">
            {!todayDaily && s.mode !== 'daily' && (
              <button className="hdr-stat daily" onClick={() => restart({ mode: 'daily' })} title="el reto de hoy: el mismo texto para todos">reto #{challengeNumber()}</button>
            )}
            {history.length > 0 && <LevelChip xp={xp} onClick={() => { go('/'); setView('history') }} />}
            {days > 0 && <span className="hdr-stat" title="días seguidos practicando">racha {days}d</span>}
          </div>
          <div className="hdr-actions">
            <button className="icon-btn" onClick={() => setPalette(true)} title={COARSE ? 'comandos' : 'comandos · ctrl k'} aria-label="paleta de comandos">
              <Icon d="M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-4-4" />
            </button>
            <button className="icon-btn" onClick={() => setSettingsOpen(true)} title="ajustes" aria-label="ajustes">
              <Icon d="M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4" />
            </button>
            <button className="icon-btn account-btn" onClick={e => { setAcctAnchor(e.currentTarget.getBoundingClientRect()); setAuth(session ? (auth === 'account' ? null : 'account') : 'login') }} title={session ? session.user.email : 'iniciar sesión'} aria-label={session ? 'tu cuenta' : 'iniciar sesión'}>
              {!session ? <Icon d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />
                : me?.avatar_url ? <img className="avatar" src={me.avatar_url} alt="" referrerPolicy="no-referrer" />
                : <span className="avatar" aria-hidden>{(me?.username ?? session.user.email ?? '?')[0]}</span>}
            </button>
          </div>
        </div>
      </header>

      {onBoard ? <LeaderboardPage uid={uid} hasUsername={!!me?.username} lang={tl(s)} onOpenProfile={name => go(`/u/${name}`)} />
        : profileName ? <ProfilePage username={profileName} theme={s.theme} isMe={me?.username === profileName} />
        : view === 'history' ? <>
          <div className="card">
            <small>reto #{challengeNumber()} · ranking de hoy · {LANGS[s.lang]}</small>
            <DailyRanking day={dayKey(new Date())} lang={s.lang} {...rank} />
          </div>
          <History h={history} theme={s.theme} keys={keyStats} bigrams={loadBigrams()} onDrill={drill => restart({ mode: 'practice', drill })} />
        </> : phase === 'done' && result ? (
        <ResultView r={result} theme={s.theme}
          signup={!session && nudge && history.length <= 5 ? { open: () => setAuth('signup'), dismiss: () => { markHint('signup'); setNudge(false) } } : undefined}
          myName={me?.display_name || me?.username || undefined} onNext={() => restart()} onDrill={drill => restart({ mode: 'practice', drill })} rank={rank}
          onDrillWords={list => { // practice test made only of your slowest words, shuffled
            restart({ mode: 'practice', drill: [] })
            setTest({ words: Array.from({ length: PRACTICE_WORDS }, () => list[Math.floor(Math.random() * list.length)]) })
          }} />
      ) : editing ? (
        <CustomEditor initial={s.custom} onUse={text => restart({ mode: 'custom', custom: text })} onCancel={() => setEditing(false)} />
      ) : (
        <>
          {welcome && phase !== 'running' && (
            <div className="welcome" role="note">
              <b>bienvenido a thocktype</b>
              <span>{COARSE ? 'toca el texto y empieza a escribir' : 'empieza a escribir: el tiempo corre con la primera tecla'}</span>
              {!COARSE && <span><kbd>tab</kbd> reinicia · <kbd>ctrl k</kbd> abre todos los comandos · <kbd>esc</kbd> vuelve</span>}
              <button onClick={closeWelcome} aria-label="cerrar bienvenida">✕</button>
            </div>
          )}
          <div className={`timer ${s.mode === 'time' && phase === 'running' && s.duration - clock <= 5 ? 'warn' : ''}`}>
            {phase === 'running'
              ? <>
                {progress}
                {s.live && <span className="live">{liveWpm} wpm</span>}
                {s.liveAcc && <span className="live">{liveAcc}%</span>}
                {s.liveBurst && burst > 0 && <span className="live" title="velocidad de tu última palabra">ráfaga {burst}</span>}
                {(pace > 0 || duel) && clock > 0 && <span className={`live delta ${ghostDelta >= 0 ? 'ahead' : 'behind'}`} title={duel ? 'frente a quien te retó' : `frente a un fantasma a ${pace} wpm`}>
                  {ghostDelta >= 0 ? '▲' : '▼'} {Math.abs(ghostDelta)} letras{duel ? ` vs ${duel.name ?? 'rival'}` : ''}
                </span>}
                {ruleTags}
              </>
              : duel ? <span className="live duel-note">⚔ duelo · {duel.name ?? 'alguien'} hizo {duel.wpm} wpm · {duel.acc}% · ¿le ganas? <button onClick={leaveDuel}>salir</button></span>
              : test.loading ? <span className="live">descargando palabras…</span>
              : test.error && s.mode !== 'wiki' ? <span className="live">{test.error} · <button className="inline-btn" onClick={() => restart()}>reintentar</button></span>
              : s.mode === 'wiki' && !words.length ? <span className="live">{test.error ? <>{test.error} · <button className="inline-btn" onClick={() => restart()}>reintentar</button></> : 'buscando un artículo en Wikipedia…'}</span>
              : dictation ? <span className="live">{canSpeak() ? 'dictado · escucha y escribe · enter repite la frase' : 'tu navegador no puede leer en voz alta'}</span>
              : <span className="live">{!s.save ? 'práctica libre · no se guarda' : zen ? 'escribe libremente · shift+enter para terminar' : pb ? `récord ${pb} wpm` : ''}</span>}
            {caps && <span className="caps" role="status">⇪ mayúsculas activadas</span>}
            {phase !== 'running' && (
              <TagPicker tags={s.tags} active={s.activeTags} open={tagsOpen} onOpen={setTagsOpen}
                onChange={(tags, activeTags) => setS({ ...s, tags, activeTags })} />
            )}
          </div>
          {s.progress === 'bar' && !zen && (
            <div className="progress-bar" aria-hidden><span style={{ transform: `scaleX(${phase === 'running' ? done01 : 0})`, transitionDuration: s.mode === 'time' ? '1s' : '300ms' }} /></div>
          )}
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
          <div key={round} className={`words ${activeRules(s).blind ? 'blind' : ''} ${test.breaks ? 'block' : ''}`}>
            <div className="inner" ref={inner}>
              {shown.map((w, wi) => {
                const tw = typed[wi] ?? ''
                const wrong = !zen && wi < typed.length - 1 && tw !== w
                return (
                  <Fragment key={wi}>
                  <span className={`word ${wrong ? 'wrong' : ''} ${wi === typed.length - 1 ? 'cur' : wi < typed.length - 1 ? 'done' : ''} ${dictation && wi >= typed.length ? 'unheard' : ''} ${test.kw?.includes(w) ? 'kw' : ''} ${test.breaks?.[wi] !== undefined ? 'eol' : ''}`}
                    style={test.breaks?.[wi - 1] ? { marginLeft: `${test.breaks[wi - 1] * 0.6}em` } : undefined}>
                    {[...w].map((ch, ci) => (
                      <span key={ci} className={`c l ${ci < tw.length ? (tw[ci] === ch ? 'ok' : 'bad') : ''}`}>{dictation && ci >= tw.length ? '·' : ch}</span>
                    ))}
                    {[...tw.slice(w.length)].map((ch, ci) => <span key={'x' + ci} className="c extra">{ch}</span>)}
                  </span>
                  {test.breaks?.[wi] !== undefined && <span className="nl" aria-hidden />}
                  </Fragment>
                )
              })}
              <span className={`caret ${phase === 'idle' ? 'blink' : ''}`} ref={caret} />
              <span className="ghost" ref={ghost} />
            </div>
          </div>
          </div>
          {s.keymap !== 'off' && !COARSE && (
            <Keymap mode={s.keymap} next={zen ? undefined : (words[typed.length - 1]?.[typed[typed.length - 1].length] ?? ' ')} pressed={pressed} />
          )}
          {test.by && <p className="by fade">— {test.url ? <a href={test.url} target="_blank" rel="noreferrer">{test.by}</a> : test.by}</p>}
          <p className="hint fade">
            {COARSE ? <button onClick={() => restart()}>↻ reiniciar</button> : <><kbd>tab</kbd> reiniciar</>}
            <a className="hint-link" href="/privacidad.html">privacidad</a>
          </p>
        </>
      )}

      {!profileName && !onBoard && view === 'test' && phase !== 'done' && !editing && (
        <StatusBar s={s} set={update} sayChunk={sayChunk} restart={restart} edit={() => setEditing(true)} weak={weakKeys(keyStats)} today={todayDaily} />
      )}
      {auth === 'account' && session && (
        <AccountMenu session={session} me={me} syncState={syncState} anchor={acctAnchor}
          stats={{ ...(l => ({ level: l.level, progress: l.progress }))(levelOf(xp)), title: titleFor(levelOf(xp).level), tests: history.length, best: Math.max(0, ...history.map(r => r.wpm)), streak: days }}
          onClose={closeAuth} onEdit={() => setAuth('profile')} onOpenProfile={name => go(`/u/${name}`)}
          onHistory={() => { go('/'); setView('history') }} onSettings={() => setSettingsOpen(true)} />
      )}
      {auth && auth !== 'account' && <AuthModal view={auth} session={session} me={me} onView={setAuth} onClose={() => setAuth(null)}
        onProfile={setMe} />}
      {settingsOpen && <SettingsPanel a={{ ...s, synced: !!uid }} onChange={next => update({ ...s, ...next })}
        presets={s.presets.map(p => p.name)}
        onSavePreset={name => update({ ...s, presets: [...s.presets.filter(p => p.name !== name), presetOf(name, s)] })}
        onApplyPreset={name => { const p = s.presets.find(x => x.name === name); if (p) restart(presetData(p.data)) }}
        onDeletePreset={name => update({ ...s, presets: s.presets.filter(p => p.name !== name) })} onPreviewSound={(k, v) => thock(false, k, v)} onClose={() => setSettingsOpen(false)} />}
      {palette && <CommandPalette commands={commands()} onClose={() => setPalette(false)} />}
    </main>
  )
}

// Editor-style status line: mode block on the left, options as segments, preferences on the right
function StatusBar({ s, set, restart, edit, weak, today, sayChunk }: {
  sayChunk: () => void
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
          <button key={m} className={m === s.mode ? 'on' : ''} onClick={() => restart({ mode: m })}>{m === 'quote' && isCode(tl(s)) ? 'bloque' : MODES[m]}</button>
        ))}
      </div>
      <div className="seg p2" aria-label="duración" data-pill key={s.mode}>
        <span className="seg-pill" aria-hidden />
        {s.mode === 'time' && DURATIONS.map(d => opt(d === s.duration, `${d}s`, () => restart({ duration: d })))}
        {s.mode === 'words' && COUNTS.map(c => opt(c === s.count, `${c}`, () => restart({ count: c })))}
        {s.mode === 'quote' && opt(false, isCode(tl(s)) ? 'otro bloque' : 'otra cita', () => restart())}
        {s.mode === 'wiki' && opt(false, 'otro artículo', () => restart())}
        {s.mode === 'dictation' && <>{opt(false, '🔊 escuchar · enter', () => sayChunk())}{opt(false, 'otra frase', () => restart())}</>}
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
            {BASE_LANGS.map(l => opt(l === s.lang, LANGS[l], () => restart({ lang: l })))}
            <select className={`code-select more-langs ${s.lang in EXTRA_LANGS ? 'on' : ''}`} value={s.lang in EXTRA_LANGS ? s.lang : ''} aria-label="más idiomas"
              onChange={e => e.target.value && restart({ lang: e.target.value as Lang })}>
              <option value="" disabled>más</option>
              {Object.entries(EXTRA_LANGS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </span>
          {s.lang === 'code' && s.mode !== 'daily' && (
            <select className="code-select" value={s.codeLang} aria-label="lenguaje de programación" onChange={e => restart({ codeLang: e.target.value as Lang })}>
              {Object.entries(CODE_LANGS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          )}
          {usesOpts(s.mode) && !isCode(s.lang) && (
            <span className="pill-group lista" data-pill title="palabras más comunes del idioma">
              <span className="seg-pill" aria-hidden />
              <span className="seg-label" aria-hidden>nivel</span>
              {POOLS.map(p => opt(p === s.pool, POOL_LABEL[p], () => restart({ pool: p })))}
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
        {opt(!s.save, 'práctica libre', () => set({ ...s, save: !s.save }), 'entrena sin guardar resultados')}
        {opt(s.sound, 'sonido', () => set({ ...s, sound: !s.sound }))}
        {opt(s.live, 'wpm', () => set({ ...s, live: !s.live }), 'wpm en vivo')}
        {opt(s.ghost, 'fantasma', () => set({ ...s, ghost: !s.ghost }), 'un segundo cursor corre a tu ritmo elegido (ajustes → cursor)')}
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

function ResultView({ r, theme, myName, signup, onNext, onDrill, onDrillWords, rank }: {
  r: FullResult; myName?: string; signup?: { open: () => void; dismiss: () => void }; theme: string; onNext: () => void; onDrill: (pairs: string[]) => void; onDrillWords: (words: string[]) => void; rank: RankProps
}) {
  const view = useRef<HTMLElement>(null)
  useLayoutEffect(() => { if (view.current) resultIntro(view.current) }, [r])
  const labels = useMemo(() => r.samples.map((_, i) => i + 1), [r])
  const series = useMemo(() => [
    { label: 'wpm', data: r.samples.map(x => x.wpm) },
    { label: 'raw', data: r.samples.map(x => x.raw), dim: true },
  ], [r])
  const newPb = r.failed === undefined && !r.unsaved && r.wpm > r.prevPb
  const mode = r.mode ?? 'time'
  const shownWpm = useCountUp(r.wpm), shownAcc = useCountUp(r.acc)
  const detail = (mode === 'time' ? `${r.duration}s` : mode === 'words' ? `${r.value} palabras · ${r.duration}s` : `${r.duration}s`)
    + (r.pool ? ` · top ${r.pool}` : '') + (r.plain ? ' · sin acentos' : '')
  return (
    <section className="result result-view" ref={view}>
      {r.unsaved && r.failed === undefined && (
        <div className="failed" role="status"><b>práctica libre</b> · este test no se guardó en tu historial, récords ni nivel.</div>
      )}
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
        <div><small>modo</small>{MODES[mode]} · {LANGS[r.lang as Lang]} · {detail}{r.punct ? ' @' : ''}{r.numbers ? ' #' : ''}{r.rules?.length ? ` · ${r.rules.map(k => RULES[k as keyof Rules][0]).join(', ')}` : ''}{r.tags?.length ? ` · ${r.tags.map(t => '#' + t).join(' ')}` : ''}</div>
      </div>
      {r.xpBefore !== undefined && <XpCard before={r.xpBefore} gained={xpFor(r)} />}
      {signup && (
        <div className="card signup-nudge">
          <div><b>guarda tu progreso</b><span>crea una cuenta gratis: tus tests se sincronizan entre dispositivos y entras al ranking</span></div>
          <button className="on" onClick={signup.open}>crear cuenta</button>
          <button onClick={signup.dismiss}>ahora no</button>
        </div>
      )}
      {r.vs && (
        <div className={`card duel-result ${r.wpm > r.vs.wpm ? 'won' : ''}`} role="status">
          <small>⚔ duelo contra {r.vs.name ?? 'tu rival'}</small>
          <b>{r.wpm > r.vs.wpm ? `ganaste por ${r.wpm - r.vs.wpm} wpm` : r.wpm === r.vs.wpm ? 'empate' : `perdiste por ${r.vs.wpm - r.wpm} wpm`}</b>
          <span>tú {r.wpm} wpm · {r.acc}% — {r.vs.name ?? 'rival'} {r.vs.wpm} wpm · {r.vs.acc}%</span>
        </div>
      )}
      <ShareBar r={r} myName={myName} modeLabel={`${MODES[mode]} · ${LANGS[r.lang as Lang]} · ${detail}`} />
      {r.daily && <DailyCard n={r.daily.n} lang={r.lang as Lang} official={r.daily.official} entry={r.daily.entry} rank={rank} />}
      {r.by && <p className="by">— {r.by}</p>}
      {mode !== 'zen' && r.log.length > 0 && <WordReplay log={r.log} targets={r.targets} pb={r.prevPb} onDrillWords={onDrillWords} />}
      {mode !== 'zen' && <CoachCard bigrams={r.bigrams} title="coach · este test" onDrill={onDrill} />}
      {mode !== 'zen' && <div className="card"><small>teclas de este test</small><Heatmap hits={r.hits} errs={r.errs} /></div>}
      <p className="hint">{COARSE ? <button onClick={onNext}>↻ siguiente test</button> : <><kbd>tab</kbd> siguiente test</>}</p>
    </section>
  )
}

function ShareBar({ r, modeLabel, myName }: { r: FullResult; modeLabel: string; myName?: string }) {
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
  // duel link: same words + your keystrokes; time tests keep only the words you reached plus a margin
  const mode = r.mode ?? 'time'
  const duelable = r.log.length > 0 && r.failed === undefined && (mode === 'time' || mode === 'words' || mode === 'quote')
  const challenge = async () => {
    const reached = stateAt(r.log, Infinity).length
    const code = encodeDuel({
      name: myName, lang: r.lang, mode: mode as Duel['mode'], value: r.value ?? 0, log: r.log, wpm: r.wpm, acc: r.acc,
      words: mode === 'time' ? r.targets.slice(0, reached + 40) : r.targets,
    })
    if (!code) { flash('no se pudo crear el duelo'); return }
    const url = `${APP_URL}/?duelo=${code}`
    const msg = `⚔ Te reto en ThockType: hice ${r.wpm} wpm (${modeLabel}). ¿Me ganas?`
    if (navigator.share && COARSE) { try { await navigator.share({ text: msg, url }); return } catch { /* cancelled: fall back to copying */ } }
    flash((await copyText(`${msg}
${url}`)) ? 'link del duelo copiado' : 'no se pudo copiar')
  }
  return (
    <div className="share">
      <button onClick={onImage} disabled={busy}>{busy ? 'creando…' : '↗ compartir imagen'}</button>
      <button onClick={async () => flash((await copyText(text)) ? 'texto copiado' : 'no se pudo copiar')}>⧉ copiar texto</button>
      {duelable && <button className="duel-btn" onClick={challenge}>⚔ {r.vs ? 'mandar revancha' : 'retar a alguien'}</button>}
      <span className="share-status" role="status">{status}</span>
    </div>
  )
}

