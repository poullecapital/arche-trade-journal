import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, isToday, parseISO } from 'date-fns'
import { Calculator, Leaf, Plus } from 'lucide-react'
import { GoalsCard } from '../components/GoalsCard'
import { OpenPositions, tradeRisk, unrealizedPnl } from '../components/OpenPositions'
import { StickyNotes } from '../components/StickyNotes'
import { JournalEntryEditor } from '../components/journal/JournalEntryEditor'
import { useReviewQueue } from '../hooks/useReviewQueue'
import { logTradeLink } from '../lib/journalLinks'
import { useFundContext } from '../context/FundContext'
import { instrumentLabel } from '../lib/instruments'
import { useUtilities } from '../context/UtilityContext'
import { useAllTrades } from '../hooks/useTrades'
import { useWatchlist } from '../hooks/useWatchlist'
import { useStrategies } from '../hooks/useStrategies'
import { dailyPnl, splitTags } from '../lib/analytics'
import { Button, Card, EmptyState, PageHeader, Pill, Stat, Tabs, formatCurrency, formatNumber } from '../components/ui'

// Session boundaries (local time) used to pick the default view: NSE cash
// hours. Any tab can still be opened by hand, e.g. for crypto late at night.
const OPEN_MINUTES = 9 * 60 + 15
const CLOSE_MINUTES = 15 * 60 + 30

const PHASES = [
  { id: 'before', label: 'Before market' },
  { id: 'session', label: 'In session' },
  { id: 'after', label: 'After market' },
]

function currentPhase(now = new Date()) {
  const minutes = now.getHours() * 60 + now.getMinutes()
  return minutes < OPEN_MINUTES ? 'before' : minutes < CLOSE_MINUTES ? 'session' : 'after'
}

const pnlTone = (v) => (v > 0 ? 'positive' : v < 0 ? 'negative' : 'default')
const pnlClass = (v) => (v > 0 ? 'text-[var(--accent)]' : v < 0 ? 'text-[var(--red)]' : 'text-[var(--ink-muted)]')

const todayKey = () => format(new Date(), 'yyyy-MM-dd')

