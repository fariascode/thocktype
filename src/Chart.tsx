import { useEffect, useRef } from 'react'
import { Chart as C, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip } from 'chart.js'

C.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip)

type Props = { labels: (string | number)[]; series: { label: string; data: number[]; dim?: boolean }[] }

export default function Chart({ labels, series }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const css = getComputedStyle(document.documentElement)
    const v = (name: string) => css.getPropertyValue(name).trim()
    const fg = v('--accent'), dim = v('--text-3'), border = v('--border')
    C.defaults.font.family = v('--mono')
    C.defaults.font.size = 11
    const chart = new C(ref.current!, {
      type: 'line',
      data: {
        labels,
        datasets: series.map(s => ({
          label: s.label, data: s.data, borderColor: s.dim ? dim : fg, backgroundColor: s.dim ? dim : fg,
          borderWidth: s.dim ? 1.5 : 2, pointRadius: 0, pointHoverRadius: 4, tension: 0.35, borderDash: s.dim ? [4, 4] : [],
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          tooltip: {
            backgroundColor: v('--surface-2'), titleColor: fg, bodyColor: v('--text-2'),
            borderColor: border, borderWidth: 1, cornerRadius: 8, padding: 10, displayColors: false,
          },
        },
        scales: {
          x: { ticks: { color: dim, maxTicksLimit: 8 }, grid: { display: false }, border: { display: false } },
          y: { beginAtZero: true, ticks: { color: dim, maxTicksLimit: 5 }, grid: { color: border }, border: { display: false } },
        },
      },
    })
    return () => chart.destroy()
  }, [labels, series])
  return <div className="chart"><canvas ref={ref} /></div>
}
