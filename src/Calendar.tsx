import { t, uiLang } from './i18n'
import { useEffect, useRef } from 'react'
import { dailyCounts, dayKey, type Result } from './stats'

const WEEKS = 26
const LEVELS = [0, 1, 3, 6, 10] // tests per day for each ink level
const level = (n: number) => LEVELS.filter(l => n >= l).length - 1
// monday, wednesday, friday, sunday initials (the other rows stay blank)
const DAYS = { es: ['l', '', 'x', '', 'v', '', 'd'], en: ['m', '', 'w', '', 'f', '', 's'] }

// GitHub-style activity grid, one column per week (monday first), ink = tests that day
export default function Calendar({ h }: { h: Result[] }) {
  // on narrow screens the grid scrolls sideways: start at the current week, not six months ago
  const wrap = useRef<HTMLDivElement>(null)
  useEffect(() => { if (wrap.current) wrap.current.scrollLeft = wrap.current.scrollWidth }, [])
  const counts = dailyCounts(h)
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7) - (WEEKS - 1) * 7) // monday, 25 weeks ago
  const cells = Array.from({ length: WEEKS * 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
  return (
    <div className="cal-wrap" ref={wrap}>
      <div className="cal">
        {DAYS[uiLang()].map((d, i) => <span key={'d' + i} className="cal-day">{d}</span>)}
        {cells.map(d => {
          const n = counts.get(dayKey(d)) ?? 0
          const future = d > today
          return (
            <span key={dayKey(d)} className={`cell l${level(n)} ${future ? 'future' : ''}`}
              title={future ? '' : `${d.toLocaleDateString()}: ${n} test${n === 1 ? '' : 's'}`} />
          )
        })}
      </div>
      <div className="cal-legend">{t('menos')} {LEVELS.map((_, i) => <span key={i} className={`cell l${i}`} />)} {t('más')}</div>
    </div>
  )
}
