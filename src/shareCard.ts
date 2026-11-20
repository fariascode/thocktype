// Draws a shareable 1200x630 result card (the standard social preview size) in the brand's dark palette.
export type CardData = {
  wpm: number; acc: number; raw: number; cons: number
  modeLabel: string; samples: number[]; date: number; pb: boolean
}

const W = 1200, H = 630
const C = { bg: '#101113', surface: '#1a1b1e', border: '#343538', text1: '#ededed', text2: '#b6b7ba', text3: '#696b70' }

export async function renderCard(d: CardData): Promise<Blob> {
  await document.fonts?.ready // use Inter / Cascadia Code once loaded
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const g = cv.getContext('2d')!
  const sans = 'Inter, system-ui, sans-serif', mono = '"Cascadia Code", ui-monospace, monospace'

  g.fillStyle = C.bg
  g.fillRect(0, 0, W, H)
  g.fillStyle = C.surface
  g.strokeStyle = C.border
  g.lineWidth = 2
  g.beginPath(); g.roundRect(40, 40, W - 80, H - 80, 28); g.fill(); g.stroke()

  // wordmark + date
  g.textBaseline = 'alphabetic'
  g.font = `700 34px ${sans}`
  g.fillStyle = C.text1
  g.fillText('thock', 96, 118)
  const tw = g.measureText('thock').width
  g.font = `400 34px ${sans}`
  g.fillStyle = C.text3
  g.fillText('type', 96 + tw, 118)
  g.textAlign = 'right'
  g.font = `500 22px ${mono}`
  g.fillText(new Date(d.date).toLocaleDateString(), W - 96, 116)
  g.textAlign = 'left'

  // headline numbers
  const label = (t: string, x: number, y: number) => { g.font = `500 22px ${sans}`; g.fillStyle = C.text3; g.fillText(t, x, y) }
  label('wpm', 96, 220)
  g.font = `500 168px ${mono}`
  g.fillStyle = C.text1
  g.fillText(String(d.wpm), 88, 372)
  label('precisión', 560, 220)
  g.font = `500 96px ${mono}`
  g.fillStyle = C.text1
  g.fillText(`${d.acc}%`, 556, 316)

  // secondary stats
  g.font = `400 24px ${mono}`
  g.fillStyle = C.text2
  g.fillText(`raw ${d.raw}  ·  consistencia ${d.cons}%`, 560, 368)

  // sparkline of wpm per second
  if (d.samples.length > 1) {
    const x0 = 96, x1 = W - 96, y0 = 430, y1 = 520
    // scale to the run's own range so the rhythm is visible, not a flat line near the top
    const max = Math.max(...d.samples), min = Math.min(...d.samples)
    const span = Math.max(max - min, 10)
    g.strokeStyle = C.text1
    g.lineWidth = 3
    g.lineJoin = 'round'
    g.beginPath()
    d.samples.forEach((v, i) => {
      const x = x0 + ((x1 - x0) * i) / (d.samples.length - 1)
      const y = y1 - ((y1 - y0) * (v - min)) / span
      if (i) g.lineTo(x, y); else g.moveTo(x, y)
    })
    g.stroke()
  }

  // footer: mode + personal best badge
  g.font = `500 22px ${sans}`
  g.fillStyle = C.text3
  g.fillText(d.modeLabel, 96, 560)
  if (d.pb) {
    const t = 'nuevo récord'
    g.font = `600 20px ${sans}`
    const w = g.measureText(t).width + 32
    g.fillStyle = C.text1
    g.beginPath(); g.roundRect(W - 96 - w, 532, w, 38, 19); g.fill()
    g.fillStyle = C.bg
    g.textAlign = 'center'
    g.fillText(t, W - 96 - w / 2, 558)
    g.textAlign = 'left'
  }

  return new Promise((res, rej) => cv.toBlob(b => (b ? res(b) : rej(new Error('canvas export failed'))), 'image/png'))
}
