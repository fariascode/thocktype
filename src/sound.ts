// Synthesized key sounds: short filtered noise bursts, no audio files needed
import type { SoundKind } from './appearance'
let ctx: AudioContext | null = null

// [burst length s, playback rate, filter type, filter Hz, gain]
const KINDS: Record<SoundKind, [number, number, BiquadFilterType, number, number]> = {
  thock: [0.04, 0.9, 'lowpass', 1100, 0.6],      // deep, muted keyboard
  click: [0.018, 1.5, 'highpass', 2200, 0.45],   // crisp clicky switch
  typewriter: [0.05, 1.1, 'bandpass', 1800, 0.8], // metallic strike
  soft: [0.03, 0.7, 'lowpass', 600, 0.5],        // barely-there tap
}

export function thock(error = false, kind: SoundKind = 'thock', volume = 1) {
  try {
    ctx ??= new AudioContext()
    const [secs, rate, type, hz, gain] = KINDS[kind] ?? KINDS.thock
    const len = Math.floor(ctx.sampleRate * secs)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = error ? rate * 0.6 : rate * (0.9 + Math.random() * 0.2)
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = error ? hz * 0.45 : hz
    const g = ctx.createGain()
    g.gain.value = gain * volume
    src.connect(f).connect(g).connect(ctx.destination)
    src.start()
  } catch { /* audio unavailable: stay silent */ }
}

// last seconds of a timed test: a short, soft high beep
export function tick(volume = 1) {
  try {
    ctx ??= new AudioContext()
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime
    o.type = 'sine'; o.frequency.value = 1320
    g.gain.setValueAtTime(0.12 * volume, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
    o.connect(g).connect(ctx.destination)
    o.start(t); o.stop(t + 0.09)
  } catch { /* audio unavailable: stay silent */ }
}

// personal best: two soft rising sine notes (a fifth apart)
export function chime() {
  try {
    ctx ??= new AudioContext()
    const now = ctx.currentTime
    ;[660, 990].forEach((hz, i) => {
      const o = ctx!.createOscillator(), g = ctx!.createGain(), t = now + i * 0.11
      o.type = 'sine'; o.frequency.value = hz
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.18, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
      o.connect(g).connect(ctx!.destination)
      o.start(t); o.stop(t + 0.62)
    })
  } catch { /* audio unavailable: stay silent */ }
}
