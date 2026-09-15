import { useState } from 'react'
import { Plus, Trash2, RefreshCw } from 'lucide-react'
import { useFundContext } from '../context/FundContext'
import { useWatchlist, useUpsertWatchlistItem, useDeleteWatchlistItem } from '../hooks/useWatchlist'
import { useHoldings, useUpsertHolding, useUpdateHoldingPrice, useDeleteHolding } from '../hooks/useHoldings'
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pill, Textarea, formatCurrency, formatNumber } from '../components/ui'

export function WatchlistPage() {
  const { selectedFund } = useFundContext()
  const { data: items = [] } = useWatchlist(selectedFund?.id)
  const deleteItem = useDeleteWatchlistItem()
  const [formOpen, setFormOpen] = useState(false)

  if (!selectedFund) {
    return <EmptyState title="Pick a fund" description="Select a fund to maintain its watchlist." />
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Market Prep"
        title="Watchlist"
        action={
          <Button onClick={() => setFormOpen(true)}>
            <Plus size={16} /> Add symbol
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="Watchlist is empty"
          description={`Track symbols for ${selectedFund.name} with entry, exit and stop levels.`}
          action={<Button onClick={() => setFormOpen(true)}>Add symbol</Button>}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--ink-faint)] font-mono uppercase border-b border-[var(--border)]">
                <th className="px-4 py-2 font-normal">Symbol</th>
                <th className="px-4 py-2 font-normal">Entry</th>
                <th className="px-4 py-2 font-normal">Exit</th>
                <th className="px-4 py-2 font-normal">Stop</th>
                <th className="px-4 py-2 font-normal">Status</th>
                <th className="px-4 py-2 font-normal">Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-2 font-medium">{item.symbol}</td>
                  <td className="px-4 py-2 tabular">{item.entry_target ?? '—'}</td>
                  <td className="px-4 py-2 tabular">{item.exit_target ?? '—'}</td>
                  <td className="px-4 py-2 tabular">{item.stop_loss ?? '—'}</td>
                  <td className="px-4 py-2">
                    <Pill tone={item.status === 'watching' ? 'accent' : item.status === 'triggered' ? 'amber' : 'default'}>
                      {item.status}
                    </Pill>
                  </td>
                  <td className="px-4 py-2 text-[var(--ink-muted)] max-w-[20ch] truncate">{item.notes}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => deleteItem.mutate(item.id)} className="text-[var(--ink-faint)] hover:text-[var(--red)]">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <WatchlistFormModal open={formOpen} fundId={selectedFund.id} onClose={() => setFormOpen(false)} />

      <HoldingsSection fund={selectedFund} />
    </div>
  )
}

function HoldingsSection({ fund }) {
  const { data: holdings = [] } = useHoldings(fund.id)
  const deleteHolding = useDeleteHolding()
  const [formOpen, setFormOpen] = useState(false)
  const [priceEdit, setPriceEdit] = useState(null)

  return (
    <div className="flex flex-col gap-4 pt-2 border-t border-[var(--border)]">
      <div className="flex items-center justify-between pt-4">
        <h2 className="font-display text-lg font-semibold">Portfolio holdings</h2>
        <Button variant="secondary" onClick={() => setFormOpen(true)}>
          <Plus size={15} /> Add holding
        </Button>
      </div>

      {holdings.length === 0 ? (
        <p className="text-sm text-[var(--ink-faint)]">No holdings entered manually yet for {fund.name}.</p>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--ink-faint)] font-mono uppercase border-b border-[var(--border)]">
                <th className="px-4 py-2 font-normal">Symbol</th>
                <th className="px-4 py-2 font-normal">Qty</th>
                <th className="px-4 py-2 font-normal">Avg price</th>
                <th className="px-4 py-2 font-normal">Last price</th>
                <th className="px-4 py-2 font-normal text-right">Market value</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-2 font-medium">{h.symbol}</td>
                  <td className="px-4 py-2 tabular">{formatNumber(h.quantity)}</td>
                  <td className="px-4 py-2 tabular">{formatCurrency(h.avg_price, fund.currency)}</td>
                  <td className="px-4 py-2 tabular">
                    <button onClick={() => setPriceEdit(h)} className="flex items-center gap-1 hover:text-[var(--accent)]">
                      {h.last_price ? formatCurrency(h.last_price, fund.currency) : 'set price'}
                      <RefreshCw size={11} />
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right tabular font-medium">
                    {formatCurrency((h.last_price ?? h.avg_price) * h.quantity, fund.currency)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => deleteHolding.mutate(h.id)} className="text-[var(--ink-faint)] hover:text-[var(--red)]">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <HoldingFormModal open={formOpen} fundId={fund.id} onClose={() => setFormOpen(false)} />
      <PriceUpdateModal holding={priceEdit} onClose={() => setPriceEdit(null)} />
    </div>
  )
}

function HoldingFormModal({ open, fundId, onClose }) {
  const upsert = useUpsertHolding()
  const [symbol, setSymbol] = useState('')
  const [quantity, setQuantity] = useState('')
  const [avgPrice, setAvgPrice] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    await upsert.mutateAsync({
      fund_id: fundId,
      symbol: symbol.toUpperCase(),
      quantity: Number(quantity),
      avg_price: Number(avgPrice),
    })
    setSymbol('')
    setQuantity('')
    setAvgPrice('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add holding">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Symbol">
          <Input required value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity">
            <Input type="number" step="any" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          <Field label="Avg. price">
            <Input type="number" step="0.01" required value={avgPrice} onChange={(e) => setAvgPrice(e.target.value)} />
          </Field>
        </div>
        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending ? 'Saving…' : 'Add holding'}
        </Button>
      </form>
    </Modal>
  )
}

function PriceUpdateModal({ holding, onClose }) {
  const updatePrice = useUpdateHoldingPrice()
  const [price, setPrice] = useState('')

  if (!holding) return null

  async function handleSubmit(e) {
    e.preventDefault()
    await updatePrice.mutateAsync({ id: holding.id, symbol: holding.symbol, price: Number(price) })
    setPrice('')
    onClose()
  }

  return (
    <Modal open={!!holding} onClose={onClose} title={`Update price — ${holding.symbol}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Current price">
          <Input type="number" step="0.01" required autoFocus value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Button type="submit" disabled={updatePrice.isPending}>
          {updatePrice.isPending ? 'Saving…' : 'Update'}
        </Button>
      </form>
    </Modal>
  )
}

function WatchlistFormModal({ open, fundId, onClose }) {
  const upsert = useUpsertWatchlistItem()
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
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add to watchlist">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
