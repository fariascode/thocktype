import { t } from './i18n'
import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { Icon } from './AuthModal'
import { LevelBar } from './LevelUi'
import { copyText } from './share'
import { APP_URL } from './config'
import type { Profile } from './profile'

const SYNC: Record<string, string> = {
  syncing: 'sincronizando…', ok: 'guardado en la nube', error: 'sin conexión: se subirá después', idle: '',
}
const I = {
  edit: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4',
  profile: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  history: 'M4 19V5M4 19h16M8 15l3-4 3 2 5-6',
  settings: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11',
}

type Stats = { level: number; title: string; progress: number; tests: number; best: number; streak: number }
type Props = {
  session: Session; me: Profile | null; syncState: string; anchor: DOMRect | null; stats: Stats
  onClose: () => void; onEdit: () => void; onOpenProfile: (u: string) => void; onHistory: () => void; onSettings: () => void
}

// Dropdown under your avatar: who you are, how you're doing, and shortcuts. Closes on outside click or Esc.
export default function AccountMenu({ session, me, syncState, anchor, stats, onClose, onEdit, onOpenProfile, onHistory, onSettings }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    // the avatar button toggles the menu itself, so a press on it isn't an "outside" click
    const out = (e: MouseEvent) => { const el = e.target as Element; if (!box.current?.contains(el) && !el.closest?.('.account-btn')) onClose() }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', out)
    document.addEventListener('keydown', esc)
    box.current?.querySelector<HTMLElement>('button')?.focus()
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', esc) }
  }, [onClose])

  const go = (fn: () => void) => () => { onClose(); fn() }
  const copyLink = async () => { if (me?.username && await copyText(`${APP_URL}/u/${me.username}`)) { setCopied(true); setTimeout(() => setCopied(false), 1800) } }
  const pos = anchor ? { top: anchor.bottom + 10, right: Math.max(12, window.innerWidth - anchor.right) } : { top: 70, right: 16 }

  return (
    <div className="acct-menu card" ref={box} role="menu" aria-label={t('tu cuenta')} style={pos}>
      <div className="acct-head">
        {me?.avatar_url
          ? <img className="acct-avatar" src={me.avatar_url} alt="" referrerPolicy="no-referrer" />
          : <span className="acct-avatar avatar">{(me?.username ?? session.user.email ?? '?')[0]}</span>}
        <div className="acct-id">
          <b>{me?.display_name || (me?.username ? `@${me.username}` : t('tu cuenta'))}</b>
          <span className="acct-handle">
            {me?.username ? `@${me.username}` : t('sin usuario todavía')}
            {me?.username && <span className="acct-badge">{t(me.is_public ? 'público' : 'privado')}</span>}
          </span>
          <span className="acct-email">{session.user.email}</span>
        </div>
      </div>

      <div className="acct-stats">
        <div className="acct-level"><small>{t('nivel')}</small><b>{stats.level}</b><span>{t(stats.title)}</span><LevelBar progress={stats.progress} /></div>
        <div><small>{t('tests')}</small><b>{stats.tests}</b></div>
        <div><small>{t('mejor')}</small><b>{stats.best}</b><span>wpm</span></div>
        <div><small>{t('racha')}</small><b>{stats.streak}</b><span>{t('días')}</span></div>
      </div>

      {SYNC[syncState] && <div className={`acct-sync ${syncState}`} role="status"><span className="dot" />{t(SYNC[syncState])}</div>}

      <div className="acct-items">
        <button role="menuitem" onClick={go(onEdit)}><Icon d={I.edit} />{t(me?.username ? 'editar perfil' : 'crear mi perfil')}</button>
        {me?.username && <>
          <button role="menuitem" onClick={go(() => onOpenProfile(me.username!))}><Icon d={I.profile} />{t('ver mi perfil')}<span className="acct-hint">/u/{me.username}</span></button>
          <button role="menuitem" onClick={copyLink}><Icon d={I.link} />{t(copied ? 'enlace copiado' : 'copiar enlace de mi perfil')}</button>
        </>}
        <button role="menuitem" onClick={go(onHistory)}><Icon d={I.history} />{t('historial y récords')}</button>
        <button role="menuitem" onClick={go(onSettings)}><Icon d={I.settings} />{t('ajustes')}</button>
        <hr />
        <button role="menuitem" className="acct-out" onClick={go(() => supabase.auth.signOut())}><Icon d={I.logout} />{t('cerrar sesión')}</button>
      </div>
    </div>
  )
}
