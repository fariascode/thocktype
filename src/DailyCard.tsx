import { useState } from 'react'
import { dailyStreak, loadDaily, shareText, type DailyEntry } from './daily'
import { copyText } from './share'
import type { Lang } from './words'

type Props = { n: number; lang: Lang; official: boolean; entry: DailyEntry }

export default function DailyCard({ n, lang, official, entry }: Props) {
  const [copied, setCopied] = useState('')
  const streak = dailyStreak(loadDaily())
  return (
    <div className="card daily">
      <small>reto #{n} · {official ? 'intento oficial' : 'práctica · tu intento oficial de hoy fue este'}</small>
      <div className="daily-row">
        <div className="daily-grid" aria-label={`${entry.grid.split('■').length - 1} palabras correctas`}>
          {entry.grid.split('\n').map((row, i) => (
            <div key={i}>{[...row].map((c, j) => <span key={j} className={c === '■' ? 'on' : ''} />)}</div>
          ))}
        </div>
        <div className="daily-stats">
          <div><small>wpm</small><b>{entry.wpm}</b></div>
          <div><small>precisión</small><b>{entry.acc}%</b></div>
          <div><small>racha de retos</small><b>{streak}</b></div>
        </div>
      </div>
      <div className="share">
        <button onClick={async () => setCopied((await copyText(shareText(n, lang, entry))) ? 'copiado: pégalo donde quieras' : 'no se pudo copiar')}>⧉ copiar resultado del reto</button>
        <span className="share-status" role="status">{copied}</span>
      </div>
      <p className="hint" style={{ textAlign: 'left' }}>vuelve mañana para el reto #{n + 1}</p>
    </div>
  )
}
