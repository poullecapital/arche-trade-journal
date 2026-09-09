function pnl(trade) {
  if (trade.exit_price == null) return null
  const diff = trade.side === 'long' ? trade.exit_price - trade.entry_price : trade.entry_price - trade.exit_price
  return diff * trade.quantity - (trade.fees ?? 0)
}

const fmt = (n) => (n == null ? '—' : n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '—')

export default function TradeTable({ trades, onEdit, onDelete }) {
  if (trades.length === 0) {
    return <p className="text-neutral-500 text-sm text-center py-12">No trades logged yet. Add your first trade above.</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-800">
      <table className="w-full text-sm text-left">
        <thead className="bg-neutral-900 text-neutral-400">
          <tr>
            <th className="px-3 py-2 font-medium">Symbol</th>
            <th className="px-3 py-2 font-medium">Side</th>
            <th className="px-3 py-2 font-medium">Qty</th>
            <th className="px-3 py-2 font-medium">Entry</th>
            <th className="px-3 py-2 font-medium">Exit</th>
            <th className="px-3 py-2 font-medium">P&amp;L</th>
            <th className="px-3 py-2 font-medium">Entry date</th>
            <th className="px-3 py-2 font-medium">Tags</th>
            <th className="px-3 py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {trades.map((trade) => {
            const result = pnl(trade)
            return (
              <tr key={trade.id} className="text-neutral-200 hover:bg-neutral-900/50">
                <td className="px-3 py-2 font-medium">{trade.symbol}</td>
                <td className="px-3 py-2">
                  <span className={trade.side === 'long' ? 'text-emerald-400' : 'text-red-400'}>{trade.side}</span>
                </td>
                <td className="px-3 py-2">{trade.quantity}</td>
                <td className="px-3 py-2">{fmt(trade.entry_price)}</td>
                <td className="px-3 py-2">{fmt(trade.exit_price)}</td>
                <td className={`px-3 py-2 font-medium ${result == null ? 'text-neutral-500' : result >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result == null ? 'Open' : fmt(result)}
                </td>
                <td className="px-3 py-2 text-neutral-400">{fmtDate(trade.entry_date)}</td>
                <td className="px-3 py-2 text-neutral-400">{trade.tags?.join(', ') || '—'}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button onClick={() => onEdit(trade)} className="text-neutral-400 hover:text-neutral-100 mr-3">
                    Edit
                  </button>
                  <button onClick={() => onDelete(trade)} className="text-red-500 hover:text-red-400">
                    Delete
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export { pnl }
