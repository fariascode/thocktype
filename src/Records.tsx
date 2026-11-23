import { t } from './i18n'
import { useState } from 'react'
import { levelOf, titleFor, totalXp } from './level'
import { LevelBar } from './LevelUi'
import { BASE_LANGS, EXTRA_LANGS, LANGS, isCode, type Lang } from './words'
import { COUNTS, DURATIONS, formatDuration, lifetime, personalBests, type Result } from './stats'

// personal bests only compare like with like: pick a language and whether @ punctuation / # numbers were on
const VARIANTS = { all: 'todo', plain: 'normal', punct: '@ puntuación', numbers: '# números' } as const
type Variant = keyof typeof VARIANTS
const LISTS = { all: 'todas', 200: '200', full: '1k', 5000: '5k', 10000: '10k' } as const
type List = keyof typeof LISTS
// "código" covers every programming language
const fits = (r: Result, lang: Lang | 'all', v: Variant, list: List) => (lang === 'all' || (lang === 'code' ? isCode(r.lang) : r.lang === lang))
  && (v === 'all' || (v === 'plain' ? !r.punct && !r.numbers : !!r[v]))
  && (list === 'all' || (list === 'full' ? !r.pool : r.pool === Number(list)))

// Lifetime totals + personal bests per mode, shown in your history and on public profiles
export default function Records({ h }: { h: Result[] }) {
  const life = lifetime(h)
  const lv = levelOf(totalXp(h))
  const [lang, setLang] = useState<Lang | 'all'>('all')
  const [variant, setVariant] = useState<Variant>('all')
  const [list, setList] = useState<List>('all')
  const pbs = personalBests(h.filter(r => fits(r, lang, variant, list)))
  const slot = (label: string, r?: Result) => (
    <div key={label} className={`pb-slot ${r ? '' : 'empty'}`} title={r ? new Date(r.date).toLocaleString() : t('aún sin récord')}>
      <small>{label}</small>
      {r ? (
        <>
          <b>{r.wpm}<span> wpm</span></b>
          <span className="pb-acc">{r.acc}%</span>
          <span className="pb-meta">raw {r.raw} · cons {r.cons}%</span>
          <span className="pb-meta">{new Date(r.date).toLocaleDateString()}{lang === 'all' ? ` · ${r.lang}` : ''}{r.pool ? ' · top 200' : ''}{r.plain ? ` · ${t('sin acentos')}` : ''}{r.punct ? ' · @' : ''}{r.numbers ? ' · #' : ''}</span>
        </>
      ) : <b className="pb-none">—</b>}
    </div>
  )
  return (
    <>
      <div className="small">
        <div className="lv-tile" title={t('{into}/{need} xp para el nivel {n}', { into: lv.into, need: lv.need, n: lv.level + 1 })}>
          <small>{t('nivel')}</small>{lv.level} <span className="lv-title">{t(titleFor(lv.level))}</span><LevelBar progress={lv.progress} />
        </div>
        <div><small>{t('tests completados')}</small>{life.tests}</div>
        <div><small>{t('tiempo escribiendo')}</small>{formatDuration(life.seconds)}</div>
        <div><small>{t('wpm más alto')}</small>{life.top}</div>
        <div><small>{t('promedio')}</small>{life.avg} wpm</div>
        <div><small>{t('últimos 10')}</small>{life.last10} wpm</div>
        <div><small>{t('precisión media')}</small>{life.acc}%</div>
      </div>
      <div className="card">
        <small>{t('récords personales')}</small>
        <div className="pb-filters">
          <div className="seg" aria-label={t('idioma')}>
            {([['all', 'todos'], ...BASE_LANGS.map(l => [l, LANGS[l]]), ...Object.entries(EXTRA_LANGS)] as [Lang | 'all', string][]).map(([k, l]) =>
              <button key={k} className={k === lang ? 'on' : ''} onClick={() => setLang(k)}>{t(l)}</button>)}
          </div>
          <div className="seg" aria-label={t('variante')}>
            {(Object.keys(VARIANTS) as Variant[]).map(k =>
              <button key={k} className={k === variant ? 'on' : ''} onClick={() => setVariant(k)}>{t(VARIANTS[k])}</button>)}
          </div>
          <div className="seg" aria-label={t('lista de palabras')}>
            {(Object.keys(LISTS) as List[]).map(k =>
              <button key={k} className={k === list ? 'on' : ''} onClick={() => setList(k)}>{t(LISTS[k])}</button>)}
          </div>
        </div>
        <div className="pb-groups">
          <div><small className="pb-group">{t('tiempo')}</small><div className="pb-row">{DURATIONS.map(d => slot(`${d} s`, pbs.time[d]))}</div></div>
          <div><small className="pb-group">{t('palabras')}</small><div className="pb-row">{COUNTS.map(c => slot(`${c}`, pbs.words[c]))}</div></div>
        </div>
      </div>
    </>
  )
}
