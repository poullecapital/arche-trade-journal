import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calculator } from 'lucide-react'
import { Button, Field, Input, Modal, formatCurrency, formatNumber } from './ui'
import { useFundContext } from '../context/FundContext'
import { useFundSummaries } from '../hooks/useFunds'
import { useGoals } from '../hooks/useGoals'

const num = (v) => (v === '' ? NaN : Number(v))

function Row({ label, value, tone }) {
  const cls = tone === 'good' ? 'text-[var(--accent)]' : tone === 'bad' ? 'text-[var(--red)]' : ''
  return (
    <div className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
      <span className="text-sm text-[var(--ink-muted)]">{label}</span>
      <span className={`tabular font-semibold ${cls}`}>{value}</span>
    </div>
  )
}

export function PositionCalculator({ open, onClose }) {
  const navigate = useNavigate()
  const { selectedFund } = useFundContext()
  const { data: summaries = [] } = useFundSummaries()
  const summary = summaries.find((s) => s.fund_id === selectedFund?.id)
  const currency = selectedFund?.currency ?? 'INR'
  const defaultCapital = summary ? Number(summary.cash_balance) : NaN

  const [symbol, setSymbol] = useState('')
  const [capitalInput, setCapitalInput] = useState('')
  const [goals] = useGoals()
  // Until edited, risk per trade follows the limit in Goals & risk limits.
  const [riskInput, setRiskPct] = useState(null)
  const riskPct = riskInput ?? (goals.maxRiskPct || '1')
  const [entry, setEntry] = useState('')
  const [stop, setStop] = useState('')
  const [target, setTarget] = useState('')

  const capital = capitalInput !== '' ? num(capitalInput) : defaultCapital
  const e = num(entry)
  const s = num(stop)
  const t = num(target)
  const risk = num(riskPct)

  const valid = e > 0 && s > 0 && e !== s && capital > 0 && risk > 0
  let calc = null
  if (valid) {
    const direction = s < e ? 'long' : 'short'
    const riskPerUnit = Math.abs(e - s)
    const riskAmount = (capital * risk) / 100
    const byRisk = Math.floor(riskAmount / riskPerUnit)
    const byCapital = Math.floor(capital / e)
    const quantity = Math.max(0, Math.min(byRisk, byCapital))
    const targetOk = t > 0 && (direction === 'long' ? t > e : t < e)
    const rewardPerUnit = targetOk ? Math.abs(t - e) : null
    calc = {
      direction,
      quantity,
      cappedByCapital: byCapital < byRisk,
      value: quantity * e,
      risk: quantity * riskPerUnit,
      riskPctActual: (quantity * riskPerUnit * 100) / capital,
      rr: rewardPerUnit ? rewardPerUnit / riskPerUnit : null,
      reward: rewardPerUnit ? quantity * rewardPerUnit : null,
      targetWrongSide: t > 0 && !targetOk,
    }
  }

  function logTrade() {
    const params = new URLSearchParams({ new: '1', dir: calc.direction, entry, qty: String(calc.quantity), stop })
    if (symbol) params.set('symbol', symbol.toUpperCase())
    if (calc.rr && target) params.set('target', target)
    onClose()
    navigate(`/journal?${params.toString()}`)
  }

  return (
    <Modal open={open} onClose={onClose} title="Position size calculator">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Symbol (optional)">
            <Input value={symbol} onChange={(ev) => setSymbol(ev.target.value.toUpperCase())} placeholder="e.g. ITC" />
          </Field>
          <Field label={`Risk per trade (%)`}>
            <Input type="number" step="0.1" min="0" value={riskPct} onChange={(ev) => setRiskPct(ev.target.value)} />
          </Field>
        </div>
        <Field label={`Capital ${selectedFund && capitalInput === '' && summary ? `— cash in ${selectedFund.name}` : ''}`}>
          <Input
            type="number"
            step="any"
            min="0"
            value={capitalInput}
            onChange={(ev) => setCapitalInput(ev.target.value)}
            placeholder={Number.isFinite(defaultCapital) ? String(Math.round(defaultCapital)) : 'Enter capital'}
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Entry">
            <Input type="number" step="any" min="0" value={entry} onChange={(ev) => setEntry(ev.target.value)} />
          </Field>
          <Field label="Stop-loss">
            <Input type="number" step="any" min="0" value={stop} onChange={(ev) => setStop(ev.target.value)} />
          </Field>
          <Field label="Target">
            <Input type="number" step="any" min="0" value={target} onChange={(ev) => setTarget(ev.target.value)} />
          </Field>
        </div>

        <div className="inset rounded-2xl px-4 py-1">
          {calc ? (
            <>
              <Row label="Direction" value={calc.direction === 'long' ? 'Long' : 'Short'} />
              <Row label="Quantity" value={formatNumber(calc.quantity, 0)} tone="good" />
              <Row label="Position value" value={formatCurrency(calc.value, currency)} />
              <Row label="Capital at risk" value={`${formatCurrency(calc.risk, currency)} (${formatNumber(calc.riskPctActual, 2)}%)`} tone="bad" />
              <Row label="Reward if target hit" value={calc.reward != null ? formatCurrency(calc.reward, currency) : '—'} tone={calc.reward != null ? 'good' : undefined} />
              <Row label="Risk : reward" value={calc.rr != null ? `1 : ${formatNumber(calc.rr, 2)}` : '—'} />
            </>
          ) : (
            <p className="text-sm text-[var(--ink-faint)] py-3">Enter an entry and stop-loss to size the position.</p>
          )}
        </div>

        {calc?.cappedByCapital && (
          <p className="text-xs text-[var(--amber)]">Quantity is capped by available capital — the risk-based size would need more than you have.</p>
        )}
        {calc?.targetWrongSide && <p className="text-xs text-[var(--amber)]">Target is on the wrong side of entry for a {calc.direction} trade — ignored.</p>}
        {calc && calc.quantity === 0 && <p className="text-xs text-[var(--red)]">Risk budget is too small for even one unit at this stop distance.</p>}

        <Button onClick={logTrade} disabled={!calc || calc.quantity < 1}>
          <Calculator size={15} /> Log this trade
        </Button>
      </div>
    </Modal>
  )
}
