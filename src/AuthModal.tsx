import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import ProfileEditor from './ProfileEditor'
import type { Profile } from './profile'

export type AuthView = 'login' | 'signup' | 'magic' | 'reset' | 'newpass' | 'account' | 'profile'
type Props = {
  view: AuthView; session: Session | null; me: Profile | null
  onView: (v: AuthView) => void; onClose: () => void; onProfile: (p: Profile) => void
}

// Supabase returns English errors; translate the ones people actually hit
const ES: [RegExp, string][] = [
  [/invalid login credentials/i, 'correo o contraseña incorrectos'],
  [/email not confirmed/i, 'confirma tu correo primero (revisa tu bandeja)'],
  [/already registered/i, 'ese correo ya tiene cuenta: inicia sesión'],
  [/rate limit|too many/i, 'demasiados intentos, espera unos minutos'],
  [/password should be at least/i, 'la contraseña debe tener al menos 8 caracteres'],
  [/provider is not enabled/i, 'el inicio con Google aún no está activado'],
]
// small line icons, drawn with currentColor so they follow every theme
export const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
)

const es = (msg: string) => ES.find(([re]) => re.test(msg))?.[1] ?? msg

export default function AuthModal({ view, session, me, onView, onClose, onProfile }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const redirect = { emailRedirectTo: location.origin }

  const go = (v: AuthView) => { setMsg(''); onView(v) }
  const act = async (fn: () => Promise<{ error: { message: string } | null }>, ok: string, close = false) => {
    setBusy(true); setMsg('')
    const { error } = await fn()
    setBusy(false)
    if (error) setMsg(es(error.message))
    else if (close) onClose()
    else setMsg(ok)
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (view === 'login') act(() => supabase.auth.signInWithPassword({ email, password }), '', true)
    if (view === 'signup') act(() => supabase.auth.signUp({ email, password, options: redirect }), 'listo: revisa tu correo para confirmar la cuenta')
    if (view === 'magic') act(() => supabase.auth.signInWithOtp({ email, options: redirect }), 'te enviamos un enlace: ábrelo en este dispositivo')
    if (view === 'reset') act(() => supabase.auth.resetPasswordForEmail(email, { redirectTo: location.origin }), 'te enviamos un enlace para cambiar tu contraseña')
    if (view === 'newpass') act(() => supabase.auth.updateUser({ password }), 'contraseña actualizada')
  }
  const google = () => act(() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } }), '')

  const titles: Record<AuthView, string> = {
    login: 'inicia sesión', signup: 'crea tu cuenta', magic: 'entra con un enlace', reset: 'recupera tu contraseña',
    newpass: 'elige una contraseña nueva', account: 'tu cuenta', profile: 'tu perfil',
  }
  const needsEmail = view !== 'newpass' && view !== 'account' && view !== 'profile'
  const needsPass = view === 'login' || view === 'signup' || view === 'newpass'

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div className="auth card" role="dialog" aria-modal="true" aria-label={titles[view]}
        onMouseDown={e => e.stopPropagation()} onKeyDown={e => e.key === 'Escape' && onClose()}>
        <h2 className="auth-title">
          {view === 'profile' && <button onClick={() => go('account')} aria-label="volver a tu cuenta">←</button>}
          {titles[view]}
        </h2>

        {view === 'profile' && session ? (
          <>
            <ProfileEditor session={session} me={me} onSaved={onProfile} />
          </>
        ) : (
          <>
            {(view === 'login' || view === 'signup') && (
              <>
                <button className="auth-google" onClick={google} disabled={busy}>continuar con Google</button>
                <div className="auth-or"><span>o con tu correo</span></div>
              </>
            )}
            <form onSubmit={submit}>
              {needsEmail && (
                <label>correo
                  <input type="email" required autoFocus autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
                </label>
              )}
              {needsPass && (
                <label>contraseña
                  <input type="password" required minLength={8} autoFocus={view === 'newpass'}
                    autoComplete={view === 'login' ? 'current-password' : 'new-password'}
                    value={password} onChange={e => setPassword(e.target.value)} />
                </label>
              )}
              <button className="on" type="submit" disabled={busy}>
                {busy ? '…' : { login: 'entrar', signup: 'crear cuenta', magic: 'enviar enlace', reset: 'enviar enlace', newpass: 'guardar', account: '', profile: '' }[view]}
              </button>
            </form>
            <div className="auth-links">
              {view !== 'login' && view !== 'newpass' && <button onClick={() => go('login')}>ya tengo cuenta</button>}
              {view === 'login' && <button onClick={() => go('signup')}>crear cuenta</button>}
              {view !== 'magic' && view !== 'newpass' && <button onClick={() => go('magic')}>entrar sin contraseña</button>}
              {view === 'login' && <button onClick={() => go('reset')}>olvidé mi contraseña</button>}
              <a className="auth-privacy" href="/privacidad.html">privacidad</a>
            </div>
          </>
        )}
        <p className="auth-msg" role="status">{msg}</p>
      </div>
    </div>
  )
}
