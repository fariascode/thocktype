// Keybr-inspired weak-key map: darker key = higher error rate on that key
const ROWS = ['qwertyuiop', 'asdfghjklñ', 'zxcvbnm,.']

type Props = { hits: Record<string, number>; errs: Record<string, number> }

export default function Heatmap({ hits, errs }: Props) {
  const worst = Object.keys(errs)
    .filter(k => hits[k] >= 3)
    .sort((a, b) => errs[b] / hits[b] - errs[a] / hits[a])
    .slice(0, 3)
  return (
    <div className="heat">
      {ROWS.map((row, ri) => (
        <div key={row} className="heat-row" style={{ paddingLeft: ri * 18 }}>
          {[...row].map(k => {
            const rate = hits[k] ? (errs[k] ?? 0) / hits[k] : 0
            const pct = Math.min(100, Math.round(rate * 300)) // 33%+ error rate = full ink
            return (
              <span key={k} className={`key ${hits[k] ? '' : 'unused'} ${pct > 50 ? 'inv' : ''}`}
                style={{ background: `color-mix(in srgb, var(--fg) ${pct}%, transparent)` }}
                title={hits[k] ? `${k}: ${errs[k] ?? 0}/${hits[k]} errores` : k}>{k}</span>
            )
          })}
        </div>
      ))}
      <p className="hint">{worst.length ? <>teclas a practicar: <b>{worst.join(' ')}</b></> : 'sin teclas débiles en este test'}</p>
    </div>
  )
}
