import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { useFundContext } from '../context/FundContext'
import { useWatchlist, useUpsertWatchlistItem, useDeleteWatchlistItem } from '../hooks/useWatchlist'
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pill, Select, Textarea } from '../components/ui'
import { logTradeLink } from '../lib/journalLinks'

export function WatchlistPage() {
  const { funds, selectedFund, scopeName } = useFundContext()
  const { data: items = [] } = useWatchlist(selectedFund?.id)
  const deleteItem = useDeleteWatchlistItem()
  const [formOpen, setFormOpen] = useState(false)

  if (funds.length === 0) {
    return <EmptyState title="No funds yet" description="Create a fund in Ledger to start a watchlist." />
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Watchlist"
        subtitle={`${scopeName} · ideas with entry, exit and stop levels`}
        action={
          <Button onClick={() => setFormOpen(true)}>
            <Plus size={16} /> Add symbol
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="Watchlist is empty"
          description="Track symbols with entry, exit and stop levels, then log the trade in one click when it triggers."
          action={<Button onClick={() => setFormOpen(true)}>Add symbol</Button>}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--ink-faint)] font-medium border-b border-[var(--border)]">
                <th className="px-5 py-3">Symbol</th>
                {!selectedFund && <th className="px-5 py-3">Fund</th>}
                <th className="px-5 py-3">Entry</th>
                <th className="px-5 py-3">Exit</th>
                <th className="px-5 py-3">Stop</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-5 py-3 font-medium">{item.symbol}</td>
                  {!selectedFund && <td className="px-5 py-3 text-[var(--ink-muted)]">{item.fund?.name ?? '—'}</td>}
                  <td className="px-5 py-3 tabular">{item.entry_target ?? '—'}</td>
                  <td className="px-5 py-3 tabular">{item.exit_target ?? '—'}</td>
                  <td className="px-5 py-3 tabular">{item.stop_loss ?? '—'}</td>
                  <td className="px-5 py-3">
                    <Pill tone={item.status === 'watching' ? 'accent' : item.status === 'triggered' ? 'amber' : 'default'}>
                      {item.status}
                    </Pill>
                  </td>
                  <td className="px-5 py-3 text-[var(--ink-muted)] max-w-[20ch] truncate">{item.notes}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link to={logTradeLink(item)} className="text-xs font-medium text-[var(--primary)] hover:underline whitespace-nowrap">
                        Log trade
                      </Link>
                      <button onClick={() => deleteItem.mutate(item.id)} className="text-[var(--ink-faint)] hover:text-[var(--red)]">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <WatchlistFormModal
        open={formOpen}
        funds={funds}
        defaultFundId={selectedFund?.id ?? funds[0].id}
        onClose={() => setFormOpen(false)}
      />
    </div>
  )
}

function WatchlistFormModal({ open, funds, defaultFundId, onClose }) {
  const upsert = useUpsertWatchlistItem()
  const [chosenFundId, setChosenFundId] = useState(null)
  const fundId = chosenFundId ?? defaultFundId
  const [symbol, setSymbol] = useState('')
  const [entryTarget, setEntryTarget] = useState('')
  const [exitTarget, setExitTarget] = useState('')
  const [stopLoss, setStopLoss] = useState('')
  const [notes, setNotes] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    await upsert.mutateAsync({
      fund_id: fundId,
      symbol: symbol.toUpperCase(),
      entry_target: entryTarget ? Number(entryTarget) : null,
      exit_target: exitTarget ? Number(exitTarget) : null,
      stop_loss: stopLoss ? Number(stopLoss) : null,
      notes,
    })
    setSymbol('')
    setEntryTarget('')
    setExitTarget('')
    setStopLoss('')
    setNotes('')
    setChosenFundId(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add to watchlist">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {funds.length > 1 && (
          <Field label="Fund">
            <Select value={fundId} onChange={(e) => setChosenFundId(e.target.value)}>
              {funds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Symbol">
          <Input required value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Entry">
            <Input type="number" step="0.01" value={entryTarget} onChange={(e) => setEntryTarget(e.target.value)} />
          </Field>
          <Field label="Exit">
            <Input type="number" step="0.01" value={exitTarget} onChange={(e) => setExitTarget(e.target.value)} />
          </Field>
          <Field label="Stop">
            <Input type="number" step="0.01" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending ? 'Saving…' : 'Add'}
        </Button>
      </form>
    </Modal>
  )
}
