import { useMemo } from 'react'
import { DURATIONS, longestStreak, streak, type KeyStats, type Result } from './stats'
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
  if (!h.length) return <p className="hint">aún no hay tests. ¡a escribir!</p>
  const avg = Math.round(h.reduce((a, r) => a + r.wpm, 0) / h.length)
  const timed = h.filter(r => (r.mode ?? 'time') === 'time')
  return (
    <section className="result">
      <div className="small">
        <div><small>tests</small>{h.length}</div>
        <div><small>promedio</small>{avg} wpm</div>
        <div><small>racha</small>{streak(h)} días</div>
        <div><small>racha más larga</small>{longestStreak(h)} días</div>
        {DURATIONS.map(d => {
          const best = Math.max(0, ...timed.filter(r => r.duration === d).map(r => r.wpm))
          return <div key={d}><small>mejor {d}s</small>{best || '-'}</div>
        })}
      </div>
      <div className="card"><small>actividad · últimos 6 meses</small><Calendar h={h} /></div>
      <div className="card"><small>últimos 50 tests · wpm y precisión</small><Chart key={theme} labels={labels} series={series} /></div>
      <CoachCard bigrams={bigrams} title="coach · todos los tests" minN={8} onDrill={onDrill} />
      <div className="card"><small>todas las teclas</small><Heatmap hits={keys.hits} errs={keys.errs} /></div>
    </section>
  )
}
