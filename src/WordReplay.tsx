import { useEffect, useMemo, useRef, useState } from 'react'
import { slowest, stateAt, wordStats, type LogEntry } from './replay'
import { reducedMotion } from './motion'

type Props = { log: LogEntry[]; targets: string[]; pb: number; onDrillWords: (words: string[]) => void }

// Result screen: every word with its speed and mistakes, a replay of the test, and practice for the slowest words
export default function WordReplay({ log, targets, pb, onDrillWords }: Props) {
  const stats = useMemo(() => wordStats(log, targets), [log, targets])
  const slow = useMemo(() => slowest(stats), [stats])
  const median = useMemo(() => { const w = stats.map(s => s.wpm).sort((a, b) => a - b); return w[Math.floor(w.length / 2)] ?? 0 }, [stats])
  const total = log.length ? log[log.length - 1][0] : 0
  const finalCount = useMemo(() => stateAt(log, Infinity).length, [log])
  const [t, setT] = useState<number | null>(null) // null = show the finished test
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [picked, setPicked] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)

  // replay clock: advances with real time × speed and stops at the end
  useEffect(() => {
    if (!playing) return
    let raf = 0, last = performance.now()
    const step = (now: number) => {
      const dt = (now - last) * speed
      last = now
      setT(prev => {
        const next = (prev ?? 0) + dt
        if (next >= total) { setPlaying(false); return total }
        return next
      })
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, total])

  const typed = t === null ? stateAt(log, Infinity) : stateAt(log, t)
  const cur = typed.length - 1
  // the PB ghost during the replay: how many characters it has typed by now
  let ghostWord = -1, ghostChar = 0
  if (t !== null && pb > 0) {
    let chars = (pb * 5 * t) / 60000
    ghostWord = 0
    while (ghostWord < targets.length - 1 && chars > targets[ghostWord].length) { chars -= targets[ghostWord].length + 1; ghostWord++ }
    ghostChar = Math.floor(chars)
  }
  useEffect(() => { // keep the word being replayed in view
    if (t === null) return
    box.current?.querySelector('.rp-word.now')?.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' })
  }, [cur, t])

  if (!stats.length) return null
  const shown = targets.slice(0, Math.max(finalCount, stats.length)) // same words as the test; pending ones stay dim during the replay
  const play = () => { if (t === null || t >= total) setT(0); setPicked(null); setPlaying(true) }
  const s = picked !== null ? stats[picked] : null

  return (
    <div className="card replay">
      <div className="rp-head">
        <small>palabra por palabra · toca una para ver el detalle</small>
        <div className="rp-controls">
          <button onClick={() => (playing ? setPlaying(false) : play())} aria-label={playing ? 'pausar' : 'repetir el test'}>
            {playing ? '❚❚ pausa' : t !== null && t < total ? '▶ seguir' : '▶ repetir'}
          </button>
          {[1, 2].map(x => <button key={x} className={speed === x ? 'on' : ''} onClick={() => setSpeed(x)}>{x}×</button>)}
          <input type="range" className="set-range rp-scrub" min={0} max={total} value={t ?? total} aria-label="posición de la repetición"
            onChange={e => { setPlaying(false); setT(Number(e.target.value)) }} />
          {t !== null && <button onClick={() => { setPlaying(false); setT(null) }} aria-label="ver el test terminado">✕</button>}
        </div>
      </div>

      <div className="rp-words" ref={box}>
        {shown.map((w, wi) => {
          const tw = typed[wi] ?? ''
          const st = stats[wi]
          const pace = t === null && st ? (st.wpm < median * 0.7 ? 'slow' : st.wpm > median * 1.3 ? 'fast' : '') : ''
          const wrong = wi < cur && tw !== w
          return (
            <span key={wi} className={`rp-word word ${pace} ${wrong ? 'wrong' : ''} ${wi === cur && t !== null ? 'now' : ''} ${picked === wi ? 'picked' : ''} ${st?.corrected ? 'fixed' : ''}`}
              onClick={() => st && setPicked(picked === wi ? null : wi)} title={st ? `${st.wpm} wpm${st.errors ? ` · ${st.errors} error${st.errors > 1 ? 'es' : ''}` : ''}` : undefined}>
              {[...w].map((ch, ci) => (
                <span key={ci} className={`c ${ci < tw.length ? (tw[ci] === ch ? 'ok' : 'bad') : ''} ${wi === cur && ci === tw.length && t !== null ? 'rp-caret' : ''} ${wi === ghostWord && ci === ghostChar ? 'rp-ghost' : ''}`}>{ch}</span>
              ))}
              {[...tw.slice(w.length)].map((ch, ci) => <span key={'x' + ci} className="c extra">{ch}</span>)}
            </span>
          )
        })}
      </div>

      <p className="rp-detail" aria-live="polite">
        {s ? <>
          <b>{s.word}</b> · {s.wpm} wpm {s.wpm < median ? `(${median - s.wpm} menos que tu mediana)` : ''}
          {s.errors ? ` · ${s.errors} error${s.errors > 1 ? 'es' : ''}${s.corrected ? ', corregido' : ''}` : ' · sin errores'}
          {s.typed !== s.word && <> · escribiste <b className="rp-typed">{s.typed || '—'}</b></>}
        </> : t === null ? <>subrayado fuerte: palabras lentas · tenue: rápidas · mediana {median} wpm</>
          : <>repitiendo · {Math.round(t / 100) / 10}s de {Math.round(total / 100) / 10}s{pb ? ` · la marca ▏ es tu récord (${pb} wpm)` : ''}</>}
      </p>

      {slow.length > 1 && (
        <div className="rp-slow">
          <small>tus palabras más lentas</small>
          <div className="rp-chips">{slow.map(x => <span key={x.word} className="tag-chip">{x.word} · {x.wpm}</span>)}</div>
          <button className="on" onClick={() => onDrillWords(slow.map(x => x.word))}>practicar estas palabras</button>
        </div>
      )}
    </div>
  )
}