export function TodayPage() {
  const navigate = useNavigate()
  const { funds, selectedFund, inScope, scopeName } = useFundContext()
  const { data: allTrades = [], isLoading } = useAllTrades()
  const [phase, setPhase] = useState(currentPhase)

  const trades = useMemo(() => allTrades.filter((t) => inScope(t.fund_id)), [allTrades, inScope])
  const currency = selectedFund?.currency ?? 'INR'

  const day = useMemo(() => {
    const days = dailyPnl(trades)
    const todayKey = format(new Date(), 'yyyy-MM-dd')
    const previousKey = Object.keys(days)
      .filter((k) => k < todayKey)
      .sort()
      .at(-1)
    const open = trades.filter((t) => t.status === 'open')
    const risks = open.map(tradeRisk)
    const marked = open.filter((t) => t.mark_price != null)
    return {
      today: days[todayKey] ?? { pnl: 0, count: 0, trades: [] },
      previous: previousKey ? { key: previousKey, ...days[previousKey] } : null,
      enteredToday: trades.filter((t) => isToday(new Date(t.entry_date))).length,
      open,
      openRisk: risks.reduce((s, r) => s + (r ?? 0), 0),
      withoutStop: risks.filter((r) => r == null).length,
      marked: marked.length,
      unrealized: marked.reduce((s, t) => s + unrealizedPnl(t), 0),
    }
  }, [trades])

  if (funds.length === 0 && !isLoading) {
    return (
      <EmptyState
        title="Welcome to Arche"
        description="Create your first fund to start journaling."
        action={<Button onClick={() => navigate('/funds?new=1')}>Create a fund</Button>}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Today" subtitle={`${format(new Date(), 'EEEE, d MMMM')} · ${scopeName}`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Today's P&L"
          value={formatCurrency(day.today.pnl, currency)}
          tone={pnlTone(day.today.pnl)}
          sub={`${day.today.count} closed today`}
        />
        <Stat label="Trades entered" value={day.enteredToday} sub="today" />
        <Stat
          label="Open P&L"
          value={day.marked ? formatCurrency(day.unrealized, currency) : '—'}
          tone={pnlTone(day.unrealized)}
          sub={`${day.open.length} open · ${day.marked} marked`}
        />
        <Stat
          label="Risk to stops"
          value={formatCurrency(day.openRisk, currency)}
          tone={day.withoutStop > 0 ? 'negative' : 'default'}
          sub={day.withoutStop > 0 ? `${day.withoutStop} open without a stop` : 'if every stop is hit'}
        />
      </div>

      <GoalsCard />

      <Tabs tabs={PHASES} value={phase} onChange={setPhase} />

      {phase === 'before' && <BeforeMarket previous={day.previous} currency={currency} />}
      {phase === 'session' && <InSession open={day.open} currency={currency} />}
      {phase === 'after' && <AfterMarket closedToday={day.today.trades} currency={currency} />}

      <Card className="p-5">
        <StickyNotes />
      </Card>
    </div>
  )
}

function BeforeMarket({ previous, currency }) {
  const { selectedFund } = useFundContext()
  const { data: items = [] } = useWatchlist(selectedFund?.id)
  const { data: strategies = [] } = useStrategies(selectedFund?.id)
  const watching = items.filter((i) => i.status === 'watching')
  const active = strategies.filter((s) => s.status === 'active' && s.rules?.length > 0)

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="p-5 lg:col-span-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base">Today's plan</h2>
          <Link to="/journal/daily" className="text-xs font-medium text-[var(--primary)] hover:underline">
            Daily journal
          </Link>
        </div>
        <JournalEntryEditor date={todayKey()} fields={['plan']} />
      </Card>

      <Card className="p-5 flex flex-col gap-2">
        <h2 className="font-display text-base">Last session</h2>
        {!previous ? (
          <p className="text-sm text-[var(--ink-faint)]">No closed trades before today yet.</p>
        ) : (
          <>
            <div className="text-xs text-[var(--ink-faint)]">{format(parseISO(previous.key), 'EEEE, d MMM')}</div>
            <div className={`tabular text-2xl font-semibold ${pnlClass(previous.pnl)}`}>{formatCurrency(previous.pnl, currency)}</div>
            <div className="text-sm text-[var(--ink-muted)]">
              {previous.trades.filter((t) => t.pnl > 0).length} won · {previous.trades.filter((t) => t.pnl < 0).length} lost
              {(() => {
                const mistakes = previous.trades.reduce((n, t) => n + splitTags(t.tags).mistakes.length, 0)
                return mistakes > 0 ? ` · ${mistakes} mistake${mistakes > 1 ? 's' : ''} tagged` : ''
              })()}
            </div>
          </>
        )}
      </Card>

      <Card className="p-5 lg:col-span-2 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base">Setups on watch</h2>
          <Link to="/watchlist" className="text-xs font-medium text-[var(--primary)] hover:underline">
            Watchlist
          </Link>
        </div>
        {watching.length === 0 ? (
          <p className="text-sm text-[var(--ink-faint)]">Nothing on watch. Add ideas with entry, stop and target levels to the watchlist.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--border)]">
            {watching.slice(0, 8).map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-medium">{i.symbol}</span>
                  {i.notes && <span className="ml-2 text-[var(--ink-faint)] truncate">{i.notes}</span>}
                </div>
                <div className="flex items-center gap-4 shrink-0 tabular text-xs text-[var(--ink-muted)]">
                  <span>E {i.entry_target ?? '—'}</span>
                  <span>S {i.stop_loss ?? '—'}</span>
                  <span>T {i.exit_target ?? '—'}</span>
                  <Link to={logTradeLink(i)} className="font-medium text-[var(--primary)] hover:underline">
                    Log
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-5 lg:col-span-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base">Playbook rules</h2>
          <Link to="/strategies" className="text-xs font-medium text-[var(--primary)] hover:underline">
            Strategies
          </Link>
        </div>
        {active.length === 0 ? (
          <p className="text-sm text-[var(--ink-faint)]">Add rules to an active strategy and they'll show here to read before the open.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((s) => (
              <div key={s.id} className="flex flex-col gap-1.5">
                <div className="text-sm font-medium">{s.name}</div>
                <ul className="flex flex-col gap-1 text-sm text-[var(--ink-muted)]">
                  {s.rules.map((r) => (
                    <li key={r.id} className="flex gap-2">
                      <span className="text-[var(--primary)]">•</span>
                      {r.label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function InSession({ open, currency }) {
  const navigate = useNavigate()
  const { selectedFund } = useFundContext()
  const { openCalculator, openBreak } = useUtilities()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => navigate('/journal?new=1')}>
          <Plus size={16} /> Log trade
        </Button>
        <Button variant="secondary" onClick={openCalculator}>
          <Calculator size={15} /> Size a position
        </Button>
        <Button variant="secondary" onClick={openBreak}>
          <Leaf size={15} /> Take a break
        </Button>
      </div>
      <OpenPositions trades={open} showFund={!selectedFund} currency={currency} />
    </div>
  )
}

function AfterMarket({ closedToday, currency }) {
  const navigate = useNavigate()
  const { queue } = useReviewQueue()
  const unreviewed = closedToday.filter((t) => !t.reviewed_at).length
  const wins = closedToday.filter((t) => t.pnl > 0).length

  return (
    <div className="flex flex-col gap-4">
      {closedToday.length === 0 ? (
        <EmptyState title="Nothing closed today" description="Trades you close today will be listed here for review." />
      ) : (
        <Card className="overflow-x-auto">
          <div className="flex items-center justify-between gap-3 flex-wrap px-5 pt-4 pb-3">
            <div>
              <h2 className="font-display text-base">Today's trades</h2>
              <p className="text-sm text-[var(--ink-muted)]">
                {wins} of {closedToday.length} won · {unreviewed > 0 ? `${unreviewed} not reviewed yet` : 'all reviewed'}
              </p>
            </div>
            {queue.length > 0 && (
              <Link to="/journal/review" className="text-xs font-medium text-[var(--primary)] hover:underline">
                Review queue ({queue.length})
              </Link>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--ink-faint)] font-medium border-y border-[var(--border)]">
                <th className="px-5 py-3">Symbol</th>
                <th className="px-5 py-3">Strategy</th>
                <th className="px-5 py-3 text-right">P&amp;L</th>
                <th className="px-5 py-3 text-right">R</th>
                <th className="px-5 py-3">Review</th>
              </tr>
            </thead>
            <tbody>
              {closedToday.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => navigate(`/journal?trade=${t.id}`)}
                  className="border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-[var(--surface-2)]"
                >
                  <td className="px-5 py-3 font-medium">{instrumentLabel(t)}</td>
                  <td className="px-5 py-3 text-[var(--ink-muted)]">{t.strategy?.name ?? '—'}</td>
                  <td className={`px-5 py-3 text-right tabular font-medium ${pnlClass(t.pnl)}`}>
                    {formatCurrency(t.pnl, t.fund?.currency ?? currency)}
                  </td>
                  <td className="px-5 py-3 text-right tabular">{t.r_multiple != null ? formatNumber(t.r_multiple) : '—'}</td>
                  <td className="px-5 py-3">{t.reviewed_at ? <Pill tone="accent">done</Pill> : <Pill tone="amber">to review</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card className="p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base">Wrap up the day</h2>
          <Link to="/journal/daily" className="text-xs font-medium text-[var(--primary)] hover:underline">
            Daily journal
          </Link>
        </div>
        <JournalEntryEditor date={todayKey()} fields={['review', 'lessons', 'rating']} />
      </Card>
    </div>
  )
}
