import { t, uiLang } from './i18n'
import { useEffect, useState } from 'react'
import { loadPublicProfile, type PublicProfile } from './profile'
import { weeklyTop } from './leaderboard'
import { copyText } from './share'
import { APP_URL } from './config'
import History from './History'

type Props = { username: string; theme: string; isMe: boolean }

export default function ProfilePage({ username, theme, isMe }: Props) {
  const [data, setData] = useState<PublicProfile | null | 'loading' | 'error'>('loading')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    setData('loading')
    loadPublicProfile(username).then(d => alive && setData(d)).catch(() => alive && setData('error'))
    return () => { alive = false }
  }, [username])

  // "top 10 this week" badges; quietly absent offline or before the leaderboard exists
  const [badges, setBadges] = useState<{ lang: string; value: number; place: number }[]>([])
  useEffect(() => {
    let alive = true
    weeklyTop(username).then(b => alive && setBadges(b)).catch(() => {})
    return () => { alive = false }
  }, [username])
  if (data === 'loading') return <p className="hint">{t('cargando perfil…')}</p>
  if (data === 'error') return <p className="hint">{t('no se pudo cargar el perfil. Revisa tu conexión.')}</p>
  if (!data) return <p className="hint">@{username} no existe o su perfil es privado.</p>

  const { profile: p, history, keys, bigrams } = data
  const joined = new Date(p.created_at).toLocaleDateString(uiLang(), { month: 'long', year: 'numeric' })
  const url = `${APP_URL}/u/${p.username}`
  return (
    <section className="result profile">
      <div className="card profile-head">
        {p.avatar_url
          ? <img className="avatar-xl" src={p.avatar_url} alt="" referrerPolicy="no-referrer" />
          : <span className="avatar-xl avatar">{(p.username ?? '?')[0]}</span>}
        <div className="profile-id">
          <h2>{p.display_name || `@${p.username}`}</h2>
          <p className="profile-handle">@{p.username} · {t('se unió en {date}', { date: joined })}{isMe && !p.is_public && ` · ${t('privado: solo tú lo ves')}`}</p>
          {p.bio && <p className="profile-bio">{p.bio}</p>}
          {badges.length > 0 && (
            <div className="badges">
              {badges.map(b => (
                <span key={b.lang + b.value} className="badge" title={t('top 10 de la semana en el ranking')}>
                  🏆 #{b.place} · {b.value} s {t(({ es: 'español', en: 'english', code: 'código' } as Record<string, string>)[b.lang])} · {t('esta semana')}
                </span>
              ))}
            </div>
          )}
        </div>
        <button onClick={async () => { setCopied(await copyText(url)); setTimeout(() => setCopied(false), 2000) }}>
          {copied ? t('enlace copiado') : `⧉ ${t('copiar enlace')}`}
        </button>
      </div>
      <History h={history} theme={theme} keys={keys} bigrams={bigrams} />
    </section>
  )
}
