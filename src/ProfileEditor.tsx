import { t } from './i18n'
import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { saveProfile, uploadAvatar, type Profile } from './profile'
import { checkProfile, suggestUsername } from './profileRules'

type Props = { session: Session; me: Profile | null; onSaved: (p: Profile) => void }

export default function ProfileEditor({ session, me, onSaved }: Props) {
  const meta = session.user.user_metadata as { avatar_url?: string; full_name?: string }
  const [username, setUsername] = useState(me?.username ?? suggestUsername(me?.display_name || meta.full_name || session.user.email || 'typer'))
  const [name, setName] = useState(me?.display_name ?? '')
  const [bio, setBio] = useState(me?.bio ?? '')
  const [avatar, setAvatar] = useState(me?.avatar_url ?? null)
  const [isPublic, setIsPublic] = useState(me?.is_public ?? true)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const onFile = async (file?: File) => {
    if (!file) return
    setBusy(true); setMsg('subiendo foto…')
    try { setAvatar(await uploadAvatar(session.user.id, file)); setMsg('foto lista: guarda para aplicarla') }
    catch (e) { setMsg((e as Error).message) }
    setBusy(false)
  }
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const fields = { username: username.trim(), display_name: name, bio }
    const problem = checkProfile(fields)
    if (problem) { setMsg(problem); return }
    setBusy(true)
    const err = await saveProfile(session.user.id, { ...fields, is_public: isPublic, avatar_url: avatar })
    setBusy(false)
    if (err) { setMsg(err); return }
    setMsg('perfil guardado')
    onSaved({ ...(me as Profile), id: session.user.id, username: fields.username, display_name: name.trim() || null, bio: bio.trim() || null, avatar_url: avatar, is_public: isPublic })
  }

  return (
    <form onSubmit={save} className="profile-form">
      <div className="avatar-row">
        {avatar ? <img className="avatar-lg" src={avatar} alt={t('tu foto')} /> : <span className="avatar-lg avatar">{username[0] ?? '?'}</span>}
        <div className="avatar-actions">
          <label className="file-btn">{t('subir foto')}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={busy} onChange={e => onFile(e.target.files?.[0])} />
          </label>
          {meta.avatar_url && avatar !== meta.avatar_url && <button type="button" onClick={() => setAvatar(meta.avatar_url!)}>{t('usar la de Google')}</button>}
          {avatar && <button type="button" onClick={() => setAvatar(null)}>{t('quitar')}</button>}
        </div>
      </div>
      <label>{t('usuario')}
        <span className="prefixed"><span>@</span>
          <input required value={username} maxLength={20} autoComplete="username" spellCheck={false}
            onChange={e => setUsername(e.target.value.toLowerCase())} />
        </span>
      </label>
      <label>{t('nombre')} <input value={name} maxLength={40} onChange={e => setName(e.target.value)} /></label>
      <label>{t('bio')} <textarea value={bio} maxLength={160} rows={2} onChange={e => setBio(e.target.value)} /></label>
      <label className="check">
        <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
        {t('perfil público (cualquiera con el enlace puede verlo)')}
      </label>
      <button className="on" type="submit" disabled={busy}>{busy ? '…' : t('guardar perfil')}</button>
      <p className="auth-msg" role="status">{t(msg)}</p>
    </form>
  )
}
