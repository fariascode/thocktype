import { t } from './i18n'
// On-screen keyboard during the test: "siguiente" lights the key to press next, "reacción" flashes what you pressed
const ROWS = ['qwertyuiop', 'asdfghjklñ', 'zxcvbnm,.']

type Props = { mode: 'next' | 'react'; next?: string; pressed?: { key: string; ok: boolean; n: number } }

export default function Keymap({ mode, next, pressed }: Props) {
  const want = next?.toLowerCase()
  return (
    <div className="keymap" aria-hidden>
      {ROWS.map((row, ri) => (
        <div key={row} className="heat-row" style={{ paddingLeft: ri * 18 }}>
          {[...row].map(k => {
            const hit = mode === 'react' && pressed?.key === k
            // n in the key forces a remount, so the flash replays on repeated presses of the same key
            return <span key={hit ? `${k}${pressed!.n}` : k} className={`key ${mode === 'next' && want === k ? 'want' : ''} ${hit ? (pressed!.ok ? 'hit' : 'miss') : ''}`}>{k}</span>
          })}
        </div>
      ))}
      <div className="heat-row"><span className={`key space ${mode === 'next' && want === ' ' ? 'want' : ''}`}>{t('espacio')}</span></div>
    </div>
  )
}
