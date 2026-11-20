// Pure: which rows the ranking shows. Top N, plus your own row underneath when you're outside it.
export type RankRow = {
  user_id: string; wpm: number; acc: number; created_at: string
  profiles: { username: string; display_name: string | null; avatar_url: string | null }
}
export type RankEntry = { place: number; row: RankRow; isMe: boolean; gapBefore: boolean }

export function rankEntries(top: RankRow[], uid?: string, me?: { row: RankRow; place: number }): RankEntry[] {
  const list = top.map((row, i) => ({ place: i + 1, row, isMe: row.user_id === uid, gapBefore: false }))
  if (me && !list.some(e => e.isMe)) list.push({ place: me.place, row: me.row, isMe: true, gapBefore: me.place > top.length + 1 })
  return list
}
