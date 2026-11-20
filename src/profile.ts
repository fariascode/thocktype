// Profile data in Supabase: your own profile, avatar upload and public profile pages.
import { supabase } from './supabase'
import { fromRow, type ResultRow } from './syncData'
import type { KeyStats, Result } from './stats'
import type { Bigrams } from './coach'
import type { ProfileFields } from './profileRules'

export type Profile = {
  id: string; username: string | null; display_name: string | null; bio: string | null
  avatar_url: string | null; is_public: boolean; created_at: string
}

export async function getMyProfile(uid: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
  return data
}

export async function saveProfile(uid: string, p: ProfileFields & { is_public: boolean; avatar_url: string | null }): Promise<string | null> {
  const { error } = await supabase.from('profiles').update({
    username: p.username, display_name: p.display_name.trim() || null, bio: p.bio.trim() || null,
    is_public: p.is_public, avatar_url: p.avatar_url,
  }).eq('id', uid)
  if (!error) return null
  if (error.code === '23505') return 'ese usuario ya está en uso, prueba otro'
  return 'no se pudo guardar, inténtalo de nuevo'
}

// square-crop and shrink to 256px WebP in the browser: small upload, always under the 1 MB bucket limit
export async function uploadAvatar(uid: string, file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error('usa una imagen png, jpg o webp')
  if (file.size > 15 * 1024 * 1024) throw new Error('la imagen pesa demasiado (máx. 15 MB)')
  const img = await createImageBitmap(file)
  const side = Math.min(img.width, img.height)
  const cv = document.createElement('canvas')
  cv.width = cv.height = 256
  cv.getContext('2d')!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 256, 256)
  const blob = await new Promise<Blob | null>(r => cv.toBlob(r, 'image/webp', 0.85))
  if (!blob) throw new Error('no se pudo procesar la imagen')
  const path = `${uid}/avatar.webp`
  const { error } = await supabase.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/webp' })
  if (error) throw new Error('no se pudo subir la imagen')
  // same file name on every upload: the version query makes browsers fetch the new picture
  return `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`
}

export type PublicProfile = { profile: Profile; history: Result[]; keys: KeyStats; bigrams: Bigrams }

// null when the user doesn't exist or made the profile private (RLS hides both the same way)
export async function loadPublicProfile(username: string): Promise<PublicProfile | null> {
  const { data: profile } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle()
  if (!profile) return null
  const history: Result[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('results').select('*').eq('user_id', profile.id).order('date').range(from, from + 999)
    if (error) throw error
    history.push(...(data as ResultRow[]).map(fromRow))
    if (data.length < 1000) break
  }
  const { data: stats } = await supabase.from('stats').select('keys, bigrams').eq('user_id', profile.id).maybeSingle()
  return {
    profile, history,
    keys: { hits: {}, errs: {}, ...stats?.keys },
    bigrams: stats?.bigrams ?? {},
  }
}
