import { t, uiLang } from './i18n'
import { THEMES, type Theme } from './appearance'

// thin line icons (24-unit grid, stroke = text color) so they match the monochrome look
const I = (d: string) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d.split('|').map(p => <path key={p} d={p} />)}</svg>
const ICONS = {
  code: I('M8 7l-5 5 5 5|M16 7l5 5-5 5'),
  x: I('M4 4l16 16|M20 4L4 20'),
  mail: I('M3 6h18v12H3z|M3 7l9 6 9-6'),
  heart: I('M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z'),
  lock: I('M6 11h12v9H6z|M8.5 11V8a3.5 3.5 0 0 1 7 0v3'),
  palette: I('M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.9 1.2-1.8-.5-1-.1-2.2 1.2-2.2H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10z|M7.5 11.5h.01|M10.5 7.5h.01|M15 8h.01'),
  branch: I('M6 4v12|M18 8a2 2 0 1 0 0-.01|M6 20a2 2 0 1 0 0-.01|M18 10c0 4-6 3-12 6'),
}
const REPO = 'https://github.com/fariascode/thocktype'

// Footer under the options: where to find the project, and what's running right now (theme and published version).
export default function SiteFooter({ theme, onTheme }: { theme: Theme; onTheme: () => void }) {
  const ext = { target: '_blank', rel: 'noopener' }
  return (
    <footer className="site-foot fade">
      <nav aria-label={t('enlaces')}>
        <a href={REPO} {...ext}>{ICONS.code}github</a>
        <a href="https://x.com/fariascode" {...ext}>{ICONS.x}x</a>
        <a href="mailto:hola@thocktype.app">{ICONS.mail}{t('contacto')}</a>
        <a href="https://ko-fi.com/farcode" {...ext}>{ICONS.heart}{t('apoyar')}</a>
        <a href={uiLang() === 'en' ? '/privacy.html' : '/privacidad.html'}>{ICONS.lock}{t('privacidad')}</a>
      </nav>
      <div className="foot-meta">
        <button onClick={onTheme} title={t('cambiar tema')}>{ICONS.palette}{t(THEMES[theme])}</button>
        <a className="ver" href={__COMMIT__ === 'dev' ? REPO : `${REPO}/commit/${__COMMIT__}`} {...ext} title={t('versión publicada · ver el cambio en GitHub')}>
          {ICONS.branch}{__COMMIT__}
        </a>
      </div>
    </footer>
  )
}
