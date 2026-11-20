import { useEffect, useState } from 'react'
import { loadRanking } from './ranking'
import { rankEntries, type RankEntry } from './rankList'

type Props = { day: string; lang: string; uid?: string; hasUsername: boolean; refresh?: unknown; onOpenProfile: (username: string) => void }

// Today's ranking for the daily challenge. `refresh` changes after a sync, so a new official attempt shows up.
export default function DailyRanking({ day, lang, uid, hasUsername, refresh, onOpenProfile }: Props) {
  const [list, setList] = useState<RankEntry[] | null | 'error'>(null)
  useEffect(() => {
    let alive = true
    loadRanking(day, lang, uid).then(r => alive && setList(rankEntries(r.top, uid, r.me))).catch(() => alive && setList('error'))
    return () => { alive = false }
  }, [day, lang, uid, refresh])

  return (
    <div className="ranking">
      {list === null && <p className="hint">cargando ranking…</p>}
      {list === 'error' && <p className="hint">sin conexión: el ranking se verá cuando vuelvas a estar en línea</p>}
      {Array.isArray(list) && !list.length && <p className="hint">nadie ha hecho el reto de hoy en este idioma. ¡sé el primero!</p>}
      {Array.isArray(list) && list.length > 0 && (
        <ol>
          {list.map(e => (
            <li key={e.row.user_id} className={`${e.isMe ? 'me' : ''} ${e.gapBefore ? 'gap' : ''}`}>
              <span className="rk-place">{e.place <= 3 ? ['①', '②', '③'][e.place - 1] : e.place}</span>
              {e.row.profiles.avatar_url
                ? <img className="rk-avatar" src={e.row.profiles.avatar_url} alt="" referrerPolicy="no-referrer" />
                : <span className="rk-avatar avatar">{e.row.profiles.username[0]}</span>}
              <button className="rk-name" onClick={() => onOpenProfile(e.row.profiles.username)}>
                {e.row.profiles.display_name || e.row.profiles.username}<small>@{e.row.profiles.username}</small>
              </button>
              <span className="rk-wpm">{e.row.wpm}<small> wpm</small></span>
              <span className="rk-acc">{e.row.acc}%</span>
            </li>
          ))}
        </ol>
      )}
      {!uid && <p className="hint rk-note">inicia sesión para que tu intento oficial aparezca aquí</p>}
      {uid && !hasUsername && <p className="hint rk-note">elige un @usuario en tu perfil para aparecer en el ranking</p>}
    </div>
  )
}
