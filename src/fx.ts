// Choreographed animations with anime.js, loaded on demand (the typing screen never needs it).
// Everything stays visible if the library can't load or the system asks for reduced motion.
import { reducedMotion } from './motion'

let lib: Promise<typeof import('./fxLib')> | null = null
export const preloadFx = () => (lib ??= import('./fxLib'))

// hide now (before paint), animate in once the library is ready; restore if anything goes wrong
async function run(targets: HTMLElement[], play: (a: typeof import('./fxLib')) => void) {
  if (reducedMotion() || !targets.length) return
  targets.forEach(t => { t.style.opacity = '0' })
  try { play(await preloadFx()) } catch { targets.forEach(t => { t.style.opacity = '' }) }
}

// result screen: sections rise in sequence, the big numbers land with a soft spring
export function resultIntro(root: HTMLElement) {
  const parts = [...root.children] as HTMLElement[]
  const big = [...root.querySelectorAll<HTMLElement>('.big b')]
  return run(parts, ({ animate, stagger, spring }) => {
    animate(parts, { opacity: [0, 1], translateY: [18, 0], delay: stagger(65), duration: 750, ease: 'outExpo' })
    animate(big, { scale: [0.82, 1], delay: stagger(90, { start: 120 }), ease: spring({ stiffness: 170, damping: 11 }) })
  })
}

// personal best: the star draws itself, the gain bounces in letter by letter, sparks burst out with real physics
export function prCelebrate(root: HTMLElement) {
  const star = root.querySelector<SVGPathElement>('.pr-star path')
  const digits = [...root.querySelectorAll<HTMLElement>('.pr-text .ch')]
  const burst = root.querySelector<HTMLElement>('.pr-burst')
  return run([root], ({ createTimeline, createDrawable, stagger, spring, utils }) => {
    root.style.opacity = ''
    const tl = createTimeline({ defaults: { ease: 'outExpo' } })
    tl.add(root, { opacity: [0, 1], scale: [0.94, 1], translateY: [10, 0], duration: 600 })
    if (star) tl.add(createDrawable(star), { draw: ['0 0', '0 1'], duration: 700, ease: 'inOutQuad' }, '-=350')
    if (star) tl.add(star, { fillOpacity: [0, 1], duration: 300 }, '-=120')
    if (digits.length) tl.add(digits, { translateY: ['0.6em', '0em'], opacity: [0, 1], delay: stagger(45), ease: spring({ stiffness: 220, damping: 12 }) }, 250)
    if (burst) { // sparks: each flies out at its own angle and distance, then fades
      burst.querySelectorAll('.spark').forEach(n => n.remove()) // a re-run must not double them
      const sparks = Array.from({ length: 18 }, () => burst.appendChild(Object.assign(document.createElement('i'), { className: 'spark' })))
      tl.add(sparks, {
        x: () => utils.random(-70, 70), y: () => utils.random(-55, 55), scale: [1, 0], opacity: [1, 0],
        duration: () => utils.random(700, 1100), ease: 'outQuart', delay: stagger(12),
      }, 520)
    }
  })
}

// logo intro, once per session: "thocktype" gets typed letter by letter, each key with a small press, then a caret blinks out
export function logoIntro(logo: HTMLElement) {
  let seen = false
  try { seen = !!sessionStorage.getItem('thocktype.intro'); sessionStorage.setItem('thocktype.intro', '1') } catch { /* storage blocked */ }
  if (seen) return
  const letters = [...logo.querySelectorAll<HTMLElement>('.lg')]
  const caret = logo.querySelector<HTMLElement>('.lg-caret')
  return run(letters, ({ createTimeline, stagger, spring }) => {
    const tl = createTimeline()
    tl.add(letters, { opacity: [0, 1], translateY: ['-0.18em', '0em'], scale: [0.86, 1], delay: stagger(55), ease: spring({ stiffness: 260, damping: 14 }) })
    if (caret) tl.add(caret, { opacity: [0, 1, 0, 1, 0], duration: 900, ease: 'steps(4)' }, '-=150')
  })
}

// hover: a soft wave runs through the letters
export function logoWave(logo: HTMLElement) {
  if (reducedMotion()) return
  preloadFx().then(({ animate, stagger }) => animate(logo.querySelectorAll('.lg'), {
    translateY: [0, '-0.12em', 0], delay: stagger(30), duration: 420, ease: 'inOutSine',
  })).catch(() => {})
}
