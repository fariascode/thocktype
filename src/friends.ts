// Friends (one-way, like following) and user search. Tables and rules: supabase/friends.sql.
import { supabase } from './supabase'
import { cleanQuery } from './profileRules'

export type UserHit = { id: string; username: string; display_name: string | null; avatar_url: string | null }
export type Friend = UserHit & { best: number | null; tests: number; last_at: string | null }

// public profiles with a @username whose username or name contains the text; RLS already hides private ones
// shortcut: ilike scans the profiles table, add a trigram index when there are many thousands of users
export async function searchUsers(q: string, myId?: string): Promise<UserHit[]> {
  const s = cleanQuery(q)
  if (s.length < 2) return []
  const { data, error } = await supabase.from('profiles')
    .select('id, username, display_name, avatar_url')
    .not('username', 'is', null)
    .or(`username.ilike.%${s.toLowerCase().replace(/ /g, '_')}%,display_name.ilike.%${s}%`)
    .order('username').limit(20)
  if (error) throw error
  return (data as UserHit[]).filter(u => u.id !== myId)
}

export async function listFriends(): Promise<Friend[]> {
  const { data, error } = await supabase.rpc('my_friends')
  if (error) throw error
  return data as Friend[]
}

export async function addFriend(friendId: string) {
  const { error } = await supabase.from('friends').insert({ friend_id: friendId })
  if (error && error.code !== '23505') throw error // already a friend counts as done
}

export async function removeFriend(myId: string, friendId: string) {
  const { error } = await supabase.from('friends').delete().eq('user_id', myId).eq('friend_id', friendId)
  if (error) throw error
}

export async function isFriend(myId: string, friendId: string): Promise<boolean> {
  const { data } = await supabase.from('friends').select('friend_id').eq('user_id', myId).eq('friend_id', friendId).maybeSingle()
  return !!data
}
