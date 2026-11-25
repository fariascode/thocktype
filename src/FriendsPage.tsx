import { t, uiLang } from './i18n'
import { useEffect, useState } from 'react'
import { addFriend, listFriends, removeFriend, searchUsers, type Friend, type UserHit } from './friends'

type Props = { uid?: string; onOpenProfile: (username: string) => void; onSignIn: () => void }

const Face = ({ u }: { u: UserHit }) => u.avatar_url
  ? <img className="avatar" src={u.avatar_url} alt="" referrerPolicy="no-referrer" />
  : <span className="avatar">{u.username[0]}</span>

// Search people by @username or name, add them, and see your friends' best speeds.
export default function FriendsPage({ uid, onOpenProfile, onSignIn }: Props) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<UserHit[] | null | 'error'>(null)
  const [friends, setFriends] = useState<Friend[] | null | 'error'>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const reload = () => listFriends().then(setFriends).catch(() => setFriends('error'))
  useEffect(() => { if (uid) reload(); else setFriends([]) }, [uid])

  // a short pause after typing so each keystroke doesn't hit the database
  useEffect(() => {
    if (q.trim().length < 2) { setHits(null); return }
    let alive = true
    const id = setTimeout(() => searchUsers(q, uid).then(h => alive && setHits(h)).catch(() => alive && setHits('error')), 250)
    return () => { alive = false; clearTimeout(id) }
  }, [q, uid])

  const ids = new Set(Array.isArray(friends) ? friends.map(f => f.id) : [])
  const toggle = async (u: UserHit) => {
    if (!uid) return onSignIn()
    setBusy(u.id)
    try { await (ids.has(u.id) ? removeFriend(uid, u.id) : addFriend(u.id)); await reload() } catch { /* the button stays as it was */ }
    setBusy(null)
  }
  const btn = (u: UserHit) => (
    <button className={ids.has(u.id) ? '' : 'on'} disabled={busy === u.id} onClick={e => { e.stopPropagation(); toggle(u) }}
      aria-label={ids.has(u.id) ? t('quitar a @{u} de amigos', { u: u.username }) : t('agregar a @{u}', { u: u.username })}>
      {ids.has(u.id) ? t('quitar') : `+ ${t('agregar')}`}
    </button>
  )
  const row = (u: UserHit, extra?: React.ReactNode) => (
    <li key={u.id} onClick={() => onOpenProfile(u.username)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && onOpenProfile(u.username)}>
      <Face u={u} />
      <span className="people-id"><b>{u.display_name || `@${u.username}`}</b><small>@{u.username}{extra}</small></span>
      {btn(u)}
    </li>
  )
  const since = (d: string | null) => d ? new Date(d).toLocaleDateString(uiLang(), { day: 'numeric', month: 'short' }) : '—'

  return (
    <section className="result friends">
      <div className="card">
        <h2>{t('buscar usuarios')}</h2>
        <input className="people-search" type="search" value={q} onChange={e => setQ(e.target.value)} autoFocus
          placeholder={t('@usuario o nombre')} aria-label={t('buscar usuarios')} />
        {hits === 'error' ? <p className="hint">{t('no se pudo buscar. Revisa tu conexión.')}</p>
          : hits && !hits.length ? <p className="hint">{t('nadie con ese nombre. Solo aparecen perfiles públicos con @usuario.')}</p>
          : hits && <ul className="people">{hits.map(u => row(u))}</ul>}
      </div>

      <div className="card">
        <h2>{t('amigos')}</h2>
        {!uid ? <p className="hint"><button className="inline-btn" onClick={onSignIn}>{t('inicia sesión')}</button> {t('para agregar amigos y ver sus récords')}</p>
          : friends === 'error' ? <p className="hint">{t('no se pudo cargar tu lista. Revisa tu conexión.')}</p>
          : friends === null ? <p className="hint">{t('cargando…')}</p>
          : !friends.length ? <p className="hint">{t('aún no tienes amigos agregados: búscalos arriba por su @usuario.')}</p>
          : <ul className="people">{friends.map(f => row(f, <> · {f.best ? t('récord {n} wpm', { n: f.best }) : t('sin tests de tiempo')} · {t('{n} tests', { n: f.tests })} · {t('último {d}', { d: since(f.last_at) })}</>))}</ul>}
      </div>
    </section>
  )
}
