import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { addDays, format, isValid, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { JournalEntryEditor } from '../components/journal/JournalEntryEditor'
import { useFundContext } from '../context/FundContext'
import { instrumentLabel } from '../lib/instruments'
import { useAllTrades } from '../hooks/useTrades'
import { useRecentJournal } from '../hooks/useDailyJournal'
import { Button, Card, Input, PageHeader, formatCurrency } from '../components/ui'

const dayKey = (d) => format(d, 'yyyy-MM-dd')

export function DailyJournalPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = parseISO(searchParams.get('date') ?? '')
  const date = isValid(requested) ? dayKey(requested) : dayKey(new Date())
  const today = dayKey(new Date())
  const setDate = (d) => setSearchParams(d === today ? {} : { date: d }, { replace: true })
  const shift = (days) => setDate(dayKey(addDays(parseISO(date), days)))

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Daily journal"
        subtitle="Plan before the open, review after the close"
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="!px-2.5" onClick={() => shift(-1)} aria-label="Previous day">
              <ChevronLeft size={16} />
            </Button>
            <Input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className="!w-auto" />
            <Button variant="secondary" className="!px-2.5" onClick={() => shift(1)} disabled={date >= today} aria-label="Next day">
              <ChevronRight size={16} />
            </Button>
            {date !== today && (
              <Button variant="ghost" onClick={() => setDate(today)}>
                Today
              </Button>
            )}
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <Card className="p-5 lg:col-span-2 flex flex-col gap-4">
          <h2 className="font-display text-base">{format(parseISO(date), 'EEEE, d MMMM yyyy')}</h2>
          <JournalEntryEditor date={date} fields={['plan', 'review', 'lessons', 'rating']} />
        </Card>

        <div className="flex flex-col gap-4">
          <DayTrades date={date} />
          <RecentEntries current={date} onPick={setDate} />
        </div>
      </div>
    </div>
  )
}

function DayTrades({ date }) {
  const { inScope, selectedFund } = useFundContext()
  const { data: trades = [] } = useAllTrades()

  const { closed, entered, pnl } = useMemo(() => {
    const scoped = trades.filter((t) => inScope(t.fund_id))
    const closed = scoped.filter((t) => t.status === 'closed' && t.exit_date && dayKey(new Date(t.exit_date)) === date)
    const entered = scoped.filter((t) => dayKey(new Date(t.entry_date)) === date)
    return { closed, entered, pnl: closed.reduce((s, t) => s + Number(t.pnl || 0), 0) }
  }, [trades, inScope, date])

  return (
    <Card className="p-5 flex flex-col gap-3">
      <h2 className="font-display text-base">Trades this day</h2>
      <div className="flex items-baseline justify-between">
        <span
          className={`tabular text-2xl font-semibold ${pnl > 0 ? 'text-[var(--accent)]' : pnl < 0 ? 'text-[var(--red)]' : ''}`}
        >
          {formatCurrency(pnl, selectedFund?.currency)}
        </span>
        <span className="text-xs text-[var(--ink-faint)]">
          {entered.length} entered · {closed.length} closed
        </span>
      </div>
      {closed.length > 0 && (
        <ul className="flex flex-col divide-y divide-[var(--border)] text-sm">
          {closed.map((t) => (
            <li key={t.id}>
              <Link to={`/journal?trade=${t.id}`} className="flex justify-between gap-3 py-2 hover:text-[var(--primary)]">
                <span className="font-medium">{instrumentLabel(t)}</span>
                <span className={`tabular ${t.pnl > 0 ? 'text-[var(--accent)]' : t.pnl < 0 ? 'text-[var(--red)]' : ''}`}>
                  {formatCurrency(t.pnl, t.fund?.currency)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function RecentEntries({ current, onPick }) {
  const { data: entries = [] } = useRecentJournal()

  return (
    <Card className="p-5 flex flex-col gap-2">
      <h2 className="font-display text-base">Recent entries</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-[var(--ink-faint)]">Nothing written yet. Start with today's plan.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {entries.map((e) => (
            <li key={e.journal_date}>
              <button
                onClick={() => onPick(e.journal_date)}
                className={`w-full text-left px-3 py-2 rounded-xl ${
                  e.journal_date === current ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{format(parseISO(e.journal_date), 'EEE, d MMM')}</span>
                  {e.day_rating != null && (
                    <span className="flex items-center gap-0.5 text-xs text-[var(--amber)]">
                      <Star size={12} fill="currentColor" /> {e.day_rating}
                    </span>
                  )}
                </div>
                <div className="text-xs text-[var(--ink-faint)] truncate">
                  {e.review || e.plan || e.lessons || 'Empty entry'}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
