import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { useFundContext } from '../context/FundContext'
import { useStrategies } from '../hooks/useStrategies'
import { useGoals, useGoalStatus } from '../hooks/useGoals'
import { useFundSummaries } from '../hooks/useFunds'
import { riskToStop, tradeRiskWarnings } from '../lib/goals'
import { INSTRUMENTS, instrumentColumns, instrumentLabel, usesLots } from '../lib/instruments'
import { EMOTIONS, MISTAKES, splitTags, tagKey, tagLabel } from '../lib/analytics'
import { TagPicker } from '../components/journal/TradeTools'
import { TradeDetailModal } from '../components/journal/TradeDetailModal'
import {
  useTrades,
  useOpenTrade,
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
  const { funds, selectedFund, scopeName } = useFundContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState('')
  const [symbolFilter, setSymbolFilter] = useState(searchParams.get('symbol') ?? '')
  const [strategyFilter, setStrategyFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [instrumentFilter, setInstrumentFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const { data: strategies = [] } = useStrategies(selectedFund?.id)
  const { data: trades = [] } = useTrades(selectedFund?.id, {
    status: statusFilter === 'open' ? 'open' : statusFilter ? 'closed' : undefined,
    symbol: symbolFilter || undefined,
  })

  // Outcome, strategy, tag and entry-date filters run on the fetched rows.
  const shown = useMemo(
    () =>
      trades.filter((t) => {
        if (statusFilter === 'won' && !(t.pnl > 0)) return false
        if (statusFilter === 'lost' && !(t.pnl < 0)) return false
        if (strategyFilter === 'none' ? t.strategy_id : strategyFilter && t.strategy_id !== strategyFilter) return false
        if (tagFilter && !(t.tags || []).includes(tagFilter)) return false
        if (instrumentFilter && t.instrument_type !== instrumentFilter) return false
        const entered = format(new Date(t.entry_date), 'yyyy-MM-dd')
        if (fromDate && entered < fromDate) return false
        if (toDate && entered > toDate) return false
        return true
      }),
    [trades, statusFilter, strategyFilter, tagFilter, instrumentFilter, fromDate, toDate],
  )
  const filtering = !!(statusFilter || symbolFilter || strategyFilter || tagFilter || instrumentFilter || fromDate || toDate)
  function clearFilters() {
    setStatusFilter('')
    setSymbolFilter('')
    setStrategyFilter('')
    setTagFilter('')
    setInstrumentFilter('')
    setFromDate('')
    setToDate('')
  }
  const [openForm, setOpenForm] = useState(false)
  const [prefill, setPrefill] = useState(null)
  const [activeTradeId, setActiveTradeId] = useState(null)

  // Deep links: /journal?new=1&symbol=..&entry=.. opens the log form, /journal?trade=<id> opens a trade,
  // /journal?symbol=.. filters.
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
        fundId: searchParams.get('fund') ?? undefined,
      })
      setOpenForm(true)
    } else if (searchParams.get('trade')) {
      setActiveTradeId(searchParams.get('trade'))
    } else if (searchParams.get('symbol')) {
      setSymbolFilter(searchParams.get('symbol'))
    }
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams])

  if (funds.length === 0) {
    return <EmptyState title="No funds yet" description="Create a fund in Ledger before journaling trades." />
  }

  const fundOf = (t) => funds.find((f) => f.id === t.fund_id)
  const activeTrade = trades.find((t) => t.id === activeTradeId)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Journal"
        subtitle={scopeName}
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

      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="!w-40"
          placeholder="Symbol…"
          value={symbolFilter}
          onChange={(e) => setSymbolFilter(e.target.value)}
        />
        <Select aria-label="Outcome" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="!w-auto">
          <option value="">All trades</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="won">Winners</option>
          <option value="lost">Losers</option>
        </Select>
        <Select aria-label="Instrument" value={instrumentFilter} onChange={(e) => setInstrumentFilter(e.target.value)} className="!w-auto">
          <option value="">Any instrument</option>
          {INSTRUMENTS.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </Select>
        <Select aria-label="Strategy" value={strategyFilter} onChange={(e) => setStrategyFilter(e.target.value)} className="!w-auto">
          <option value="">Any strategy</option>
          <option value="none">No strategy</option>
          {strategies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Tag" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="!w-auto">
          <option value="">Any tag</option>
          <optgroup label="Mistakes">
            {MISTAKES.map((m) => (
              <option key={m.id} value={tagKey('mistake', m.id)}>
                {m.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Emotions">
            {EMOTIONS.map((m) => (
              <option key={m.id} value={tagKey('emotion', m.id)}>
                {m.label}
              </option>
            ))}
          </optgroup>
        </Select>
        <div className="flex items-center gap-1.5 text-xs text-[var(--ink-muted)]">
          <Input type="date" aria-label="Entered from" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} className="!w-auto" />
          to
          <Input type="date" aria-label="Entered to" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} className="!w-auto" />
        </div>
        {filtering && (
          <Button variant="ghost" onClick={clearFilters}>
            Clear · {shown.length} shown
          </Button>
        )}
      </div>

      {shown.length === 0 && filtering ? (
        <EmptyState title="No matching trades" description="Nothing matches these filters." action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>} />
      ) : shown.length === 0 ? (
        <EmptyState
          title="No trades yet"
          description={`Log your first trade${selectedFund ? ` in ${selectedFund.name}` : ''} to start the journal.`}
          action={<Button onClick={() => setOpenForm(true)}>Log trade</Button>}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--ink-faint)] font-medium border-b border-[var(--border)]">
                <th className="px-5 py-3">Symbol</th>
                <th className="px-5 py-3">Dir</th>
                {!selectedFund && <th className="px-5 py-3">Fund</th>}
                <th className="px-5 py-3">Strategy</th>
                <th className="px-5 py-3">Entry</th>
                <th className="px-5 py-3">Exit</th>
                <th className="px-5 py-3 text-right">P&amp;L</th>
                <th className="px-5 py-3 text-right">R</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setActiveTradeId(t.id)}
                  className="border-b border-[var(--border)] last:border-0 cursor-pointer hover:bg-[var(--surface-2)]"
                >
                  <td className="px-5 py-3 font-medium">
                    {instrumentLabel(t)}
                    {splitTags(t.tags).mistakes.length > 0 && (
                      <span className="ml-2 align-middle" title={splitTags(t.tags).mistakes.map((m) => tagLabel('mistake', m)).join(', ')}>
                        <Pill tone="red">{splitTags(t.tags).mistakes.length} mistake{splitTags(t.tags).mistakes.length > 1 ? 's' : ''}</Pill>
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Pill tone={t.direction === 'long' ? 'accent' : 'amber'}>{t.direction}</Pill>
                  </td>
                  {!selectedFund && <td className="px-5 py-3 text-[var(--ink-muted)]">{t.fund?.name ?? '—'}</td>}
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
                    {t.pnl != null ? formatCurrency(t.pnl, t.fund?.currency) : '—'}
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

      <TradeFormModal
        open={openForm}
        funds={funds}
        defaultFundId={prefill?.fundId ?? selectedFund?.id ?? funds[0].id}
        prefill={prefill}
        onClose={() => setOpenForm(false)}
      />
      {activeTrade && fundOf(activeTrade) && (
        <TradeDetailModal trade={activeTrade} fund={fundOf(activeTrade)} onClose={() => setActiveTradeId(null)} />
      )}
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
    instrumentType: 'equity',
    lots: '',
    lotSize: '',
    expiry: '',
    strike: '',
    optionType: 'CE',
  }
}

function TradeFormModal({ open, funds, defaultFundId, prefill, onClose }) {
  const [fundId, setFundId] = useState(defaultFundId)
  const fund = funds.find((f) => f.id === fundId) ?? funds[0]
  const { data: strategies = [] } = useStrategies(fund.id)
  const openTrade = useOpenTrade()
  const [form, setForm] = useState(initialTradeForm)
  const [ruleChecks, setRuleChecks] = useState({})
  const [tagged, setTagged] = useState([])
  const goals = useGoalStatus()
  const [rules] = useGoals()
  const { data: summaries = [] } = useFundSummaries()
  const summary = summaries.find((s) => s.fund_id === fund.id)
  const nav = summary ? Number(summary.cash_balance) + Number(summary.holdings_value) : null
  // F&O is entered as lots × lot size; everything is stored as total units.
  const lotBased = usesLots(form.instrumentType)
  const quantity = lotBased ? Number(form.lots) * Number(form.lotSize) : Number(form.entryQuantity)
  const planned = {
    direction: form.direction,
    entryPrice: Number(form.entryPrice),
    stopLoss: form.stopLoss === '' ? null : Number(form.stopLoss),
    quantity,
  }
  const plannedRisk = riskToStop(planned)
  // Only judge the trade once price and size are in.
  const riskWarnings = planned.entryPrice > 0 && planned.quantity > 0 ? tradeRiskWarnings(planned, rules, nav) : []

  useEffect(() => {
    if (open) {
      setFundId(defaultFundId)
      setForm({ ...initialTradeForm(), ...prefill })
      setRuleChecks({})
      setTagged([])
    }
  }, [open, prefill, defaultFundId])

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
      entryQuantity: quantity,
      instrument: instrumentColumns(form),
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
        {funds.length > 1 && (
          <Field label="Fund">
            <Select
              value={fund.id}
              onChange={(e) => {
                setFundId(e.target.value)
                setForm({ ...form, strategyId: '' })
                setRuleChecks({})
              }}
            >
              {funds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <div className="grid sm:grid-cols-4 gap-4">
          <Field label="Instrument">
            <Select value={form.instrumentType} onChange={(e) => setForm({ ...form, instrumentType: e.target.value })}>
              {INSTRUMENTS.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </Select>
          </Field>
          {lotBased && (
            <Field label="Expiry">
              <Input type="date" required value={form.expiry} onChange={(e) => setForm({ ...form, expiry: e.target.value })} />
            </Field>
          )}
          {form.instrumentType === 'option' && (
            <>
              <Field label="Strike">
                <Input type="number" step="any" min="0" required value={form.strike} onChange={(e) => setForm({ ...form, strike: e.target.value })} />
              </Field>
              <Field label="Call / Put">
                <Select value={form.optionType} onChange={(e) => setForm({ ...form, optionType: e.target.value })}>
                  <option value="CE">CE (call)</option>
                  <option value="PE">PE (put)</option>
                </Select>
              </Field>
            </>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label={lotBased ? 'Underlying' : 'Symbol'}>
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
          <Field label={form.instrumentType === 'option' ? 'Entry premium' : 'Entry price'}>
            <Input
              type="number"
              step="0.01"
              required
              value={form.entryPrice}
              onChange={(e) => setForm({ ...form, entryPrice: e.target.value })}
            />
          </Field>
          {lotBased ? (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Lots">
                <Input type="number" step="any" min="0" required value={form.lots} onChange={(e) => setForm({ ...form, lots: e.target.value })} />
              </Field>
              <Field label={quantity > 0 ? `Lot size · ${formatNumber(quantity)} units` : 'Lot size'}>
                <Input type="number" step="any" min="0" required value={form.lotSize} onChange={(e) => setForm({ ...form, lotSize: e.target.value })} />
              </Field>
            </div>
          ) : (
            <Field label="Quantity">
              <Input
                type="number"
                step="any"
                required
                value={form.entryQuantity}
                onChange={(e) => setForm({ ...form, entryQuantity: e.target.value })}
              />
            </Field>
          )}
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

        {plannedRisk != null && (
          <p className="text-sm text-[var(--ink-muted)]">
            Risk to stop: <span className="tabular font-medium text-[var(--ink)]">{formatCurrency(plannedRisk, fund.currency)}</span>
            {nav > 0 && <> · {((plannedRisk / nav) * 100).toFixed(2)}% of {fund.name}</>}
          </p>
        )}
        {riskWarnings.map((w) => (
          <div key={w} className="flex items-start gap-2 rounded-xl bg-[var(--amber-soft)] text-[var(--amber)] px-3 py-2 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {w}
          </div>
        ))}

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
