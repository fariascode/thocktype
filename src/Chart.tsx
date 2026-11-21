import { lazy, Suspense, type ComponentProps } from 'react'

// Chart.js is the heaviest dependency and the typing screen never draws a chart: load it on first use.
// Offline before it was ever cached, the chart just stays empty instead of crashing the result screen.
const Impl = lazy(() => import('./ChartImpl').catch(() => ({ default: () => <div className="chart" /> })))
export default function Chart(p: ComponentProps<typeof Impl>) {
  return <Suspense fallback={<div className="chart" />}><Impl {...p} /></Suspense>
}
