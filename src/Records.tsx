import { useState } from 'react'
import { LANGS, type Lang } from './words'
import { COUNTS, DURATIONS, formatDuration, lifetime, personalBests, type Result } from './stats'

// personal bests only compare like with like: pick a language and whether @ punctuation / # numbers were on
const VARIANTS = { all: 'todo', plain: 'normal', punct: '@ puntuación', numbers: '# números' } as const
type Variant = keyof typeof VARIANTS
const fits = (r: Result, lang: Lang | 'all', v: Variant) => (lang === 'all' || r.lang === lang)
  && (v === 'all' || (v === 'plain' ? !r.punct && !r.numbers : !!r[v]))

// Lifetime totals + personal bests per mode, shown in your history and on public profiles
export default function Records({ h }: { h: Result[] }) {
  const life = lifetime(h)
  const [lang, setLang] = useState<Lang | 'all'>('all')
  const [variant, setVariant] = useState<Variant>('all')
  const pbs = personalBests(h.filter(r => fits(r, lang, variant)))
  const slot = (label: string, r?: Result) => (
    <div key={label} className={`pb-slot ${r ? '' : 'empty'}`} title={r ? new Date(r.date).toLocaleString() : 'aún sin récord'}>
      <small>{label}</small>
      {r ? (
        <>
          <b>{r.wpm}<span> wpm</span></b>
          <span className="pb-acc">{r.acc}%</span>
          <span className="pb-meta">raw {r.raw} · cons {r.cons}%</span>
          <span className="pb-meta">{new Date(r.date).toLocaleDateString()}{lang === 'all' ? ` · ${r.lang}` : ''}{r.punct ? ' · @' : ''}{r.numbers ? ' · #' : ''}</span>
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
        <div className="pb-filters">
          <div className="seg" aria-label="idioma">
            {([['all', 'todos'], ...Object.entries(LANGS)] as [Lang | 'all', string][]).map(([k, l]) =>
              <button key={k} className={k === lang ? 'on' : ''} onClick={() => setLang(k)}>{l}</button>)}
          </div>
          <div className="seg" aria-label="variante">
            {(Object.keys(VARIANTS) as Variant[]).map(k =>
              <button key={k} className={k === variant ? 'on' : ''} onClick={() => setVariant(k)}>{VARIANTS[k]}</button>)}
          </div>
        </div>
        <div className="pb-groups">
          <div><small className="pb-group">tiempo</small><div className="pb-row">{DURATIONS.map(d => slot(`${d} s`, pbs.time[d]))}</div></div>
          <div><small className="pb-group">palabras</small><div className="pb-row">{COUNTS.map(c => slot(`${c}`, pbs.words[c]))}</div></div>
        </div>
      </div>
    </>
  )
}
