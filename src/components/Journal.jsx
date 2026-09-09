import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import TradeForm from './TradeForm'
import TradeTable, { pnl } from './TradeTable'

export default function Journal() {
  const { user, signOut } = useAuth()
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingTrade, setEditingTrade] = useState(null)

  useEffect(() => {
    loadTrades()
  }, [])

  async function loadTrades() {
    setLoading(true)
    const { data, error } = await supabase.from('trades').select('*').order('entry_date', { ascending: false })
    if (error) setError(error.message)
    else setTrades(data)
    setLoading(false)
  }

  async function handleAdd(trade) {
    const { error } = await supabase.from('trades').insert({ ...trade, user_id: user.id })
    if (error) return setError(error.message)
    setShowForm(false)
    loadTrades()
  }

  async function handleUpdate(trade) {
    const { error } = await supabase.from('trades').update(trade).eq('id', editingTrade.id)
    if (error) return setError(error.message)
    setEditingTrade(null)
    loadTrades()
  }

  async function handleDelete(trade) {
    if (!confirm(`Delete ${trade.symbol} trade?`)) return
    const { error } = await supabase.from('trades').delete().eq('id', trade.id)
    if (error) return setError(error.message)
    loadTrades()
  }

  const closedTrades = trades.filter((t) => t.exit_price != null)
  const totalPnl = closedTrades.reduce((sum, t) => sum + pnl(t), 0)
  const wins = closedTrades.filter((t) => pnl(t) >= 0).length
  const winRate = closedTrades.length ? (wins / closedTrades.length) * 100 : null

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Arche · Trade Journal</h1>
            <p className="text-xs text-neutral-500">{user.email}</p>
          </div>
          <button onClick={signOut} className="text-sm text-neutral-400 hover:text-neutral-100">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
            <p className="text-xs text-neutral-500">Total trades</p>
            <p className="text-xl font-semibold">{trades.length}</p>
          </div>
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
            <p className="text-xs text-neutral-500">Win rate</p>
            <p className="text-xl font-semibold">{winRate == null ? '—' : `${winRate.toFixed(0)}%`}</p>
          </div>
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
            <p className="text-xs text-neutral-500">Total P&amp;L</p>
            <p className={`text-xl font-semibold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {editingTrade ? (
          <TradeForm initialTrade={editingTrade} onSubmit={handleUpdate} onCancel={() => setEditingTrade(null)} />
        ) : showForm ? (
          <TradeForm onSubmit={handleAdd} onCancel={() => setShowForm(false)} />
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
          >
            + Add trade
          </button>
        )}

        {loading ? (
          <p className="text-neutral-500 text-sm">Loading…</p>
        ) : (
          <TradeTable trades={trades} onEdit={setEditingTrade} onDelete={handleDelete} />
        )}
      </main>
    </div>
  )
}
