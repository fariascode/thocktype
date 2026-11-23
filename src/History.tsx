import { t } from './i18n'
import { useMemo } from 'react'
import { longestStreak, streak, tagStats, type KeyStats, type Result } from './stats'
import Records from './Records'
import type { Bigrams } from './coach'
import Chart from './Chart'
import Heatmap from './Heatmap'
import Calendar from './Calendar'
import CoachCard from './CoachCard'

type Props = { h: Result[]; theme: string; keys: KeyStats; bigrams: Bigrams; onDrill?: (pairs: string[]) => void }

// stats, activity, progress, coach and key map; used for your own history and for public profiles
export default function History({ h, theme, keys, bigrams, onDrill }: Props) {
  const last = useMemo(() => h.slice(-50), [h])
  const labels = useMemo(() => last.map(r => new Date(r.date).toLocaleDateString()), [last])
  const series = useMemo(() => [{ label: 'wpm', data: last.map(r => r.wpm) }, { label: t('precisión'), data: last.map(r => r.acc), dim: true }], [last])
  const tags = useMemo(() => tagStats(h), [h])
  if (!h.length) return <p className="hint">{t('aún no hay tests. ¡a escribir!')}</p>
  return (
    <section className="result history">
      <Records h={h} />
      <div className="card">
        <small>{t('actividad · últimos 6 meses · racha {n} días · más larga {m} días', { n: streak(h), m: longestStreak(h) })}</small>
        <Calendar h={h} />
      </div>
      {tags.length > 0 && (
        <div className="card">
          <small>{t('etiquetas · comparadas con tu promedio')}</small>
          <ul className="tag-stats">
            {tags.map(tg => (
              <li key={tg.tag}>
                <b>#{tg.tag}</b>
                <span className={`tag-diff ${tg.diff > 0 ? 'up' : tg.diff < 0 ? 'down' : ''}`}>{tg.diff > 0 ? '+' : ''}{tg.diff} wpm</span>
                <span>{t('{avg} wpm de promedio · mejor {best} · {acc}% · {n} tests', { avg: tg.avg, best: tg.best, acc: tg.acc, n: tg.tests })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="card"><small>{t('últimos 50 tests · wpm y precisión')}</small><Chart key={theme} labels={labels} series={series} /></div>
      <CoachCard bigrams={bigrams} title={t('coach · todos los tests')} minN={8} onDrill={onDrill} />
      <div className="card"><small>{t('todas las teclas')}</small><Heatmap hits={keys.hits} errs={keys.errs} /></div>
    </section>
  )
}
