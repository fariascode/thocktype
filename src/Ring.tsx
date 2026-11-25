import { useEffect, useState } from 'react'
import { reducedMotion } from './motion'

// Percentage ring: a faint track and an arc that sweeps from 0 to the value once it appears.
// The arc starts at 12 o'clock; tick marks every 10% give it the look of a gauge.
export default function Ring({ value, size = 88, label }: { value: number; size?: number; label?: string }) {
  const [shown, setShown] = useState(reducedMotion() ? value : 0)
  useEffect(() => {
    if (reducedMotion()) { setShown(value); return }
    const id = requestAnimationFrame(() => setShown(value)) // next frame, so the CSS transition has a start
    return () => cancelAnimationFrame(id)
  }, [value])
  const r = 42, c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, shown))
  return (
    <svg className="ring" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={label ?? `${Math.round(value)}%`}>
      {Array.from({ length: 10 }, (_, i) => (
        <line key={i} className="ring-tick" x1="50" y1="2" x2="50" y2="5" transform={`rotate(${i * 36} 50 50)`} />
      ))}
      <circle className="ring-track" cx="50" cy="50" r={r} />
      <circle className="ring-arc" cx="50" cy="50" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} transform="rotate(-90 50 50)" />
    </svg>
  )
}
