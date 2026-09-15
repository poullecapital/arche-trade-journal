import { useEffect, useState } from 'react'
import { Plus, ImagePlus, X } from 'lucide-react'
import { format } from 'date-fns'
import { useFundContext } from '../context/FundContext'
import { useStrategies } from '../hooks/useStrategies'
import {
  useTrades,
  useOpenTrade,
  useCloseTrade,
  useUpdateTrade,
  useDeleteTrade,
  useUploadScreenshot,
  useScreenshotUrl,
} from '../hooks/useTrades'
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Pill,
  Select,
  Textarea,
  formatCurrency,
  formatNumber,
} from '../components/ui'

export function JournalPage() {
  const { selectedFund } = useFundContext()
  const [statusFilter, setStatusFilter] = useState('')
  const [symbolFilter, setSymbolFilter] = useState('')
  const { data: trades = [] } = useTrades(selectedFund?.id, { status: statusFilter || undefined, symbol: symbolFilter || undefined })
  const [openForm, setOpenForm] = useState(false)
  const [activeTrade, setActiveTrade] = useState(null)

  if (!selectedFund) {
    return <EmptyState title="Pick a fund" description="Create or select a fund from Funds & Ledger before journaling trades." />
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Trading Discipline"
        title="Journal"
        action={
          <Button onClick={() => setOpenForm(true)}>
            <Plus size={16} /> Log trade
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="!w-auto">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </Select>
        <Input
          className="!w-48"
          placeholder="Filter by symbol…"
          value={symbolFilter}
          onChange={(e) => setSymbolFilter(e.target.value)}
        />
      </div>

      {trades.length === 0 ? (
        <EmptyState
          title="No trades yet"
          description={`Log your first trade in ${selectedFund.name} to start the journal.`}
          action={<Button onClick={() => setOpenForm(true)}>Log trade</Button>}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--ink-faint)] font-mono uppercase border-b border-[var(--border)]">
                <th className="px-4 py-2 font-normal">Symbol</th>
                <th className="px-4 py-2 font-normal">Dir</th>
                <th className="px-4 py-2 font-normal">Strategy</th>
                <th className="px-4 py-2 font-normal">Entry</th>
                <th className="px-4 py-2 font-normal">Exit</th>
                <th className="px-4 py-2 font-normal text-right">P&amp;L</th>
                <th className="px-4 py-2 font-normal text-right">R</th>
                <th className="px-4 py-2 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setActiveTrade(t)}
                  className="border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-[var(--surface-2)]"
                >
                  <td className="px-4 py-2 font-medium">{t.symbol}</td>
                  <td className="px-4 py-2">
                    <Pill tone={t.direction === 'long' ? 'accent' : 'amber'}>{t.direction}</Pill>
                  </td>
                  <td className="px-4 py-2 text-[var(--ink-muted)]">{t.strategy?.name ?? '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs">{format(new Date(t.entry_date), 'dd MMM yy')}</td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {t.exit_date ? format(new Date(t.exit_date), 'dd MMM yy') : '—'}
                  </td>
                  <td
                    className={`px-4 py-2 text-right tabular font-medium ${
                      t.pnl > 0 ? 'text-[var(--accent)]' : t.pnl < 0 ? 'text-[var(--red)]' : ''
                    }`}
                  >
                    {t.pnl != null ? formatCurrency(t.pnl, selectedFund.currency) : '—'}
                  </td>
                  <td className="px-4 py-2 text-right tabular">{t.r_multiple != null ? formatNumber(t.r_multiple) : '—'}</td>
                  <td className="px-4 py-2">
                    <Pill tone={t.status === 'open' ? 'amber' : 'default'}>{t.status}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <TradeFormModal open={openForm} fund={selectedFund} onClose={() => setOpenForm(false)} />
      <TradeDetailModal trade={activeTrade} fund={selectedFund} onClose={() => setActiveTrade(null)} />
    </div>
  )
}

function TradeFormModal({ open, fund, onClose }) {
  const { data: strategies = [] } = useStrategies(fund.id)
  const openTrade = useOpenTrade()
  const [form, setForm] = useState(initialForm())
  const [ruleChecks, setRuleChecks] = useState({})

  useEffect(() => {
    if (open) {
      setForm(initialForm())
      setRuleChecks({})
    }
  }, [open])

  function initialForm() {
    return {
      symbol: '',
      direction: 'long',
      strategyId: '',
      entryPrice: '',
      entryQuantity: '',
      entryDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      entryFees: '0',
      stopLoss: '',
      targetPrice: '',
      notes: '',
      tags: '',
    }
  }

  const strategy = strategies.find((s) => s.id === form.strategyId)

  async function handleSubmit(e) {
    e.preventDefault()
    const ruleResults = (strategy?.rules || []).map((r) => ({ rule_id: r.id, passed: !!ruleChecks[r.id] }))
    await openTrade.mutateAsync({
      fundId: fund.id,
      strategyId: form.strategyId || null,
      symbol: form.symbol,
      direction: form.direction,
      entryPrice: Number(form.entryPrice),
      entryQuantity: Number(form.entryQuantity),
      entryDate: new Date(form.entryDate).toISOString(),
      entryFees: Number(form.entryFees || 0),
      stopLoss: form.stopLoss ? Number(form.stopLoss) : null,
      targetPrice: form.targetPrice ? Number(form.targetPrice) : null,
      notes: form.notes,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      ruleResults,
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Log trade — ${fund.name}`} wide>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Symbol">
            <Input
              required
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
            />
          </Field>
          <Field label="Direction">
            <Select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </Select>
          </Field>
          <Field label="Strategy">
            <Select value={form.strategyId} onChange={(e) => setForm({ ...form, strategyId: e.target.value })}>
              <option value="">None</option>
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Entry price">
            <Input
              type="number"
              step="0.01"
              required
              value={form.entryPrice}
              onChange={(e) => setForm({ ...form, entryPrice: e.target.value })}
            />
          </Field>
          <Field label="Quantity">
            <Input
              type="number"
              step="any"
              required
              value={form.entryQuantity}
              onChange={(e) => setForm({ ...form, entryQuantity: e.target.value })}
            />
          </Field>
          <Field label="Entry date">
            <Input
              type="datetime-local"
              required
              value={form.entryDate}
              onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Entry fees">
            <Input type="number" step="0.01" value={form.entryFees} onChange={(e) => setForm({ ...form, entryFees: e.target.value })} />
          </Field>
          <Field label="Stop loss">
            <Input type="number" step="0.01" value={form.stopLoss} onChange={(e) => setForm({ ...form, stopLoss: e.target.value })} />
          </Field>
          <Field label="Target">
            <Input type="number" step="0.01" value={form.targetPrice} onChange={(e) => setForm({ ...form, targetPrice: e.target.value })} />
          </Field>
        </div>

        {strategy?.rules?.length > 0 && (
          <Field label="Rule checklist">
            <div className="flex flex-col gap-1.5">
              {strategy.rules.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!ruleChecks[r.id]}
                    onChange={(e) => setRuleChecks({ ...ruleChecks, [r.id]: e.target.checked })}
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </Field>
        )}

        <Field label="Tags (comma separated)">
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="breakout, earnings" />
        </Field>

        <Field label="Notes — reasoning / emotion">
          <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>

        <Button type="submit" disabled={openTrade.isPending}>
          {openTrade.isPending ? 'Opening…' : 'Open trade'}
        </Button>
      </form>
    </Modal>
  )
}

function TradeDetailModal({ trade, fund, onClose }) {
  const closeTrade = useCloseTrade()
  const updateTrade = useUpdateTrade()
  const deleteTrade = useDeleteTrade()
  const uploadScreenshot = useUploadScreenshot()

  const [exitPrice, setExitPrice] = useState('')
  const [exitDate, setExitDate] = useState(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [exitFees, setExitFees] = useState('0')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (trade) setNotes(trade.notes || '')
  }, [trade?.id])

  if (!trade) return null

  async function handleClose(e) {
    e.preventDefault()
    await closeTrade.mutateAsync({
      tradeId: trade.id,
      exitPrice: Number(exitPrice),
      exitDate: new Date(exitDate).toISOString(),
      exitFees: Number(exitFees || 0),
    })
    onClose()
  }

  async function handleSaveNotes() {
    await updateTrade.mutateAsync({ id: trade.id, notes })
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const path = await uploadScreenshot.mutateAsync(file)
    await updateTrade.mutateAsync({ id: trade.id, screenshots: [...(trade.screenshots || []), path] })
  }

  return (
    <Modal open={!!trade} onClose={onClose} title={`${trade.symbol} · ${trade.direction}`} wide>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Info label="Entry" value={`${formatCurrency(trade.entry_price, fund.currency)} × ${formatNumber(trade.entry_quantity)}`} />
          <Info label="Stop / Target" value={`${trade.stop_loss ?? '—'} / ${trade.target_price ?? '—'}`} />
          <Info label="Status" value={trade.status} />
          {trade.status === 'closed' && (
            <>
              <Info label="Exit" value={formatCurrency(trade.exit_price, fund.currency)} />
              <Info
                label="P&L"
                value={formatCurrency(trade.pnl, fund.currency)}
                tone={trade.pnl > 0 ? 'positive' : trade.pnl < 0 ? 'negative' : undefined}
              />
              <Info label="R-multiple" value={trade.r_multiple != null ? formatNumber(trade.r_multiple) : '—'} />
            </>
          )}
        </div>

        {trade.rule_results?.length > 0 && (
          <div>
            <div className="text-xs text-[var(--ink-muted)] font-medium mb-1.5">Rule adherence</div>
            <div className="flex flex-wrap gap-1.5">
              {trade.rule_results.map((r) => (
                <Pill key={r.rule_id} tone={r.passed ? 'accent' : 'red'}>
                  {r.passed ? 'followed' : 'broke'} rule
                </Pill>
              ))}
            </div>
          </div>
        )}

        {trade.status === 'open' && (
          <form onSubmit={handleClose} className="border-t border-[var(--border)] pt-4 grid sm:grid-cols-3 gap-3 items-end">
            <Field label="Exit price">
              <Input type="number" step="0.01" required value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} />
            </Field>
            <Field label="Exit date">
              <Input type="datetime-local" required value={exitDate} onChange={(e) => setExitDate(e.target.value)} />
            </Field>
            <Field label="Exit fees">
              <Input type="number" step="0.01" value={exitFees} onChange={(e) => setExitFees(e.target.value)} />
            </Field>
            <Button type="submit" className="sm:col-span-3" disabled={closeTrade.isPending}>
              {closeTrade.isPending ? 'Closing…' : 'Close trade'}
            </Button>
          </form>
        )}

        <div className="border-t border-[var(--border)] pt-4 flex flex-col gap-2">
          <Field label="Notes">
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={handleSaveNotes} />
          </Field>
        </div>

        <div className="border-t border-[var(--border)] pt-4">
          <div className="text-xs text-[var(--ink-muted)] font-medium mb-2">Screenshots</div>
          <div className="flex flex-wrap gap-2">
            {(trade.screenshots || []).map((path) => (
              <Screenshot key={path} path={path} />
            ))}
            <label className="w-20 h-20 flex items-center justify-center border border-dashed border-[var(--border)] rounded-lg cursor-pointer text-[var(--ink-faint)] hover:text-[var(--accent)] hover:border-[var(--accent)]">
              <ImagePlus size={18} />
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
          </div>
        </div>

        <button
          onClick={() => {
            deleteTrade.mutate(trade.id)
            onClose()
          }}
          className="self-start text-xs text-[var(--ink-faint)] hover:text-[var(--red)] flex items-center gap-1 mt-2"
        >
          <X size={13} /> Delete trade
        </button>
      </div>
    </Modal>
  )
}

function Screenshot({ path }) {
  const { data: url } = useScreenshotUrl(path)
  if (!url) return <div className="w-20 h-20 rounded-lg bg-[var(--surface-2)] animate-pulse" />
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="Trade screenshot" className="w-20 h-20 object-cover rounded-lg border border-[var(--border)]" />
    </a>
  )
}

function Info({ label, value, tone }) {
  const toneClass = tone === 'positive' ? 'text-[var(--accent)]' : tone === 'negative' ? 'text-[var(--red)]' : ''
  return (
    <div>
      <div className="text-xs text-[var(--ink-faint)] font-mono uppercase">{label}</div>
      <div className={`tabular font-medium ${toneClass}`}>{value}</div>
    </div>
  )
}
