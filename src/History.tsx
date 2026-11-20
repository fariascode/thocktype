import { useMemo } from 'react'
import { longestStreak, streak, type KeyStats, type Result } from './stats'
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
  if (!h.length) return <p className="hint">aún no hay tests. ¡a escribir!</p>
  return (
    <section className="result">
      <Records h={h} />
      <div className="card">
        <small>actividad · últimos 6 meses · racha {streak(h)} días · más larga {longestStreak(h)} días</small>
        <Calendar h={h} />
      </div>
      <div className="card"><small>últimos 50 tests · wpm y precisión</small><Chart key={theme} labels={labels} series={series} /></div>
      <CoachCard bigrams={bigrams} title="coach · todos los tests" minN={8} onDrill={onDrill} />
      <div className="card"><small>todas las teclas</small><Heatmap hits={keys.hits} errs={keys.errs} /></div>
    </section>
  )
}
