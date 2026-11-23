import { t } from './i18n'
import { useState } from 'react'
import { dailyStreak, loadDaily, shareText, type DailyEntry } from './daily'
import { copyText } from './share'
import type { Lang } from './words'
import DailyRanking from './DailyRanking'
import { dayKey } from './stats'

export type RankProps = { uid?: string; hasUsername: boolean; refresh?: unknown; onOpenProfile: (username: string) => void }
type Props = { n: number; lang: Lang; official: boolean; entry: DailyEntry; rank: RankProps }

export default function DailyCard({ n, lang, official, entry, rank }: Props) {
  const [copied, setCopied] = useState('')
  const streak = dailyStreak(loadDaily())
  return (
    <div className="card daily">
      <small>{t('reto #{n}', { n })} · {t(official ? 'intento oficial' : 'práctica · tu intento oficial de hoy fue este')}</small>
      <div className="daily-row">
        <div className="daily-grid" aria-label={t('{n} palabras correctas', { n: entry.grid.split('■').length - 1 })}>
          {entry.grid.split('\n').map((row, i) => (
            <div key={i}>{[...row].map((c, j) => <span key={j} className={c === '■' ? 'on' : ''} />)}</div>
          ))}
        </div>
        <div className="daily-stats">
          <div><small>wpm</small><b>{entry.wpm}</b></div>
          <div><small>{t('precisión')}</small><b>{entry.acc}%</b></div>
          <div><small>{t('racha de retos')}</small><b>{streak}</b></div>
        </div>
      </div>
      <div className="share">
        <button onClick={async () => setCopied(t((await copyText(shareText(n, lang, entry, t('reto')))) ? 'copiado: pégalo donde quieras' : 'no se pudo copiar'))}>⧉ {t('copiar resultado del reto')}</button>
        <span className="share-status" role="status">{copied}</span>
      </div>
      <small>{t('ranking de hoy')}</small>
      <DailyRanking day={dayKey(new Date())} lang={lang} {...rank} />
      <p className="hint" style={{ textAlign: 'left' }}>{t('vuelve mañana para el reto #{n}', { n: n + 1 })}</p>
    </div>
  )
}
