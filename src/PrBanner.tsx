import { t } from './i18n'
import { useLayoutEffect, useRef } from 'react'
import { prCelebrate } from './fx'

// celebration shown on the result screen when a test beats your best for that exact mode
export default function PrBanner({ wpm, prev, mode }: { wpm: number; prev: number; mode: string }) {
  const box = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => { if (box.current) prCelebrate(box.current) }, [])
  const big = prev ? `+${wpm - prev}` : String(wpm)
  return (
    <div className="pr-hero" role="status" ref={box}>
      <div className="pr-burst" aria-hidden>
        <svg className="pr-star" viewBox="0 0 24 24"><path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></svg>
      </div>
      <div className="pr-text">
        <small>{t(prev ? 'nuevo récord personal' : 'primer récord en este modo')}</small>
        {/* one span per character, so each digit can bounce in on its own */}
        <b aria-label={`${big} wpm`}>{[...big].map((ch, i) => <span key={i} className="ch">{ch}</span>)} <span className="unit">wpm</span></b>
        <span className="pr-mode">{mode}{prev ? ` · ${t('antes {a} → ahora {b}', { a: prev, b: wpm })}` : ''}</span>
      </div>
    </div>
  )
}
