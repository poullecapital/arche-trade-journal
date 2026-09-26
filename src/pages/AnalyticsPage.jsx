import { useMemo, useState } from 'react'
import { useFundContext } from '../context/FundContext'
import { useAllTrades } from '../hooks/useTrades'
import { EmptyState, PageHeader, Select, Tabs } from '../components/ui'
import { StatsPanel } from '../components/analytics/StatsPanel'
import { BreakdownPanel } from '../components/analytics/BreakdownPanel'
import { PnlCalendar } from '../components/analytics/PnlCalendar'
import { MistakesPanel } from '../components/analytics/MistakesPanel'
import { MonthlyReport } from '../components/analytics/MonthlyReport'

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'breakdown', label: 'Breakdown' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'mistakes', label: 'Mistakes' },
  { id: 'report', label: 'Report' },
]

export function AnalyticsPage() {
  const { funds } = useFundContext()
  const { data: allTrades = [], isLoading } = useAllTrades()
  const [tab, setTab] = useState('summary')
  const [fundId, setFundId] = useState('all')

  const trades = useMemo(() => (fundId === 'all' ? allTrades : allTrades.filter((t) => t.fund_id === fundId)), [allTrades, fundId])
  const fund = funds.find((f) => f.id === fundId)
  const currency = fund?.currency ?? 'INR'

  if (funds.length === 0 && !isLoading) {
    return <EmptyState title="No funds yet" description="Create a fund in Ledger and log some trades to unlock analytics." />
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="no-print flex flex-col gap-5">
        <PageHeader
          title="Analytics"
          subtitle="What your trading history says about your edge"
          action={
            <Select aria-label="Fund" value={fundId} onChange={(e) => setFundId(e.target.value)} className="!w-auto !rounded-full !px-4 font-medium">
              <option value="all">All funds</option>
              {funds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          }
        />
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === 'summary' && <StatsPanel trades={trades} currency={currency} />}
      {tab === 'breakdown' && <BreakdownPanel trades={trades} currency={currency} />}
      {tab === 'calendar' && <PnlCalendar trades={trades} currency={currency} />}
      {tab === 'mistakes' && <MistakesPanel trades={trades} currency={currency} />}
      {tab === 'report' && <MonthlyReport trades={trades} currency={currency} scope={fund ? fund.name : 'All funds'} />}
    </div>
  )
}
