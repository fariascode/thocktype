import { useEffect, useRef } from 'react'
import { Chart as C, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip } from 'chart.js'

C.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip)

type Props = { labels: (string | number)[]; series: { label: string; data: number[]; dim?: boolean }[] }

export default function Chart({ labels, series }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const fg = getComputedStyle(document.documentElement).getPropertyValue('--fg').trim()
    const dim = getComputedStyle(document.documentElement).getPropertyValue('--dim').trim()
    const chart = new C(ref.current!, {
      type: 'line',
      data: {
        labels,
        datasets: series.map(s => ({
          label: s.label, data: s.data, borderColor: s.dim ? dim : fg, backgroundColor: s.dim ? dim : fg,
          borderWidth: 2, pointRadius: 2, tension: 0.3, borderDash: s.dim ? [4, 4] : [],
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          x: { ticks: { color: dim }, grid: { color: 'transparent' } },
          y: { beginAtZero: true, ticks: { color: dim }, grid: { color: dim + '33' } },
        },
      },
    })
    return () => chart.destroy()
  }, [labels, series])
  return <div className="chart"><canvas ref={ref} /></div>
}
