import { useState } from 'react'
import { AlertTriangle, Target } from 'lucide-react'
import { Button, Card, Field, Input, Modal, formatCurrency } from './ui'
import { useGoalStatus, useGoals } from '../hooks/useGoals'
import { DEFAULT_GOALS, hasGoals } from '../lib/goals'

function Meter({ label, value, caption, ratio, invert = false }) {
  const pct = Math.max(0, Math.min(ratio, 1)) * 100
  // Targets are good when full; limits turn amber, then red, as they fill up.
  const fill = invert
    ? ratio >= 1
      ? 'var(--red)'
      : ratio >= 0.75
        ? 'var(--amber)'
        : 'var(--primary)'
    : ratio >= 1
      ? 'var(--accent)'
      : 'var(--primary)'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-[var(--ink-muted)]">{label}</span>
        <span className="tabular text-sm font-semibold">{value}</span>
      </div>
      <div className="inset h-3 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(180deg, color-mix(in srgb, ${fill} 65%, white), ${fill})`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35)',
          }}
        />
      </div>
      <div className="text-xs text-[var(--ink-faint)]">{caption}</div>
    </div>
  )
}

export function GoalsCard() {
  const [goals] = useGoals()
  const status = useGoalStatus()
  const [editing, setEditing] = useState(false)

  if (!hasGoals(goals)) {
    return (
      <>
        <Card className="p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="btn-3d w-10 h-10 rounded-full flex items-center justify-center">
              <Target size={18} />
            </div>
            <div>
              <div className="font-display text-base">Set trading goals</div>
              <div className="text-sm text-[var(--ink-muted)]">A monthly target and daily limits keep you disciplined.</div>
            </div>
          </div>
          <Button onClick={() => setEditing(true)}>Set goals</Button>
        </Card>
        <GoalsModal open={editing} onClose={() => setEditing(false)} />
      </>
    )
  }

  const { monthPnl, todayPnl, tradesToday, target, maxLoss, maxTrades, breaches } = status
  const riskRules = [goals.maxRiskPct !== '' && `Max ${goals.maxRiskPct}% risk per trade`, goals.requireStop && 'Stop-loss required']
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      <Card className="p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base">Goals &amp; limits</h2>
            {riskRules && <div className="text-xs text-[var(--ink-faint)] mt-0.5">{riskRules}</div>}
          </div>
          <Button variant="ghost" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>

        {breaches.map((b) => (
          <div key={b} className="flex items-start gap-2 rounded-xl bg-[var(--red-soft)] text-[var(--red)] px-3 py-2 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {b}
          </div>
        ))}

        <div className="grid md:grid-cols-3 gap-6">
          {target != null && (
            <Meter
              label="Monthly target"
              value={`${formatCurrency(monthPnl)} / ${formatCurrency(target)}`}
              ratio={target > 0 ? monthPnl / target : 0}
              caption={target > 0 ? `${Math.round((monthPnl / target) * 100)}% of target this month` : ''}
            />
          )}
          {maxLoss != null && (
            <Meter
              label="Daily loss limit"
              value={`${formatCurrency(Math.max(0, -todayPnl))} / ${formatCurrency(maxLoss)}`}
              ratio={maxLoss > 0 ? Math.max(0, -todayPnl) / maxLoss : 0}
              invert
              caption={todayPnl >= 0 ? `Today: ${formatCurrency(todayPnl)} — no loss so far` : `Today: ${formatCurrency(todayPnl)}`}
            />
          )}
          {maxTrades != null && (
            <Meter
              label="Trades today"
              value={`${tradesToday} / ${maxTrades}`}
              ratio={maxTrades > 0 ? tradesToday / maxTrades : 0}
              invert
              caption={tradesToday >= maxTrades ? 'Limit reached' : `${maxTrades - tradesToday} left today`}
            />
          )}
        </div>
      </Card>
      <GoalsModal open={editing} onClose={() => setEditing(false)} />
    </>
  )
}

function GoalsModal({ open, onClose }) {
  const [goals, save] = useGoals()
  const [draft, setDraft] = useState(goals)

  // Re-seed the form from the saved goals each time it opens.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setDraft(goals)
  }

  const set = (key) => (e) => setDraft({ ...draft, [key]: e.target.value })

  function handleSubmit(e) {
    e.preventDefault()
    save(draft)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Goals & risk limits">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-[var(--ink-muted)]">
          Applies across all funds and every device. Leave a field empty to switch it off.
        </p>
        <Field label="Monthly profit target">
          <Input type="number" min="0" step="any" value={draft.monthlyTarget} onChange={set('monthlyTarget')} placeholder="e.g. 25000" />
        </Field>
        <Field label="Max loss per day">
          <Input type="number" min="0" step="any" value={draft.maxDailyLoss} onChange={set('maxDailyLoss')} placeholder="e.g. 5000" />
        </Field>
        <Field label="Max trades per day">
          <Input type="number" min="1" step="1" value={draft.maxTradesPerDay} onChange={set('maxTradesPerDay')} placeholder="e.g. 3" />
        </Field>
        <Field label="Max risk per trade (% of the fund's value)">
          <Input type="number" min="0.01" max="100" step="any" value={draft.maxRiskPct} onChange={set('maxRiskPct')} placeholder="e.g. 1" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.requireStop} onChange={(e) => setDraft({ ...draft, requireStop: e.target.checked })} />
          Require a stop-loss on every trade
        </label>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            Save goals
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              save(DEFAULT_GOALS)
              onClose()
            }}
          >
            Clear
          </Button>
        </div>
      </form>
    </Modal>
  )
}
