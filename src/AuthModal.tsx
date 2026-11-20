import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type AuthView = 'login' | 'signup' | 'magic' | 'reset' | 'newpass' | 'account'
type Props = { view: AuthView; session: Session | null; syncState: string; onView: (v: AuthView) => void; onClose: () => void }
const SYNC: Record<string, string> = {
  syncing: 'sincronizando tus tests…', ok: 'tus tests están guardados en la nube',
  error: 'sin conexión con la nube: tus tests se guardan aquí y se subirán después', idle: '',
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
const es = (msg: string) => ES.find(([re]) => re.test(msg))?.[1] ?? msg

export default function AuthModal({ view, session, syncState, onView, onClose }: Props) {
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
    newpass: 'elige una contraseña nueva', account: 'tu cuenta',
  }
  const needsEmail = view !== 'newpass' && view !== 'account'
  const needsPass = view === 'login' || view === 'signup' || view === 'newpass'

  return (
    <div className="palette-backdrop" onMouseDown={onClose}>
      <div className="auth card" role="dialog" aria-modal="true" aria-label={titles[view]}
        onMouseDown={e => e.stopPropagation()} onKeyDown={e => e.key === 'Escape' && onClose()}>
        <h2>{titles[view]}</h2>

        {view === 'account' && session ? (
          <>
            <p className="auth-note">conectado como <b>{session.user.email}</b></p>
            <p className="auth-note">{SYNC[syncState]}</p>
            <button onClick={() => act(() => supabase.auth.signOut(), '', true)} disabled={busy}>cerrar sesión</button>
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
                {busy ? '…' : { login: 'entrar', signup: 'crear cuenta', magic: 'enviar enlace', reset: 'enviar enlace', newpass: 'guardar', account: '' }[view]}
              </button>
            </form>
            <div className="auth-links">
              {view !== 'login' && view !== 'newpass' && <button onClick={() => go('login')}>ya tengo cuenta</button>}
              {view === 'login' && <button onClick={() => go('signup')}>crear cuenta</button>}
              {view !== 'magic' && view !== 'newpass' && <button onClick={() => go('magic')}>entrar sin contraseña</button>}
              {view === 'login' && <button onClick={() => go('reset')}>olvidé mi contraseña</button>}
            </div>
          </>
        )}
        <p className="auth-msg" role="status">{msg}</p>
      </div>
    </div>
  )
}
