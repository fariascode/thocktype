import { COUNTS, DURATIONS, formatDuration, lifetime, personalBests, type Result } from './stats'

// Lifetime totals + personal bests per mode, shown in your history and on public profiles
export default function Records({ h }: { h: Result[] }) {
  const life = lifetime(h)
  const pbs = personalBests(h)
  const slot = (label: string, r?: Result) => (
    <div key={label} className={`pb-slot ${r ? '' : 'empty'}`} title={r ? new Date(r.date).toLocaleString() : 'aún sin récord'}>
      <small>{label}</small>
      {r ? (
        <>
          <b>{r.wpm}<span> wpm</span></b>
          <span className="pb-acc">{r.acc}%</span>
          <span className="pb-meta">raw {r.raw} · cons {r.cons}%</span>
          <span className="pb-meta">{new Date(r.date).toLocaleDateString()}{r.punct ? ' · @' : ''}{r.numbers ? ' · #' : ''}</span>
        </>
      ) : <b className="pb-none">—</b>}
    </div>
  )
  return (
    <>
      <div className="small">
        <div><small>tests completados</small>{life.tests}</div>
        <div><small>tiempo escribiendo</small>{formatDuration(life.seconds)}</div>
        <div><small>wpm más alto</small>{life.top}</div>
        <div><small>promedio</small>{life.avg} wpm</div>
        <div><small>últimos 10</small>{life.last10} wpm</div>
        <div><small>precisión media</small>{life.acc}%</div>
      </div>
      <div className="card">
        <small>récords personales</small>
        <div className="pb-groups">
          <div><small className="pb-group">tiempo</small><div className="pb-row">{DURATIONS.map(d => slot(`${d} s`, pbs.time[d]))}</div></div>
          <div><small className="pb-group">palabras</small><div className="pb-row">{COUNTS.map(c => slot(`${c}`, pbs.words[c]))}</div></div>
        </div>
      </div>
    </>
  )
}
