// Daily challenge ranking from Supabase. Only public profiles with a username appear (RLS + inner join).
import { supabase } from './supabase'
import type { RankRow } from './rankList'

const COLS = 'user_id, wpm, acc, created_at, profiles!inner(username, display_name, avatar_url)'
export const RANK_SIZE = 20

export async function loadRanking(day: string, lang: string, uid?: string) {
  const base = () => supabase.from('daily').select(COLS).eq('day', day).eq('lang', lang).not('profiles.username', 'is', null)
  const { data, error } = await base().order('wpm', { ascending: false }).order('acc', { ascending: false }).order('created_at').limit(RANK_SIZE)
  if (error) throw error
  const top = data as unknown as RankRow[]
  if (!uid || top.some(r => r.user_id === uid)) return { top }

  const { data: mine } = await base().eq('user_id', uid).maybeSingle()
  if (!mine) return { top }
  const row = mine as unknown as RankRow
  // place = people strictly ahead of you (faster, or same speed and more accurate) + 1
  const { count } = await supabase.from('daily').select('user_id, profiles!inner(username)', { count: 'exact', head: true })
    .eq('day', day).eq('lang', lang).not('profiles.username', 'is', null)
    .or(`wpm.gt.${row.wpm},and(wpm.eq.${row.wpm},acc.gt.${row.acc})`)
  return { top, me: { row, place: (count ?? 0) + 1 } }
}
