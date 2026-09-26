import { useState } from 'react'
import { format } from 'date-fns'
import { TradeDetailModal } from '../components/journal/TradeDetailModal'
import { useFundContext } from '../context/FundContext'
import { instrumentLabel } from '../lib/instruments'
import { useReviewQueue } from '../hooks/useReviewQueue'
import { splitTags } from '../lib/analytics'
import { Card, EmptyState, PageHeader, Pill, formatCurrency, formatNumber } from '../components/ui'

export function ReviewQueuePage() {
  const { funds, selectedFund, scopeName } = useFundContext()
  const { queue, isLoading } = useReviewQueue()
  const [activeId, setActiveId] = useState(null)
  const active = queue.find((t) => t.id === activeId)

  // After marking one reviewed, open the next one still waiting.
  function next(reviewed) {
    const rest = queue.filter((t) => t.id !== reviewed.id)
    setActiveId(rest[0]?.id ?? null)
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Review queue"
        subtitle={`${scopeName} · ${queue.length} closed trade${queue.length === 1 ? '' : 's'} waiting for review`}
      />

      {queue.length === 0 && !isLoading ? (
        <EmptyState title="All caught up" description="Every closed trade has been reviewed. New ones land here when you close them." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--ink-faint)] font-medium border-b border-[var(--border)]">
                <th className="px-5 py-3">Closed</th>
                <th className="px-5 py-3">Symbol</th>
                {!selectedFund && <th className="px-5 py-3">Fund</th>}
                <th className="px-5 py-3">Strategy</th>
                <th className="px-5 py-3 text-right">P&amp;L</th>
                <th className="px-5 py-3 text-right">R</th>
                <th className="px-5 py-3">So far</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((t) => {
                const { mistakes, emotions } = splitTags(t.tags)
                return (
                  <tr
                    key={t.id}
                    onClick={() => setActiveId(t.id)}
                    className="border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-[var(--surface-2)]"
                  >
                    <td className="px-5 py-3 text-xs">{format(new Date(t.exit_date), 'dd MMM yy')}</td>
                    <td className="px-5 py-3 font-medium">{instrumentLabel(t)}</td>
                    {!selectedFund && <td className="px-5 py-3 text-[var(--ink-muted)]">{t.fund?.name ?? '—'}</td>}
                    <td className="px-5 py-3 text-[var(--ink-muted)]">{t.strategy?.name ?? '—'}</td>
                    <td
                      className={`px-5 py-3 text-right tabular font-medium ${
                        t.pnl > 0 ? 'text-[var(--accent)]' : t.pnl < 0 ? 'text-[var(--red)]' : ''
                      }`}
                    >
                      {formatCurrency(t.pnl, t.fund?.currency)}
                    </td>
                    <td className="px-5 py-3 text-right tabular">{t.r_multiple != null ? formatNumber(t.r_multiple) : '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {t.notes?.trim() && <Pill>notes</Pill>}
                        {mistakes.length + emotions.length > 0 && <Pill>{mistakes.length + emotions.length} tags</Pill>}
                        {!t.notes?.trim() && mistakes.length + emotions.length === 0 && (
                          <span className="text-xs text-[var(--ink-faint)]">nothing yet</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      {active && funds.find((f) => f.id === active.fund_id) && (
        <TradeDetailModal
          trade={active}
          fund={funds.find((f) => f.id === active.fund_id)}
          onClose={() => setActiveId(null)}
          onReviewed={next}
        />
      )}
    </div>
  )
}
