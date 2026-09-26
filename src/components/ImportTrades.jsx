import { useMemo, useState } from 'react'
import { Download, FileUp } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { downloadFile, parseCsv } from '../lib/csv'
import { FIELDS, autoMap, buildRow } from '../lib/importTrades'
import { useFundContext } from '../context/FundContext'
import { Button, Card, Field, Pill, Select, formatNumber } from './ui'

const TEMPLATE = [
  'symbol,side,entry_price,quantity,entry_date,entry_fees,exit_price,exit_date,exit_fees,notes',
  'RELIANCE,buy,2450.50,10,2026-09-01,20,2510,2026-09-05,20,breakout',
  'TCS,sell,3900,5,2026-09-08,15,,,,still open',
].join('\n')

export function ImportTrades() {
  const queryClient = useQueryClient()
  const { funds, selectedFundId } = useFundContext()
  const [fundId, setFundId] = useState(selectedFundId ?? '')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState([])
  const [map, setMap] = useState({})
  const [dmy, setDmy] = useState(false)
  const [defaultDirection, setDefaultDirection] = useState('long')
  const [progress, setProgress] = useState(null) // { done, total, failures }

  const headers = rows[0] ?? []
  const parsed = useMemo(
    () => (rows.length > 1 ? rows.slice(1).map((cells) => buildRow(cells, map, { dmy, defaultDirection })) : []),
    [rows, map, dmy, defaultDirection],
  )
  const valid = parsed.filter((p) => p.errors.length === 0)
  const invalid = parsed.length - valid.length
  const effectiveFund = fundId || selectedFundId || ''
  const importing = progress && progress.done < progress.total

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const data = parseCsv(text)
    setFileName(file.name)
    setRows(data)
    setMap(data.length ? autoMap(data[0]) : {})
    setProgress(null)
    e.target.value = ''
  }

  async function runImport() {
    setProgress({ done: 0, total: valid.length, failures: [] })
    const failures = []
    let done = 0
    for (const [i, { trade }] of parsed.entries()) {
      if (parsed[i].errors.length > 0) continue
      const line = i + 2
      const { data: tradeId, error } = await supabase.rpc('open_trade', {
        p_fund_id: effectiveFund,
        p_strategy_id: null,
        p_symbol: trade.symbol,
        p_direction: trade.direction,
        p_entry_price: trade.entryPrice,
        p_entry_quantity: trade.quantity,
        p_entry_date: trade.entryDate.toISOString(),
        p_entry_fees: trade.entryFees,
        p_stop_loss: null,
        p_target_price: null,
        p_notes: trade.notes,
        p_tags: ['imported'],
        p_rule_results: [],
      })
      if (error) {
        failures.push(`Row ${line} (${trade.symbol}): ${error.message}`)
      } else if (trade.exitPrice) {
        const { error: closeError } = await supabase.rpc('close_trade', {
          p_trade_id: tradeId,
          p_exit_price: trade.exitPrice,
          p_exit_date: trade.exitDate.toISOString(),
          p_exit_fees: trade.exitFees,
        })
        if (closeError) failures.push(`Row ${line} (${trade.symbol}): opened, but closing failed — ${closeError.message}`)
      }
      done += 1
      setProgress({ done, total: valid.length, failures: [...failures] })
    }
    for (const key of ['trades', 'fund_summary', 'account_balances', 'ledger_entries']) {
      queryClient.invalidateQueries({ queryKey: [key] })
    }
  }

  const missingRequired = FIELDS.filter((f) => f.required && map[f.id] === '')
  const finished = progress && progress.done >= progress.total

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-base">Import trades</h2>
          <p className="text-sm text-[var(--ink-muted)] mt-0.5">
            Bring in trade history from a broker or spreadsheet (CSV). Each trade is booked through the ledger, so balances stay correct.
          </p>
        </div>
        <Button variant="secondary" onClick={() => downloadFile('arche-import-template.csv', TEMPLATE)}>
          <Download size={15} /> Template
        </Button>
      </div>

      <label className="raised rounded-2xl border-dashed !border-[var(--ink-faint)]/50 px-4 py-6 flex flex-col items-center gap-1 cursor-pointer text-center hover:-translate-y-px transition-transform">
        <FileUp size={20} className="text-[var(--primary)]" />
        <span className="text-sm font-medium">{fileName || 'Choose a CSV file'}</span>
        <span className="text-xs text-[var(--ink-faint)]">First row must be the column headers</span>
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
      </label>

      {rows.length > 0 && (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Import into fund">
              <Select value={effectiveFund} onChange={(e) => setFundId(e.target.value)}>
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date format">
              <Select value={dmy ? 'dmy' : 'auto'} onChange={(e) => setDmy(e.target.value === 'dmy')}>
                <option value="auto">Auto (2026-09-01 or 09/01/2026)</option>
                <option value="dmy">Day first (01/09/2026)</option>
              </Select>
            </Field>
            <Field label="Direction when column is empty">
              <Select value={defaultDirection} onChange={(e) => setDefaultDirection(e.target.value)}>
                <option value="long">Long</option>
                <option value="short">Short</option>
              </Select>
            </Field>
          </div>

          <div>
            <div className="text-xs font-medium text-[var(--ink-muted)] mb-2">Match your columns</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {FIELDS.map((f) => (
                <Field key={f.id} label={`${f.label}${f.required ? ' *' : ''}`}>
                  <Select value={map[f.id] ?? ''} onChange={(e) => setMap({ ...map, [f.id]: e.target.value })}>
                    <option value="">— none —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `Column ${i + 1}`}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-sm">
            <Pill tone="accent">{valid.length} ready</Pill>
            {invalid > 0 && <Pill tone="red">{invalid} with problems</Pill>}
            {missingRequired.length > 0 && (
              <span className="text-[var(--red)]">Map required columns: {missingRequired.map((f) => f.label).join(', ')}</span>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl inset">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--ink-faint)] font-medium">
                  <th className="px-4 py-2">Row</th>
                  <th className="px-4 py-2">Symbol</th>
                  <th className="px-4 py-2">Dir</th>
                  <th className="px-4 py-2 text-right">Entry</th>
                  <th className="px-4 py-2 text-right">Qty</th>
                  <th className="px-4 py-2 text-right">Exit</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 8).map(({ trade, errors }, i) => (
                  <tr key={i} className="border-t border-[var(--border)]">
                    <td className="px-4 py-2 text-[var(--ink-faint)]">{i + 2}</td>
                    <td className="px-4 py-2 font-medium">{trade.symbol || '—'}</td>
                    <td className="px-4 py-2">{trade.direction}</td>
                    <td className="px-4 py-2 text-right tabular">{trade.entryPrice != null && !Number.isNaN(trade.entryPrice) ? formatNumber(trade.entryPrice) : '—'}</td>
                    <td className="px-4 py-2 text-right tabular">{trade.quantity != null && !Number.isNaN(trade.quantity) ? formatNumber(trade.quantity) : '—'}</td>
                    <td className="px-4 py-2 text-right tabular">{trade.exitPrice ? formatNumber(trade.exitPrice) : 'open'}</td>
                    <td className="px-4 py-2 text-xs">
                      {errors.length === 0 ? <span className="text-[var(--accent)]">OK</span> : <span className="text-[var(--red)]">{errors.join('; ')}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.length > 8 && <div className="px-4 py-2 text-xs text-[var(--ink-faint)]">…and {parsed.length - 8} more rows</div>}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={runImport} disabled={valid.length === 0 || !effectiveFund || importing}>
              {importing ? `Importing ${progress.done}/${progress.total}…` : `Import ${valid.length} trade${valid.length === 1 ? '' : 's'}`}
            </Button>
            {finished && (
              <span className="text-sm text-[var(--ink-muted)]">
                Imported {progress.done - progress.failures.length} of {progress.total}
                {progress.failures.length > 0 ? ` — ${progress.failures.length} failed` : ' — all done'}.
              </span>
            )}
          </div>

          {progress?.failures.length > 0 && (
            <ul className="text-sm text-[var(--red)] flex flex-col gap-1">
              {progress.failures.slice(0, 10).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  )
}
