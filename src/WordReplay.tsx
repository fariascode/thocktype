import { t as tr } from './i18n'
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
  const top = Math.max(1, ...stats.map(x => x.wpm))

  return (
    <div className="card replay">
      <div className="rp-head">
        <small>{tr('palabra por palabra · toca una para ver el detalle')}</small>
        <div className="rp-controls">
          <button onClick={() => (playing ? setPlaying(false) : play())} aria-label={tr(playing ? 'pausar' : 'repetir el test')}>
            {playing ? `❚❚ ${tr('pausa')}` : t !== null && t < total ? `▶ ${tr('seguir')}` : `▶ ${tr('repetir')}`}
          </button>
          {[1, 2].map(x => <button key={x} className={speed === x ? 'on' : ''} onClick={() => setSpeed(x)}>{x}×</button>)}
          <input type="range" className="set-range rp-scrub" min={0} max={total} value={t ?? total} aria-label={tr('posición de la repetición')}
            onChange={e => { setPlaying(false); setT(Number(e.target.value)) }} />
          {t !== null && <button onClick={() => { setPlaying(false); setT(null) }} aria-label={tr('ver el test terminado')}>✕</button>}
        </div>
      </div>

      {/* one bar per word: height = speed, a tick at your median, the fastest word glows; tap a bar for its detail */}
      <div className="rp-bars" role="group" aria-label={tr('velocidad de cada palabra')} style={{ '--med': `${(median / top) * 100}%` } as React.CSSProperties}>
        {stats.map((st, wi) => (
          <button key={wi} className={`rp-bar ${st.wpm === top ? 'top' : ''} ${st.wpm < median * 0.7 ? 'slow' : ''} ${picked === wi ? 'picked' : ''} ${wi === cur && t !== null ? 'now' : ''}`}
            style={{ '--h': `${Math.max(6, (st.wpm / top) * 100)}%`, '--i': wi } as React.CSSProperties}
            onClick={() => setPicked(picked === wi ? null : wi)} aria-label={`${st.word} · ${st.wpm} wpm`} title={`${st.word} · ${st.wpm} wpm`} />
        ))}
      </div>

      <div className="rp-words" ref={box}>
        {shown.map((w, wi) => {
          const tw = typed[wi] ?? ''
          const st = stats[wi]
          const pace = t === null && st ? (st.wpm < median * 0.7 ? 'slow' : st.wpm > median * 1.3 ? 'fast' : '') : ''
          const wrong = wi < cur && tw !== w
          return (
            <span key={wi} className={`rp-word word ${pace} ${wrong ? 'wrong' : ''} ${wi === cur && t !== null ? 'now' : ''} ${picked === wi ? 'picked' : ''} ${st?.corrected ? 'fixed' : ''}`}
              onClick={() => st && setPicked(picked === wi ? null : wi)} title={st ? `${st.wpm} wpm${st.errors ? ` · ${tr('{n} errores', { n: st.errors })}` : ''}` : undefined}>
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
          <b>{s.word}</b> · {s.wpm} wpm {s.wpm < median ? `(${tr('{n} menos que tu mediana', { n: median - s.wpm })})` : ''}
          {s.errors ? ` · ${tr('{n} errores', { n: s.errors })}${s.corrected ? `, ${tr('corregido')}` : ''}` : ` · ${tr('sin errores')}`}
          {s.typed !== s.word && <> · {tr('escribiste')} <b className="rp-typed">{s.typed || '—'}</b></>}
        </> : t === null ? <>{tr('subrayado fuerte: palabras lentas · tenue: rápidas · mediana {n} wpm', { n: median })}</>
          : <>{tr('repitiendo · {a}s de {b}s', { a: Math.round(t / 100) / 10, b: Math.round(total / 100) / 10 })}{pb ? ` · ${tr('la marca ▏ es tu récord ({n} wpm)', { n: pb })}` : ''}</>}
      </p>

      {slow.length > 1 && (
        <div className="rp-slow">
          <small>{tr('tus palabras más lentas')}</small>
          <div className="rp-chips">{slow.map(x => <span key={x.word} className="tag-chip">{x.word} · {x.wpm}</span>)}</div>
          <button className="on" onClick={() => onDrillWords(slow.map(x => x.word))}>{tr('practicar estas palabras')}</button>
        </div>
      )}
    </div>
  )
}
