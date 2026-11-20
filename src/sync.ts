// Cloud sync with Supabase. Local storage stays the source the app reads; the cloud is a copy shared
// between your devices. Every step is idempotent, so a failed or repeated sync is harmless.
import { supabase } from './supabase'
import { dayKey, loadHistory, loadKeys, mergeKeys, saveHistory, saveKeys, type KeyStats, type Result } from './stats'
import { loadDaily, saveDailyAll, type DailyEntry } from './daily'
import { loadBigrams, mergeBigrams, saveBigrams, type Bigrams } from './coach'
import { fromRow, mergeDaily, mergeHistory, toDailyRows, toRow, type DailyRow, type ResultRow } from './syncData'

const OWNER = 'thocktype.owner' // account this device's local data belongs to
const SYNCED = 'thocktype.syncedAt' // newest result date already uploaded
const PENDING = 'thocktype.stats.pending' // key/coach counts not yet added to the cloud totals
const LOCAL_KEYS = ['thocktype.history', 'thocktype.daily', 'thocktype.keys', 'thocktype.bigrams', SYNCED, PENDING]

type Pending = { keys: KeyStats; bigrams: Bigrams }
const get = <T,>(k: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? '') as T } catch { return fallback } }
const set = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage blocked */ } }
const noPending = (): Pending => ({ keys: { hits: {}, errs: {} }, bigrams: {} })

// called after every test (signed in or not): remember what still has to reach the cloud
export function addPendingStats(delta: Pending) {
  const p = get(PENDING, noPending())
  set(PENDING, { keys: mergeKeys(p.keys, delta.keys), bigrams: mergeBigrams(p.bigrams, delta.bigrams) })
}

// one sync at a time: two overlapping runs would add the same pending stats twice
let queue: Promise<unknown> = Promise.resolve()
const locked = <T,>(fn: () => Promise<T>): Promise<T> => {
  const run = queue.then(fn, fn)
  queue = run.catch(() => {})
  return run
}

export type Synced = { history: Result[]; daily: Record<string, DailyEntry>; keys: KeyStats; bigrams: Bigrams }

function claimDevice(uid: string) {
  const owner = localStorage.getItem(OWNER)
  if (owner === uid) return
  if (owner) LOCAL_KEYS.forEach(k => localStorage.removeItem(k)) // another account's data: it's already in their cloud
  else set(PENDING, { keys: loadKeys(), bigrams: loadBigrams() }) // first sign-in here: upload everything once
  localStorage.setItem(OWNER, uid)
}

async function pushUp(uid: string) {
  // results newer than the last upload (includes tests done offline)
  const since = get(SYNCED, 0)
  const fresh = loadHistory().filter(r => r.date > since)
  const rows = fresh.map(r => toRow(uid, r)).filter((r): r is ResultRow => r !== null)
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from('results').upsert(rows.slice(i, i + 500), { onConflict: 'user_id,date', ignoreDuplicates: true })
    if (error) throw error
  }
  if (fresh.length) set(SYNCED, Math.max(...fresh.map(r => r.date)))

  // today's/yesterday's official daily attempts; the server keeps the first one it gets
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  const daily = toDailyRows(uid, loadDaily(), dayKey(yesterday))
  if (daily.length) {
    const { error } = await supabase.from('daily').upsert(daily, { onConflict: 'user_id,day,lang', ignoreDuplicates: true })
    if (error) throw error
  }

  // stats: cloud totals + what this device added since last time
  const pending = get(PENDING, noPending())
  const { data, error } = await supabase.from('stats').select('keys, bigrams').eq('user_id', uid).maybeSingle()
  if (error) throw error
  const cloud = { keys: { hits: {}, errs: {}, ...data?.keys }, bigrams: (data?.bigrams ?? {}) as Bigrams }
  const totals = { keys: mergeKeys(cloud.keys, pending.keys), bigrams: mergeBigrams(cloud.bigrams, pending.bigrams) }
  const { error: upErr } = await supabase.from('stats').upsert({ user_id: uid, ...totals, updated_at: new Date().toISOString() })
  if (upErr) throw upErr
  set(PENDING, noPending())
  saveKeys(totals.keys)
  saveBigrams(totals.bigrams)
}

async function pullDown(uid: string) {
  const remote: Result[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('results').select('*').eq('user_id', uid).order('date').range(from, from + 999)
    if (error) throw error
    remote.push(...(data as ResultRow[]).map(fromRow))
    if (data.length < 1000) break
  }
  saveHistory(mergeHistory(loadHistory(), remote))

  const { data, error } = await supabase.from('daily').select('user_id, day, lang, wpm, acc, grid').eq('user_id', uid)
  if (error) throw error
  saveDailyAll(mergeDaily(loadDaily(), data as DailyRow[]))
}

const snapshot = (): Synced => ({ history: loadHistory(), daily: loadDaily(), keys: loadKeys(), bigrams: loadBigrams() })

// on sign-in / app start: upload what's new, then bring in other devices' data
export const syncAll = (uid: string) => locked(async () => { claimDevice(uid); await pushUp(uid); await pullDown(uid); return snapshot() })

// after a test or when the connection comes back: upload only
export const syncUp = (uid: string) => locked(async () => { claimDevice(uid); await pushUp(uid); return snapshot() })
