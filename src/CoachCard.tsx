import { coachTip, slowBigrams, type Bigrams } from './coach'

type Props = { bigrams: Bigrams; title: string; minN?: number; onDrill?: (pairs: string[]) => void }

// Shows the letter pairs that cost you the most time, with a one-click drill
export default function CoachCard({ bigrams, title, minN = 2, onDrill }: Props) {
  const ins = slowBigrams(bigrams, minN)
  const samples = Object.values(bigrams).reduce((s, e) => s + e.n, 0)
  if (samples < 10) return null // not enough letters typed to say anything useful
  const max = Math.max(...ins.map(x => x.ratio), 1)
  return (
    <div className="card coach">
      <small>{title}</small>
      <p className="coach-tip">{coachTip(ins)}</p>
      {ins.length > 0 && (
        <ul className="coach-list">
          {ins.map(x => (
            <li key={x.pair}>
              <b>{x.pair}</b>
              <span className="coach-bar"><span style={{ width: `${(x.ratio / max) * 100}%` }} /></span>
              <span className="coach-ms">{Math.round(x.avg)} ms · {x.ratio.toFixed(1)}×</span>
            </li>
          ))}
        </ul>
      )}
      {onDrill && ins.length > 0 && (
        <div><button className="on" onClick={() => onDrill(ins.map(x => x.pair))}>practicar {ins.map(x => `«${x.pair}»`).join(' ')}</button></div>
      )}
    </div>
  )
}
