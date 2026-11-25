// Same limits as supabase/schema.sql, checked before saving so people get a clear message instead of a DB error
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/

export type ProfileFields = { username: string; display_name: string; bio: string }

export function checkProfile(p: ProfileFields): string | null {
  if (!USERNAME_RE.test(p.username)) return 'el usuario debe tener de 3 a 20 caracteres: minúsculas, números o _'
  if (p.display_name.length > 40) return 'el nombre puede tener hasta 40 caracteres'
  if (p.bio.length > 160) return 'la bio puede tener hasta 160 caracteres'
  return null
}

// suggest a valid username from a name or email: "Alfredo Farías" -> "alfredo_farias"
export function suggestUsername(from: string): string {
  const base = from.split('@')[0].normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20)
  return base.length >= 3 ? base : `${base}_typer`.slice(0, 20)
}

// user search text: PostgREST filter syntax treats , ( ) % * \ as operators, so keep only letters, digits, _ and spaces
export const cleanQuery = (q: string) => q.normalize('NFC').replace(/[^\p{L}\p{N}_ ]/gu, '').trim().slice(0, 30)
