import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFundContext } from '../context/FundContext'
import { useAllTrades } from '../hooks/useTrades'
import { EmptyState, PageHeader, Tabs } from '../components/ui'
import { StatsPanel } from '../components/analytics/StatsPanel'
import { BreakdownPanel } from '../components/analytics/BreakdownPanel'
import { PnlCalendar } from '../components/analytics/PnlCalendar'
import { MistakesPanel } from '../components/analytics/MistakesPanel'
import { MonthlyReport } from '../components/analytics/MonthlyReport'
import { ForecastPanel } from '../components/analytics/ForecastPanel'

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'breakdown', label: 'Breakdown' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'mistakes', label: 'Mistakes' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'report', label: 'Report' },
]

export function AnalyticsPage() {
  const { funds, selectedFund, inScope, scopeName } = useFundContext()
  const { data: allTrades = [], isLoading } = useAllTrades()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'summary'
  const setTab = (id) => setSearchParams(id === 'summary' ? {} : { tab: id }, { replace: true })

  const trades = useMemo(() => allTrades.filter((t) => inScope(t.fund_id)), [allTrades, inScope])
  const currency = selectedFund?.currency ?? 'INR'

  if (funds.length === 0 && !isLoading) {
    return <EmptyState title="No funds yet" description="Create a fund in Ledger and log some trades to unlock analytics." />
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="no-print flex flex-col gap-5">
        <PageHeader title="Analytics" subtitle={`${scopeName} · what your trading history says about your edge`} />
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === 'summary' && <StatsPanel trades={trades} currency={currency} />}
      {tab === 'breakdown' && <BreakdownPanel trades={trades} currency={currency} />}
      {tab === 'calendar' && <PnlCalendar trades={trades} currency={currency} />}
      {tab === 'mistakes' && <MistakesPanel trades={trades} currency={currency} />}
      {tab === 'forecast' && <ForecastPanel trades={trades} />}
      {tab === 'report' && <MonthlyReport trades={trades} currency={currency} scope={scopeName} />}
    </div>
  )
}
