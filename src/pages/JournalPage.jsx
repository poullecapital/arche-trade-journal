import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, ImagePlus, Pencil, Plus, Scissors, TrendingUp, X } from 'lucide-react'
import { format } from 'date-fns'
import { useFundContext } from '../context/FundContext'
import { useStrategies } from '../hooks/useStrategies'
import { useGoalStatus } from '../hooks/useGoals'
import { splitTags, tagLabel } from '../lib/analytics'
import { AddForm, AmendForm, PartialForm, TagPicker } from '../components/journal/TradeTools'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState('')
  const [symbolFilter, setSymbolFilter] = useState(searchParams.get('symbol') ?? '')
  const { data: trades = [] } = useTrades(selectedFund?.id, { status: statusFilter || undefined, symbol: symbolFilter || undefined })
  const [openForm, setOpenForm] = useState(false)
  const [prefill, setPrefill] = useState(null)
  const [activeTrade, setActiveTrade] = useState(null)

  // Deep links: /journal?new=1&symbol=..&entry=.. opens the log form, /journal?symbol=.. filters.
  useEffect(() => {
    if (!searchParams.toString()) return
    if (searchParams.get('new') === '1') {
      setPrefill({
        symbol: searchParams.get('symbol') ?? '',
        direction: searchParams.get('dir') === 'short' ? 'short' : 'long',
        entryPrice: searchParams.get('entry') ?? '',
        entryQuantity: searchParams.get('qty') ?? '',
        stopLoss: searchParams.get('stop') ?? '',
        targetPrice: searchParams.get('target') ?? '',
      })
      setOpenForm(true)
    } else if (searchParams.get('symbol')) {
      setSymbolFilter(searchParams.get('symbol'))
    }
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  if (!selectedFund) {
    return <EmptyState title="Pick a fund" description="Create or select a fund from Ledger before journaling trades." />
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Journal"
        subtitle={selectedFund.name}
        action={
          <Button
            onClick={() => {
              setPrefill(null)
              setOpenForm(true)
            }}
          >
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
              <tr className="text-left text-xs text-[var(--ink-faint)] font-medium border-b border-[var(--border)]">
                <th className="px-5 py-3">Symbol</th>
                <th className="px-5 py-3">Dir</th>
                <th className="px-5 py-3">Strategy</th>
                <th className="px-5 py-3">Entry</th>
                <th className="px-5 py-3">Exit</th>
                <th className="px-5 py-3 text-right">P&amp;L</th>
                <th className="px-5 py-3 text-right">R</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setActiveTrade(t)}
                  className="border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-[var(--surface-2)]"
                >
                  <td className="px-5 py-3 font-medium">
                    {t.symbol}
                    {splitTags(t.tags).mistakes.length > 0 && (
                      <span className="ml-2 align-middle" title={splitTags(t.tags).mistakes.map((m) => tagLabel('mistake', m)).join(', ')}>
                        <Pill tone="red">{splitTags(t.tags).mistakes.length} mistake{splitTags(t.tags).mistakes.length > 1 ? 's' : ''}</Pill>
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Pill tone={t.direction === 'long' ? 'accent' : 'amber'}>{t.direction}</Pill>
                  </td>
                  <td className="px-5 py-3 text-[var(--ink-muted)]">{t.strategy?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-xs">{format(new Date(t.entry_date), 'dd MMM yy')}</td>
                  <td className="px-5 py-3 text-xs">
                    {t.exit_date ? format(new Date(t.exit_date), 'dd MMM yy') : '—'}
                  </td>
                  <td
                    className={`px-5 py-3 text-right tabular font-medium ${
                      t.pnl > 0 ? 'text-[var(--accent)]' : t.pnl < 0 ? 'text-[var(--red)]' : ''
                    }`}
                  >
                    {t.pnl != null ? formatCurrency(t.pnl, selectedFund.currency) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right tabular">{t.r_multiple != null ? formatNumber(t.r_multiple) : '—'}</td>
                  <td className="px-5 py-3">
                    <Pill tone={t.status === 'open' ? 'amber' : 'default'}>{t.status}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <TradeFormModal open={openForm} fund={selectedFund} prefill={prefill} onClose={() => setOpenForm(false)} />
      <TradeDetailModal trade={activeTrade} fund={selectedFund} onClose={() => setActiveTrade(null)} />
    </div>
  )
}

function initialTradeForm() {
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

function TradeFormModal({ open, fund, prefill, onClose }) {
  const { data: strategies = [] } = useStrategies(fund.id)
  const openTrade = useOpenTrade()
  const [form, setForm] = useState(initialTradeForm)
  const [ruleChecks, setRuleChecks] = useState({})
  const [tagged, setTagged] = useState([])
  const goals = useGoalStatus()

  useEffect(() => {
    if (open) {
      setForm({ ...initialTradeForm(), ...prefill })
      setRuleChecks({})
      setTagged([])
    }
  }, [open, prefill])

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
      tags: [...(form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : []), ...tagged],
      ruleResults,
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={`Log trade — ${fund.name}`} wide>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {goals.breaches.map((b) => (
          <div key={b} className="flex items-start gap-2 rounded-xl bg-[var(--red-soft)] text-[var(--red)] px-3 py-2 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {b}
          </div>
        ))}
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

        <TagPicker tags={tagged} onChange={setTagged} />

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
  const [tags, setTags] = useState([])
  const [mode, setMode] = useState(null) // 'edit' | 'add' | 'partial' | null
  const { data: strategies = [] } = useStrategies(fund.id)

  useEffect(() => {
    if (trade) {
      setNotes(trade.notes || '')
      setTags(trade.tags || [])
      setMode(null)
    }
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

  function handleTags(next) {
    setTags(next)
    updateTrade.mutate({ id: trade.id, tags: next })
  }

  const toggleMode = (m) => setMode(mode === m ? null : m)
  const freeTags = splitTags(tags).free

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

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => toggleMode('edit')}>
            <Pencil size={14} /> Edit details
          </Button>
          {trade.status === 'open' && (
            <>
              <Button variant="secondary" onClick={() => toggleMode('add')}>
                <TrendingUp size={14} /> Add to position
              </Button>
              <Button variant="secondary" onClick={() => toggleMode('partial')}>
                <Scissors size={14} /> Partial exit
              </Button>
            </>
          )}
        </div>
        {mode === 'edit' && <AmendForm trade={trade} fund={fund} strategies={strategies} onDone={onClose} />}
        {mode === 'add' && <AddForm trade={trade} fund={fund} onDone={onClose} />}
        {mode === 'partial' && <PartialForm trade={trade} fund={fund} onDone={onClose} />}

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

        <div className="border-t border-[var(--border)] pt-4 flex flex-col gap-3">
          <div className="text-xs font-medium text-[var(--ink-muted)]">Review</div>
          <TagPicker tags={tags} onChange={handleTags} />
          {freeTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {freeTags.map((t) => (
                <Pill key={t}>{t}</Pill>
              ))}
            </div>
          )}
        </div>

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
      <div className="text-xs text-[var(--ink-faint)] font-medium">{label}</div>
      <div className={`tabular font-medium ${toneClass}`}>{value}</div>
    </div>
  )
}
