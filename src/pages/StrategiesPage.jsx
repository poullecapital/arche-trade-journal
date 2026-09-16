import { useEffect, useMemo, useState } from 'react'
import { Plus, X, Trash2, Pencil } from 'lucide-react'
import { useFundContext } from '../context/FundContext'
import { useStrategies, useUpsertStrategy, useDeleteStrategy } from '../hooks/useStrategies'
import { useAllTrades } from '../hooks/useTrades'
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pill, Select, Textarea, formatCurrency } from '../components/ui'

function adherenceStatsFor(strategyId, trades) {
  const closed = trades.filter((t) => t.strategy_id === strategyId && t.status === 'closed' && t.rule_results?.length > 0)
  if (closed.length === 0) return null

  const followed = closed.filter((t) => t.rule_results.every((r) => r.passed))
  const broke = closed.filter((t) => !t.rule_results.every((r) => r.passed))
  const avg = (list) => (list.length ? list.reduce((s, t) => s + Number(t.pnl || 0), 0) / list.length : null)

  return {
    total: closed.length,
    adherencePct: Math.round((followed.length / closed.length) * 100),
    avgPnlFollowed: avg(followed),
    avgPnlBroke: avg(broke),
  }
}

export function StrategiesPage() {
  const { selectedFundId, funds } = useFundContext()
  const { data: strategies = [] } = useStrategies(selectedFundId)
  const { data: allTrades = [] } = useAllTrades()
  const deleteStrategy = useDeleteStrategy()
  const [editing, setEditing] = useState(null) // strategy object or 'new' or null

  const adherenceByStrategy = useMemo(() => {
    const map = {}
    for (const s of strategies) map[s.id] = adherenceStatsFor(s.id, allTrades)
    return map
  }, [strategies, allTrades])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Trading Discipline"
        title="Strategies"
        action={
          <Button onClick={() => setEditing('new')} disabled={!selectedFundId}>
            <Plus size={16} /> New strategy
          </Button>
        }
      />

      {strategies.length === 0 ? (
        <EmptyState
          title="No strategies yet"
          description="Define entry/exit rules and a playbook before you trade it — every trade you journal will tag back to a strategy."
          action={<Button onClick={() => setEditing('new')}>Create a strategy</Button>}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {strategies.map((s) => (
            <Card key={s.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display font-semibold">{s.name}</div>
                  {s.summary && <div className="text-sm text-[var(--ink-muted)]">{s.summary}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Pill tone={s.status === 'active' ? 'accent' : 'default'}>{s.status}</Pill>
                  <button onClick={() => setEditing(s)} className="text-[var(--ink-faint)] hover:text-[var(--ink)]">
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => deleteStrategy.mutate(s.id)}
                    className="text-[var(--ink-faint)] hover:text-[var(--red)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {s.rules?.length > 0 && (
                <ul className="text-sm text-[var(--ink-muted)] flex flex-col gap-1">
                  {s.rules.map((r) => (
                    <li key={r.id} className="flex items-start gap-2">
                      <span className="text-[var(--accent)] mt-0.5">›</span>
                      {r.label}
                    </li>
                  ))}
                </ul>
              )}
              {s.playbook && (
                <p className="text-sm text-[var(--ink-faint)] whitespace-pre-wrap line-clamp-4">{s.playbook}</p>
              )}
              {adherenceByStrategy[s.id] && (
                <div className="border-t border-[var(--border)] pt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-[var(--ink-faint)] font-mono uppercase">Adherence</div>
                    <div className="tabular font-medium">{adherenceByStrategy[s.id].adherencePct}%</div>
                  </div>
                  <div>
                    <div className="text-[var(--ink-faint)] font-mono uppercase">Avg P&amp;L · followed</div>
                    <div className="tabular font-medium text-[var(--accent)]">
                      {adherenceByStrategy[s.id].avgPnlFollowed != null ? formatCurrency(adherenceByStrategy[s.id].avgPnlFollowed) : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--ink-faint)] font-mono uppercase">Avg P&amp;L · broke rules</div>
                    <div className="tabular font-medium text-[var(--red)]">
                      {adherenceByStrategy[s.id].avgPnlBroke != null ? formatCurrency(adherenceByStrategy[s.id].avgPnlBroke) : '—'}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <StrategyModal
        open={!!editing}
        strategy={editing === 'new' ? null : editing}
        fundId={selectedFundId}
        funds={funds}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}

function emptyRule() {
  return { id: crypto.randomUUID(), label: '' }
}

function StrategyModal({ open, strategy, fundId, funds, onClose }) {
  const upsert = useUpsertStrategy()
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [playbook, setPlaybook] = useState('')
  const [status, setStatus] = useState('active')
  const [scopeFundId, setScopeFundId] = useState(fundId || '')
  const [rules, setRules] = useState([emptyRule()])

  useEffect(() => {
    if (!open) return
    if (strategy) {
      setName(strategy.name)
      setSummary(strategy.summary || '')
      setPlaybook(strategy.playbook || '')
      setStatus(strategy.status)
      setScopeFundId(strategy.fund_id || '')
      setRules(strategy.rules?.length ? strategy.rules : [emptyRule()])
    } else {
      setName('')
      setSummary('')
      setPlaybook('')
      setStatus('active')
      setScopeFundId(fundId || '')
      setRules([emptyRule()])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, strategy?.id])

  async function handleSubmit(e) {
    e.preventDefault()
    await upsert.mutateAsync({
      id: strategy?.id,
      name,
      summary,
      playbook,
      status,
      fund_id: scopeFundId || null,
      rules: rules.filter((r) => r.label.trim()),
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={strategy ? 'Edit strategy' : 'New strategy'} wide>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Name">
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Applies to">
            <Select value={scopeFundId} onChange={(e) => setScopeFundId(e.target.value)}>
              <option value="">All funds</option>
              {funds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Summary">
          <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One line on the setup" />
        </Field>

        <Field label="Rule checklist">
          <div className="flex flex-col gap-2">
            {rules.map((rule, i) => (
              <div key={rule.id} className="flex gap-2">
                <Input
                  value={rule.label}
                  onChange={(e) => {
                    const next = [...rules]
                    next[i] = { ...rule, label: e.target.value }
                    setRules(next)
                  }}
                  placeholder={`Rule ${i + 1}, e.g. "Price above 50 EMA"`}
                />
                <button
                  type="button"
                  onClick={() => setRules(rules.filter((_, j) => j !== i))}
                  className="text-[var(--ink-faint)] hover:text-[var(--red)] px-1"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <Button type="button" variant="secondary" className="self-start" onClick={() => setRules([...rules, emptyRule()])}>
              <Plus size={14} /> Add rule
            </Button>
          </div>
        </Field>

        <Field label="Playbook">
          <Textarea
            rows={5}
            value={playbook}
            onChange={(e) => setPlaybook(e.target.value)}
            placeholder="Context, chart examples, reasoning for why this strategy works…"
          />
        </Field>

        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="retired">Retired</option>
          </Select>
        </Field>

        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending ? 'Saving…' : 'Save strategy'}
        </Button>
      </form>
    </Modal>
  )
}
