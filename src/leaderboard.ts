// Global leaderboard (see supabase/leaderboard.sql): the server picks each player's best ranked run
import { supabase } from './supabase'
import { isCode, type Lang } from './words'

export type BoardRow = {
  place: number; username: string; display_name: string | null; avatar_url: string | null
  wpm: number; acc: number; raw: number; cons: number; date: string; is_me: boolean
}
export type Board = { lang: Lang; value: 15 | 60; pool: 200 | 5000 | 10000 | null; week: boolean } // null = 1k

export async function loadBoard(b: Board): Promise<BoardRow[]> {
  const { data, error } = await supabase.rpc('leaderboard', {
    p_lang: b.lang, p_value: b.value, p_pool: isCode(b.lang) ? null : b.pool,
    p_since: b.week ? new Date(Date.now() - 7 * 864e5).toISOString() : null, p_limit: 50,
  })
  if (error) throw error
  return data as BoardRow[]
}

export async function weeklyTop(username: string): Promise<{ lang: string; value: number; place: number }[]> {
  const { data, error } = await supabase.rpc('weekly_top', { p_username: username })
  if (error) throw error
  return data
}
