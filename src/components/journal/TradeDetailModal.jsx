import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle2, ImagePlus, Pencil, RotateCcw, Scissors, TrendingUp, X } from 'lucide-react'
import { useStrategies } from '../../hooks/useStrategies'
import { splitTags } from '../../lib/analytics'
import { daysToExpiry, instrumentLabel, instrumentName } from '../../lib/instruments'
import { AddForm, AmendForm, PartialForm, TagPicker } from './TradeTools'
import { useCloseTrade, useUpdateTrade, useDeleteTrade, useUploadScreenshot, useScreenshotUrl } from '../../hooks/useTrades'
import { Button, Field, Input, Modal, Pill, Textarea, formatCurrency, formatNumber } from '../ui'

// A single trade: details, close / scale / amend, and the review — tags, rule
// grading, notes, screenshots, and marking it reviewed. `onReviewed` lets the
// review queue move straight on to the next trade.
export function TradeDetailModal({ trade, fund, onClose, onReviewed }) {
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

  // Grade the trade against its strategy's rules; ungraded rules are left out.
  const strategy = strategies.find((s) => s.id === trade.strategy_id)
  const ruleResults = trade.rule_results || []
  function gradeRule(ruleId, passed) {
    const current = ruleResults.find((r) => r.rule_id === ruleId)?.passed
    const next = ruleResults.filter((r) => r.rule_id !== ruleId)
    if (current !== passed) next.push({ rule_id: ruleId, passed })
    updateTrade.mutate({ id: trade.id, rule_results: next })
  }

  async function handleMarkReviewed() {
    await updateTrade.mutateAsync({ id: trade.id, notes, reviewed_at: new Date().toISOString() })
    if (onReviewed) onReviewed(trade)
    else onClose()
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
    <Modal open={!!trade} onClose={onClose} title={`${instrumentLabel(trade)} · ${trade.direction}`} wide>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Info label="Entry" value={`${formatCurrency(trade.entry_price, fund.currency)} × ${formatNumber(trade.entry_quantity)}`} />
          <Info label="Stop / Target" value={`${trade.stop_loss ?? '—'} / ${trade.target_price ?? '—'}`} />
          <Info label="Status" value={trade.status} />
          {trade.instrument_type !== 'equity' && (
            <Info
              label={instrumentName(trade.instrument_type)}
              value={[
                trade.lot_size && `${formatNumber(trade.entry_quantity / trade.lot_size)} lots of ${formatNumber(trade.lot_size)}`,
                daysToExpiry(trade) != null && (daysToExpiry(trade) < 0 ? 'expired' : `${daysToExpiry(trade)}d to expiry`),
              ]
                .filter(Boolean)
                .join(' · ') || '—'}
            />
          )}
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

        {strategy?.rules?.length > 0 && (
          <div>
            <div className="text-xs text-[var(--ink-muted)] font-medium mb-1.5">Rules · {strategy.name}</div>
            <ul className="flex flex-col gap-1.5">
              {strategy.rules.map((rule) => {
                const passed = ruleResults.find((r) => r.rule_id === rule.id)?.passed
                return (
                  <li key={rule.id} className="flex items-center justify-between gap-3 text-sm">
                    <span>{rule.label}</span>
                    <span className="flex gap-1 shrink-0">
                      {[
                        [true, 'Followed', 'accent'],
                        [false, 'Broke', 'red'],
                      ].map(([value, label, tone]) => (
                        <button key={label} type="button" onClick={() => gradeRule(rule.id, value)}>
                          <Pill tone={passed === value ? tone : 'default'}>{label}</Pill>
                        </button>
                      ))}
                    </span>
                  </li>
                )
              })}
            </ul>
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

        {trade.status === 'closed' && (
          <div className="border-t border-[var(--border)] pt-4 flex items-center justify-between gap-3 flex-wrap">
            {trade.reviewed_at ? (
              <>
                <span className="flex items-center gap-1.5 text-sm text-[var(--accent)]">
                  <CheckCircle2 size={16} /> Reviewed {format(new Date(trade.reviewed_at), 'dd MMM yy')}
                </span>
                <Button variant="ghost" onClick={() => updateTrade.mutate({ id: trade.id, reviewed_at: null })}>
                  <RotateCcw size={14} /> Back to review queue
                </Button>
              </>
            ) : (
              <>
                <span className="text-sm text-[var(--ink-muted)]">Tag it, grade the rules and add notes, then:</span>
                <Button onClick={handleMarkReviewed} disabled={updateTrade.isPending}>
                  <CheckCircle2 size={15} /> Mark reviewed
                </Button>
              </>
            )}
          </div>
        )}

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
