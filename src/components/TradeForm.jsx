import { useState, useEffect } from 'react'

const emptyTrade = {
  symbol: '',
  side: 'long',
  entry_price: '',
  exit_price: '',
  quantity: '',
  entry_date: '',
  exit_date: '',
  fees: '0',
  notes: '',
  tags: '',
}

export default function TradeForm({ initialTrade, onSubmit, onCancel }) {
  const [trade, setTrade] = useState(emptyTrade)

  useEffect(() => {
    if (initialTrade) {
      setTrade({
        symbol: initialTrade.symbol ?? '',
        side: initialTrade.side ?? 'long',
        entry_price: initialTrade.entry_price ?? '',
        exit_price: initialTrade.exit_price ?? '',
        quantity: initialTrade.quantity ?? '',
        entry_date: initialTrade.entry_date ? initialTrade.entry_date.slice(0, 16) : '',
        exit_date: initialTrade.exit_date ? initialTrade.exit_date.slice(0, 16) : '',
        fees: initialTrade.fees ?? '0',
        notes: initialTrade.notes ?? '',
        tags: (initialTrade.tags ?? []).join(', '),
      })
    } else {
      setTrade(emptyTrade)
    }
  }, [initialTrade])

  function update(field, value) {
    setTrade((t) => ({ ...t, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({
      symbol: trade.symbol.trim().toUpperCase(),
      side: trade.side,
      entry_price: Number(trade.entry_price),
      exit_price: trade.exit_price === '' ? null : Number(trade.exit_price),
      quantity: Number(trade.quantity),
      entry_date: new Date(trade.entry_date).toISOString(),
      exit_date: trade.exit_date ? new Date(trade.exit_date).toISOString() : null,
      fees: trade.fees === '' ? 0 : Number(trade.fees),
      notes: trade.notes.trim() || null,
      tags: trade.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    })
  }

  const field = 'w-full rounded-md bg-neutral-900 border border-neutral-800 px-3 py-2 text-neutral-100 text-sm outline-none focus:border-emerald-500'
  const label = 'block text-xs text-neutral-400 mb-1'

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
      <div>
        <label className={label}>Symbol</label>
        <input required className={field} value={trade.symbol} onChange={(e) => update('symbol', e.target.value)} placeholder="AAPL" />
      </div>
      <div>
        <label className={label}>Side</label>
        <select className={field} value={trade.side} onChange={(e) => update('side', e.target.value)}>
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>
      </div>
      <div>
        <label className={label}>Quantity</label>
        <input required type="number" step="any" className={field} value={trade.quantity} onChange={(e) => update('quantity', e.target.value)} />
      </div>
      <div>
        <label className={label}>Fees</label>
        <input type="number" step="any" className={field} value={trade.fees} onChange={(e) => update('fees', e.target.value)} />
      </div>

      <div>
        <label className={label}>Entry price</label>
        <input required type="number" step="any" className={field} value={trade.entry_price} onChange={(e) => update('entry_price', e.target.value)} />
      </div>
      <div>
        <label className={label}>Exit price</label>
        <input type="number" step="any" className={field} value={trade.exit_price} onChange={(e) => update('exit_price', e.target.value)} />
      </div>
      <div>
        <label className={label}>Entry date</label>
        <input required type="datetime-local" className={field} value={trade.entry_date} onChange={(e) => update('entry_date', e.target.value)} />
      </div>
      <div>
        <label className={label}>Exit date</label>
        <input type="datetime-local" className={field} value={trade.exit_date} onChange={(e) => update('exit_date', e.target.value)} />
      </div>

      <div className="col-span-2 sm:col-span-3">
        <label className={label}>Notes</label>
        <input className={field} value={trade.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Setup, reasoning, mistakes…" />
      </div>
      <div>
        <label className={label}>Tags (comma-separated)</label>
        <input className={field} value={trade.tags} onChange={(e) => update('tags', e.target.value)} placeholder="breakout, earnings" />
      </div>

      <div className="col-span-2 sm:col-span-4 flex gap-2 justify-end pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm rounded-md border border-neutral-700 text-neutral-300 hover:bg-neutral-800">
            Cancel
          </button>
        )}
        <button type="submit" className="px-4 py-2 text-sm rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium">
          {initialTrade ? 'Save changes' : 'Add trade'}
        </button>
      </div>
    </form>
  )
}
