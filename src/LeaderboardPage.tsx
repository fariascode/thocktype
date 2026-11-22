import { useEffect, useRef, useState } from 'react'
import { loadBoard, type Board, type BoardRow } from './leaderboard'

type Props = { uid?: string; hasUsername: boolean; lang: 'es' | 'en' | 'code'; onOpenProfile: (username: string) => void }
const LANGS = { es: 'español', en: 'english', code: 'código' } as const

// All-time / weekly leaderboard for 15 s and 60 s tests. Your own row is always included, even outside the top 50.
export default function LeaderboardPage({ uid, hasUsername, lang, onOpenProfile }: Props) {
  const [b, setB] = useState<Board>({ lang, value: 15, pool: 200, week: false })
  const [rows, setRows] = useState<BoardRow[] | null | 'error'>(null)
  const list = useRef<HTMLOListElement>(null)
  useEffect(() => {
    let alive = true
    setRows(null)
    loadBoard(b).then(r => alive && setRows(r)).catch(() => alive && setRows('error'))
    return () => { alive = false }
  }, [b, uid])

  const me = Array.isArray(rows) ? rows.find(r => r.is_me) : undefined
  const chip = <K extends keyof Board>(k: K, v: Board[K], label: string) =>
    <button key={String(v)} className={b[k] === v ? 'on' : ''} onClick={() => setB({ ...b, [k]: v })}>{label}</button>
  const jumpToMe = () => list.current?.querySelector('.me')?.scrollIntoView({ block: 'center', behavior: 'smooth' })

  return (
    <section className="result board">
      <div className="card">
        <div className="board-head">
          <h2>ranking</h2>
          {me && <button className="on" onClick={jumpToMe}>mi lugar · #{me.place}</button>}
        </div>
        <div className="board-filters">
          <div className="seg">{chip('value', 15, '15 s')}{chip('value', 60, '60 s')}</div>
          <div className="seg">{(Object.keys(LANGS) as Board['lang'][]).map(l => chip('lang', l, LANGS[l]))}</div>
          {b.lang !== 'code' && <div className="seg">{chip('pool', 200, 'top 200')}{chip('pool', null, '1k')}</div>}
          <div className="seg">{chip('week', false, 'siempre')}{chip('week', true, 'esta semana')}</div>
        </div>

        <div className="ranking">
          {rows === null && <p className="hint">cargando ranking…</p>}
          {rows === 'error' && <p className="hint">sin conexión: el ranking se verá cuando vuelvas a estar en línea</p>}
          {Array.isArray(rows) && !rows.length && <p className="hint">aún nadie en este ranking. ¡haz un test de {b.value} s y sé el primero!</p>}
          {Array.isArray(rows) && rows.length > 0 && (
            <ol ref={list}>
              {rows.map((r, i) => (
                <li key={r.username} className={`${r.is_me ? 'me' : ''} ${i > 0 && r.place > rows[i - 1].place + 1 ? 'gap' : ''}`}>
                  <span className="rk-place">{r.place <= 3 ? ['①', '②', '③'][r.place - 1] : r.place}</span>
                  {r.avatar_url
                    ? <img className="rk-avatar" src={r.avatar_url} alt="" referrerPolicy="no-referrer" />
                    : <span className="rk-avatar avatar">{r.username[0]}</span>}
                  <button className="rk-name" onClick={() => onOpenProfile(r.username)}>
                    {r.display_name || r.username}<small>@{r.username}</small>
                  </button>
                  <span className="rk-wpm">{r.wpm}<small> wpm</small></span>
                  <span className="rk-acc">{r.acc}%</span>
                  <span className="rk-extra" title="raw · consistencia · fecha">raw {r.raw} · {r.cons}% · {new Date(r.date).toLocaleDateString()}</span>
                </li>
              ))}
            </ol>
          )}
          {!uid && <p className="hint rk-note">inicia sesión y elige un @usuario para aparecer en el ranking</p>}
          {uid && !hasUsername && <p className="hint rk-note">elige un @usuario en tu perfil para aparecer en el ranking</p>}
        </div>
        <p className="hint rk-note">cuentan los tests de tiempo sin puntuación, números, reglas ni «sin acentos». El servidor descarta resultados imposibles.</p>
      </div>
    </section>
  )
}
