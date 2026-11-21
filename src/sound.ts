// Synthesized "thock": short low-passed noise burst, no audio files needed
let ctx: AudioContext | null = null

export function thock(error = false) {
  try {
    ctx ??= new AudioContext()
    const len = Math.floor(ctx.sampleRate * 0.04)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = error ? 0.6 : 0.9 + Math.random() * 0.2
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = error ? 500 : 1100
    const g = ctx.createGain()
    g.gain.value = 0.6
    src.connect(f).connect(g).connect(ctx.destination)
    src.start()
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
