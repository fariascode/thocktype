import { useEffect, useState } from 'react'
import { levelOf, titleFor } from './level'
import { reducedMotion, useCountUp } from './motion'

// thin progress track toward the next level
export const LevelBar = ({ progress }: { progress: number }) => (
  <span className="lv-bar" aria-hidden><span style={{ transform: `scaleX(${progress})` }} /></span>
)

// header chip: level number with its progress underneath
export function LevelChip({ xp, onClick }: { xp: number; onClick: () => void }) {
  const l = levelOf(xp)
  return (
    <button className="lv-chip" onClick={onClick} title={`nivel ${l.level} · ${titleFor(l.level)} · ${l.into}/${l.need} xp para el siguiente`}>
      nv {l.level}<LevelBar progress={l.progress} />
    </button>
  )
}

// result screen: xp earned, the bar filling from where you were, and a flourish when you level up
export function XpCard({ before, gained }: { before: number; gained: number }) {
  const from = levelOf(before), to = levelOf(before + gained)
  const up = to.level > from.level
  const shown = useCountUp(gained, 900)
  // start at the old progress (or empty if you levelled up), then let the CSS transition fill it
  const [p, setP] = useState(up ? 0 : from.progress)
  useEffect(() => {
    if (reducedMotion()) { setP(to.progress); return }
    const id = setTimeout(() => setP(to.progress), 350)
    return () => clearTimeout(id)
  }, [to.progress])
  return (
    <div className={`card xp-card ${up ? 'level-up' : ''}`}>
      <div className="xp-head">
        <small>{up ? `¡subiste a nivel ${to.level}!` : `nivel ${to.level} · ${titleFor(to.level)}`}</small>
        <b>+{shown} <span>xp</span></b>
      </div>
      <span className="lv-bar big-bar" aria-hidden><span style={{ transform: `scaleX(${p})` }} /></span>
      <span className="xp-next">{to.need - to.into} xp para nivel {to.level + 1}</span>
    </div>
  )
}
