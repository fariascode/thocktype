// Settings follow your account: the newest copy (this device or the cloud) wins. See user_settings in supabase/schema.sql.
import { supabase } from './supabase'

const AT = 'thocktype.settingsAt' // when settings last changed on this device (ms)
const OWNER = 'thocktype.settingsOwner' // account whose settings this device holds
export const localAt = () => Number(localStorage.getItem(AT) || 0)
export const markChanged = (at = Date.now()) => { try { localStorage.setItem(AT, String(at)) } catch { /* storage blocked */ } }

// newer cloud copy -> returns it to apply; otherwise uploads this device's copy and returns null
// A different account signed in on this device: its settings come from the cloud, and the previous account's
// tags and presets are cleared instead of being uploaded into the new account.
export async function syncSettings(uid: string, local: object): Promise<object | null> {
  const { data, error } = await supabase.from('user_settings').select('data, updated_at').eq('user_id', uid).maybeSingle()
  if (error) throw error
  const owner = localStorage.getItem(OWNER)
  const other = !!owner && owner !== uid
  try { localStorage.setItem(OWNER, uid) } catch { /* storage blocked */ }
  const remoteAt = data ? Date.parse(data.updated_at) : 0
  if (data && (other || remoteAt > localAt())) { markChanged(remoteAt); return data.data as object }
  if (other) { markChanged(0); return { ...local, presets: [], tags: [], activeTags: [] } }
  if (localAt() > remoteAt) await pushSettings(uid, local)
  return null
}

export async function pushSettings(uid: string, local: object) {
  const at = localAt() || Date.now()
  const { error } = await supabase.from('user_settings').upsert({ user_id: uid, data: local, updated_at: new Date(at).toISOString() })
  if (error) throw error
}
