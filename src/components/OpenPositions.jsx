import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { useUpdateTrade } from '../hooks/useTrades'
import { riskToStop } from '../lib/goals'
import { daysToExpiry, instrumentLabel } from '../lib/instruments'
import { Card, EmptyState, Pill, formatCurrency, formatNumber } from './ui'

const pnlClass = (v) => (v > 0 ? 'text-[var(--accent)]' : v < 0 ? 'text-[var(--red)]' : '')

// Unrealized P&L at the hand-entered mark price, or null when unmarked.
export function unrealizedPnl(t) {
  if (t.mark_price == null) return null
  const perUnit = t.direction === 'short' ? t.entry_price - t.mark_price : t.mark_price - t.entry_price
  return perUnit * t.entry_quantity
}

export function tradeRisk(t) {
  return riskToStop({ direction: t.direction, entryPrice: t.entry_price, stopLoss: t.stop_loss, quantity: t.entry_quantity })
}

// Open trades are the positions. With no price feed, the mark price is typed
// in (click the Mark cell) and unrealized P&L follows from it.
export function OpenPositions({ trades, showFund = true, currency }) {
  const navigate = useNavigate()

  if (trades.length === 0) {
    return <EmptyState title="No open positions" description="Trades you log and haven't closed yet show up here." />
  }

  const marked = trades.filter((t) => t.mark_price != null)
  const totalUnrealized = marked.reduce((s, t) => s + unrealizedPnl(t), 0)
  const totalRisk = trades.reduce((s, t) => s + (tradeRisk(t) ?? 0), 0)

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-[var(--ink-faint)] font-medium border-b border-[var(--border)]">
            <th className="px-5 py-3">Symbol</th>
            <th className="px-5 py-3">Dir</th>
            <th className="px-5 py-3 text-right">Qty</th>
            <th className="px-5 py-3 text-right">Avg entry</th>
            <th className="px-5 py-3 text-right">Mark</th>
            <th className="px-5 py-3 text-right">Unrealized</th>
            <th className="px-5 py-3 text-right">Stop</th>
            <th className="px-5 py-3 text-right">Risk to stop</th>
            <th className="px-5 py-3 text-right">Target</th>
            <th className="px-5 py-3">Opened</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => {
            const risk = tradeRisk(t)
            const upnl = unrealizedPnl(t)
            const currency = t.fund?.currency
            return (
              <tr
                key={t.id}
                onClick={() => navigate(`/journal?trade=${t.id}`)}
                className="border-b border-[var(--border)] cursor-pointer hover:bg-[var(--surface-2)]"
              >
                <td className="px-5 py-3 font-medium whitespace-nowrap">
                  {instrumentLabel(t)}
                  <ExpiryPill trade={t} />
                  {showFund && <div className="text-xs font-normal text-[var(--ink-faint)]">{t.fund?.name}</div>}
                </td>
                <td className="px-5 py-3">
                  <Pill tone={t.direction === 'long' ? 'accent' : 'amber'}>{t.direction}</Pill>
                </td>
                <td className="px-5 py-3 text-right tabular">{formatNumber(t.entry_quantity)}</td>
                <td className="px-5 py-3 text-right tabular">{formatNumber(t.entry_price)}</td>
                <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <MarkPrice trade={t} />
                </td>
                <td className={`px-5 py-3 text-right tabular font-medium ${pnlClass(upnl)}`}>
                  {upnl == null ? '—' : formatCurrency(upnl, currency)}
                </td>
                <td className="px-5 py-3 text-right tabular">{t.stop_loss != null ? formatNumber(t.stop_loss) : '—'}</td>
                <td className="px-5 py-3 text-right tabular">
                  {risk == null ? <Pill tone="red">no stop</Pill> : formatCurrency(risk, currency)}
                </td>
                <td className="px-5 py-3 text-right tabular">{t.target_price != null ? formatNumber(t.target_price) : '—'}</td>
                <td className="px-5 py-3 text-xs text-[var(--ink-muted)] whitespace-nowrap">
                  {format(new Date(t.entry_date), 'dd MMM, HH:mm')}
                </td>
              </tr>
            )
          })}
          <tr className="text-xs text-[var(--ink-muted)]">
            <td className="px-5 py-3 font-medium" colSpan={5}>
              {trades.length} open · {marked.length} marked
            </td>
            <td className={`px-5 py-3 text-right tabular font-semibold text-sm ${pnlClass(totalUnrealized)}`}>
              {marked.length ? formatCurrency(totalUnrealized, currency) : '—'}
            </td>
            <td />
            <td className="px-5 py-3 text-right tabular font-semibold text-sm text-[var(--ink)]">{formatCurrency(totalRisk, currency)}</td>
            <td colSpan={2} />
          </tr>
        </tbody>
      </table>
    </Card>
  )
}

function MarkPrice({ trade }) {
  const update = useUpdateTrade()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')

  function start() {
    setValue(trade.mark_price != null ? String(trade.mark_price) : '')
    setEditing(true)
  }

  function commit() {
    setEditing(false)
    const next = value.trim() === '' ? null : Number(value)
    if (next !== null && !(next > 0)) return
    if (next === (trade.mark_price == null ? null : Number(trade.mark_price))) return
    update.mutate({ id: trade.id, mark_price: next, mark_price_at: next == null ? null : new Date().toISOString() })
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        step="any"
        min="0"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') setEditing(false)
        }}
        className="inset rounded-lg px-2 py-1 w-24 text-right tabular text-sm"
      />
    )
  }

  return (
    <button
      onClick={start}
      title={trade.mark_price_at ? `Marked ${format(new Date(trade.mark_price_at), 'dd MMM, HH:mm')}` : 'Set the current price'}
      className="tabular hover:text-[var(--primary)]"
    >
      {trade.mark_price != null ? formatNumber(trade.mark_price) : <span className="text-xs text-[var(--primary)]">set price</span>}
    </button>
  )
}

// Flags F&O positions near expiry: today, or within the week.
function ExpiryPill({ trade }) {
  const days = daysToExpiry(trade)
  if (days == null || days > 7) return null
  return (
    <span className="ml-2 align-middle">
      <Pill tone={days <= 0 ? 'red' : 'amber'}>{days < 0 ? 'expired' : days === 0 ? 'expires today' : `${days}d to expiry`}</Pill>
    </span>
  )
}
