import { useState } from 'react'
import { format } from 'date-fns'
import { Button, Field, Input, Select, formatCurrency, formatNumber } from '../ui'
import { EMOTIONS, MISTAKES, tagKey } from '../../lib/analytics'
import { useAddToTrade, useAmendTrade, usePartialClose, useUpdateTrade } from '../../hooks/useTrades'
import { INSTRUMENTS, instrumentColumns, usesLots } from '../../lib/instruments'

const toLocalInput = (iso) => format(new Date(iso), "yyyy-MM-dd'T'HH:mm")
const optionalNumber = (v) => (v === '' || v == null ? null : Number(v))

function Chip({ active, tone, onClick, children }) {
  const activeCls = tone === 'red' ? 'bg-[var(--red-soft)] text-[var(--red)] border-[var(--red)]' : 'btn-3d border-transparent'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
        active ? activeCls : 'raised text-[var(--ink-muted)] hover:text-[var(--ink)]'
      }`}
    >
      {children}
    </button>
  )
}

// Toggles emotion:* / mistake:* entries inside a tags array, leaving other tags alone.
export function TagPicker({ tags, onChange }) {
  const toggle = (key) => onChange(tags.includes(key) ? tags.filter((t) => t !== key) : [...tags, key])
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="text-xs font-medium text-[var(--ink-muted)] mb-1.5">How did you feel at entry?</div>
        <div className="flex flex-wrap gap-1.5">
          {EMOTIONS.map((e) => (
            <Chip key={e.id} active={tags.includes(tagKey('emotion', e.id))} onClick={() => toggle(tagKey('emotion', e.id))}>
              {e.label}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <div className="text-xs font-medium text-[var(--ink-muted)] mb-1.5">Mistakes made</div>
        <div className="flex flex-wrap gap-1.5">
          {MISTAKES.map((m) => (
            <Chip key={m.id} tone="red" active={tags.includes(tagKey('mistake', m.id))} onClick={() => toggle(tagKey('mistake', m.id))}>
              {m.label}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  )
}

function FormError({ error }) {
  return error ? <p className="text-sm text-[var(--red)]">{error.message}</p> : null
}

export function AmendForm({ trade, fund, strategies, onDone }) {
  const amend = useAmendTrade()
  const updateTrade = useUpdateTrade()
  const closed = trade.status === 'closed'
  const [f, setF] = useState({
    instrumentType: trade.instrument_type ?? 'equity',
    expiry: trade.expiry ?? '',
    strike: trade.strike != null ? String(trade.strike) : '',
    optionType: trade.option_type ?? 'CE',
    lotSize: trade.lot_size != null ? String(trade.lot_size) : '',
    symbol: trade.symbol,
    direction: trade.direction,
    strategyId: trade.strategy_id ?? '',
    entryPrice: String(trade.entry_price),
    entryQuantity: String(trade.entry_quantity),
    entryDate: toLocalInput(trade.entry_date),
    entryFees: String(trade.entry_fees ?? 0),
    stopLoss: trade.stop_loss != null ? String(trade.stop_loss) : '',
    targetPrice: trade.target_price != null ? String(trade.target_price) : '',
    exitPrice: trade.exit_price != null ? String(trade.exit_price) : '',
    exitDate: trade.exit_date ? toLocalInput(trade.exit_date) : '',
    exitFees: String(trade.exit_fees ?? 0),
  })
  const set = (key) => (e) => setF({ ...f, [key]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    await amend.mutateAsync({
      id: trade.id,
      symbol: f.symbol,
      direction: f.direction,
      strategyId: f.strategyId,
      entryPrice: Number(f.entryPrice),
      entryQuantity: Number(f.entryQuantity),
      entryDate: new Date(f.entryDate).toISOString(),
      entryFees: Number(f.entryFees || 0),
      stopLoss: optionalNumber(f.stopLoss),
      targetPrice: optionalNumber(f.targetPrice),
      exitPrice: closed ? Number(f.exitPrice) : null,
      exitDate: closed ? new Date(f.exitDate).toISOString() : null,
      exitFees: closed ? Number(f.exitFees || 0) : 0,
    })
    // Contract details sit outside the ledger, so they're saved separately.
    await updateTrade.mutateAsync({ id: trade.id, ...instrumentColumns(f) })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="inset rounded-2xl p-4 flex flex-col gap-4">
      <p className="text-xs text-[var(--ink-muted)]">
        Saving rebuilds this trade&apos;s ledger entries in {fund.name}, so P&amp;L and the balance sheet stay correct.
      </p>
      <div className="grid sm:grid-cols-4 gap-3">
        <Field label="Instrument">
          <Select value={f.instrumentType} onChange={set('instrumentType')}>
            {INSTRUMENTS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </Select>
        </Field>
        {usesLots(f.instrumentType) && (
          <>
            <Field label="Expiry">
              <Input type="date" required value={f.expiry} onChange={set('expiry')} />
            </Field>
            <Field label="Lot size">
              <Input type="number" step="any" min="0" value={f.lotSize} onChange={set('lotSize')} />
            </Field>
          </>
        )}
        {f.instrumentType === 'option' && (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Strike">
              <Input type="number" step="any" min="0" required value={f.strike} onChange={set('strike')} />
            </Field>
            <Field label="CE / PE">
              <Select value={f.optionType} onChange={set('optionType')}>
                <option value="CE">CE</option>
                <option value="PE">PE</option>
              </Select>
            </Field>
          </div>
        )}
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Symbol">
          <Input required value={f.symbol} onChange={(e) => setF({ ...f, symbol: e.target.value.toUpperCase() })} />
        </Field>
        <Field label="Direction">
          <Select value={f.direction} onChange={set('direction')}>
            <option value="long">Long</option>
            <option value="short">Short</option>
          </Select>
        </Field>
        <Field label="Strategy">
          <Select value={f.strategyId} onChange={set('strategyId')}>
            <option value="">None</option>
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Entry price">
          <Input type="number" step="any" min="0" required value={f.entryPrice} onChange={set('entryPrice')} />
        </Field>
        <Field label="Quantity">
          <Input type="number" step="any" min="0" required value={f.entryQuantity} onChange={set('entryQuantity')} />
        </Field>
        <Field label="Entry fees">
          <Input type="number" step="any" min="0" value={f.entryFees} onChange={set('entryFees')} />
        </Field>
        <Field label="Entry date">
          <Input type="datetime-local" required value={f.entryDate} onChange={set('entryDate')} />
        </Field>
        <Field label="Stop-loss">
          <Input type="number" step="any" value={f.stopLoss} onChange={set('stopLoss')} />
        </Field>
        <Field label="Target">
          <Input type="number" step="any" value={f.targetPrice} onChange={set('targetPrice')} />
        </Field>
        {closed && (
          <>
            <Field label="Exit price">
              <Input type="number" step="any" min="0" required value={f.exitPrice} onChange={set('exitPrice')} />
            </Field>
            <Field label="Exit date">
              <Input type="datetime-local" required value={f.exitDate} onChange={set('exitDate')} />
            </Field>
            <Field label="Exit fees">
              <Input type="number" step="any" min="0" value={f.exitFees} onChange={set('exitFees')} />
            </Field>
          </>
        )}
      </div>
      <FormError error={amend.error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={amend.isPending}>
          {amend.isPending || updateTrade.isPending ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function AddForm({ trade, fund, onDone }) {
  const addTo = useAddToTrade()
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [fees, setFees] = useState('0')

  const p = Number(price)
  const q = Number(quantity)
  const valid = p > 0 && q > 0
  const newQty = Number(trade.entry_quantity) + (valid ? q : 0)
  const newAvg = valid ? (Number(trade.entry_price) * Number(trade.entry_quantity) + p * q) / newQty : null

  async function handleSubmit(e) {
    e.preventDefault()
    await addTo.mutateAsync({ tradeId: trade.id, price: p, quantity: q, fees: Number(fees || 0) })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="inset rounded-2xl p-4 flex flex-col gap-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="Price">
          <Input type="number" step="any" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
        <Field label="Quantity to add">
          <Input type="number" step="any" min="0" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
        <Field label="Fees">
          <Input type="number" step="any" min="0" value={fees} onChange={(e) => setFees(e.target.value)} />
        </Field>
      </div>
      {valid && (
        <p className="text-sm text-[var(--ink-muted)]">
          New position: <b className="tabular">{formatNumber(newQty)}</b> @ average{' '}
          <b className="tabular">{formatCurrency(newAvg, fund.currency)}</b>
        </p>
      )}
      <FormError error={addTo.error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={addTo.isPending}>
          {addTo.isPending ? 'Adding…' : 'Add to position'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function PartialForm({ trade, fund, onDone }) {
  const partial = usePartialClose()
  const [quantity, setQuantity] = useState('')
  const [exitPrice, setExitPrice] = useState('')
  const [exitDate, setExitDate] = useState(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"))
  const [exitFees, setExitFees] = useState('0')

  const q = Number(quantity)
  const px = Number(exitPrice)
  const total = Number(trade.entry_quantity)
  const valid = q > 0 && q < total && px > 0
  const sign = trade.direction === 'long' ? 1 : -1
  const estimate = valid
    ? sign * (px - Number(trade.entry_price)) * q - Number(trade.entry_fees) * (q / total) - Number(exitFees || 0)
    : null

  async function handleSubmit(e) {
    e.preventDefault()
    await partial.mutateAsync({
      tradeId: trade.id,
      quantity: q,
      exitPrice: px,
      exitDate: new Date(exitDate).toISOString(),
      exitFees: Number(exitFees || 0),
    })
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="inset rounded-2xl p-4 flex flex-col gap-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label={`Quantity to sell (open: ${formatNumber(total)})`}>
          <Input type="number" step="any" min="0" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </Field>
        <Field label="Exit price">
          <Input type="number" step="any" min="0" required value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} />
        </Field>
        <Field label="Exit date">
          <Input type="datetime-local" required value={exitDate} onChange={(e) => setExitDate(e.target.value)} />
        </Field>
        <Field label="Exit fees">
          <Input type="number" step="any" min="0" value={exitFees} onChange={(e) => setExitFees(e.target.value)} />
        </Field>
      </div>
      {q >= total && <p className="text-sm text-[var(--amber)]">To exit the whole position use “Close trade” instead.</p>}
      {estimate != null && (
        <p className="text-sm text-[var(--ink-muted)]">
          Realised on this part:{' '}
          <b className={`tabular ${estimate >= 0 ? 'text-[var(--accent)]' : 'text-[var(--red)]'}`}>{formatCurrency(estimate, fund.currency)}</b>
          {' · '}remaining <b className="tabular">{formatNumber(total - q)}</b>
        </p>
      )}
      <FormError error={partial.error} />
      <div className="flex gap-2">
        <Button type="submit" disabled={partial.isPending}>
          {partial.isPending ? 'Closing…' : 'Take partial exit'}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
