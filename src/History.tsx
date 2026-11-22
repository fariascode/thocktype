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
  const series = useMemo(() => [{ label: 'wpm', data: last.map(r => r.wpm) }, { label: 'precisión', data: last.map(r => r.acc), dim: true }], [last])
  const tags = useMemo(() => tagStats(h), [h])
  if (!h.length) return <p className="hint">aún no hay tests. ¡a escribir!</p>
  return (
    <section className="result">
      <Records h={h} />
      <div className="card">
        <small>actividad · últimos 6 meses · racha {streak(h)} días · más larga {longestStreak(h)} días</small>
        <Calendar h={h} />
      </div>
      {tags.length > 0 && (
        <div className="card">
          <small>etiquetas · comparadas con tu promedio</small>
          <ul className="tag-stats">
            {tags.map(t => (
              <li key={t.tag}>
                <b>#{t.tag}</b>
                <span className={`tag-diff ${t.diff > 0 ? 'up' : t.diff < 0 ? 'down' : ''}`}>{t.diff > 0 ? '+' : ''}{t.diff} wpm</span>
                <span>{t.avg} wpm de promedio · mejor {t.best} · {t.acc}% · {t.tests} test{t.tests === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="card"><small>últimos 50 tests · wpm y precisión</small><Chart key={theme} labels={labels} series={series} /></div>
      <CoachCard bigrams={bigrams} title="coach · todos los tests" minN={8} onDrill={onDrill} />
      <div className="card"><small>todas las teclas</small><Heatmap hits={keys.hits} errs={keys.errs} /></div>
    </section>
  )
}
