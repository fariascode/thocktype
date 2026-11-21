import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

// counts from 0 up to `to` with an ease-out curve, for result numbers
export function useCountUp(to: number, ms = 700) {
  const [n, setN] = useState(() => (reducedMotion() ? to : 0))
  useEffect(() => {
    if (reducedMotion()) { setN(to); return }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms)
      setN(Math.round(to * (1 - (1 - p) ** 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, ms])
  return n
}

const EASE = 'cubic-bezier(.22, 1, .36, 1)'
type Snapshot = { w: number; h: number; pos: Map<string, { x: number; y: number }> }

// Status-bar motion, run after every render:
// - a pill slides to the selected option of each single-choice group ([data-pill] with a .seg-pill child)
// - groups that moved glide from their old spot (FLIP), and the bar's height eases instead of jumping
export function useLayoutMotion(ref: React.RefObject<HTMLElement | null>) {
  const prev = useRef<Snapshot | null>(null)
  useLayoutEffect(() => {
    const root = ref.current
    if (!root) return
    const still = reducedMotion()
    placePills(root, still)
    const groups = [...root.querySelectorAll<HTMLElement>('.seg[aria-label]')]
    const pos = new Map(groups.map(el => [el.getAttribute('aria-label')!, { x: el.offsetLeft, y: el.offsetTop }]))
    const was = prev.current
    prev.current = { w: window.innerWidth, h: root.offsetHeight, pos }
    if (!was || still || was.w !== window.innerWidth) return // first render and resizes: no motion
    for (const el of groups) {
      const old = was.pos.get(el.getAttribute('aria-label')!), now = pos.get(el.getAttribute('aria-label')!)!
      if (!old || (old.x === now.x && old.y === now.y)) continue
      el.animate([{ translate: `${old.x - now.x}px ${old.y - now.y}px` }, { translate: '0 0' }], { duration: 420, easing: EASE })
    }
    if (was.h !== root.offsetHeight) root.animate([{ height: `${was.h}px` }, { height: `${root.offsetHeight}px` }], { duration: 420, easing: EASE })
  })
  // letters change width when a font finishes loading or the window resizes: re-place the pills instantly
  useEffect(() => {
    const again = () => { if (ref.current) placePills(ref.current, true) }
    window.addEventListener('resize', again)
    document.fonts?.addEventListener('loadingdone', again)
    return () => { window.removeEventListener('resize', again); document.fonts?.removeEventListener('loadingdone', again) }
  }, [ref])
}

function placePills(root: HTMLElement, instant: boolean) {
  for (const seg of root.querySelectorAll<HTMLElement>('[data-pill]')) {
    const pill = seg.querySelector<HTMLElement>('.seg-pill'), on = seg.querySelector<HTMLElement>('button.on')
    if (!pill) continue
    if (!on) { pill.style.opacity = '0'; continue }
    const jump = instant || !pill.style.width // first placement appears in place instead of sliding in from the corner
    if (jump) pill.style.transition = 'none'
    pill.style.opacity = '1'
    pill.style.width = `${on.offsetWidth}px`
    pill.style.height = `${on.offsetHeight}px`
    pill.style.transform = `translate(${on.offsetLeft}px, ${on.offsetTop}px)`
    if (jump) { void pill.offsetWidth; pill.style.transition = '' }
  }
}
