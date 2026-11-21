import { useCountUp } from './motion'

// celebration shown on the result screen when a test beats your best for that exact mode
export default function PrBanner({ wpm, prev, mode }: { wpm: number; prev: number; mode: string }) {
  const gain = useCountUp(wpm - prev, 900)
  return (
    <div className="pr-hero" role="status">
      <div className="pr-burst" aria-hidden>{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--a': `${i * (360 / 14)}deg`, '--d': `${i % 3}` } as React.CSSProperties} />)}</div>
      <div className="pr-text">
        <small>{prev ? 'nuevo récord personal' : 'primer récord en este modo'}</small>
        <b>{prev ? <>+{gain} <span>wpm</span></> : <>{wpm} <span>wpm</span></>}</b>
        <span className="pr-mode">{mode}{prev ? ` · antes ${prev} → ahora ${wpm}` : ''}</span>
      </div>
    </div>
  )
}
