import { useMemo, useState } from 'react'
import { Plus, ArrowDownToLine, ArrowUpFromLine, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { useFundContext } from '../context/FundContext'
import { useCreateFund, useFundSummaries, useUpdateFundStatus } from '../hooks/useFunds'
import {
  useAccountBalances,
  useAllAccountBalances,
  useFundFlows,
  useRecordFundFlow,
  useDeleteFundFlow,
  useLedgerEntries,
} from '../hooks/useLedger'
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
} from '../components/ui'

export function FundsLedgerPage() {
  const { funds, selectedFundId, selectedFund, setSelectedFundId } = useFundContext()
  const { data: summaries = [] } = useFundSummaries()
  const [newFundOpen, setNewFundOpen] = useState(false)
  const [flowOpen, setFlowOpen] = useState(null) // 'deposit' | 'withdrawal' | null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Capital & Ledger"
        title="Funds & Ledger"
        action={
          <Button onClick={() => setNewFundOpen(true)}>
            <Plus size={15} /> New fund
          </Button>
        }
      />

      <BalanceSheet />

      <FundTable
        funds={funds}
        summaries={summaries}
        selectedFundId={selectedFundId}
        onSelect={setSelectedFundId}
      />

      {selectedFund && (
        <FundDetail
          fund={selectedFund}
          onDeposit={() => setFlowOpen('deposit')}
          onWithdraw={() => setFlowOpen('withdrawal')}
        />
      )}

      <NewFundModal open={newFundOpen} onClose={() => setNewFundOpen(false)} />
      {selectedFund && <FundFlowModal type={flowOpen} fund={selectedFund} onClose={() => setFlowOpen(null)} />}
    </div>
  )
}

function BalanceSheet() {
  const { data: allBalances = [] } = useAllAccountBalances()

  const sheet = useMemo(() => {
    const byType = (type) => allBalances.filter((a) => a.type === type)
    const sum = (rows) => rows.reduce((s, a) => s + Number(a.balance), 0)

    const assets = byType('asset')
    const liabilities = byType('liability')
    const capital = byType('equity')
    const income = byType('income')
    const expense = byType('expense')

    const totalAssets = sum(assets)
    const totalLiabilities = sum(liabilities)
    const totalCapital = sum(capital)
    const retainedEarnings = sum(income) - sum(expense)
    const totalEquity = totalCapital + retainedEarnings

    return {
      assets,
      liabilities,
      capital,
      totalAssets,
      totalLiabilities,
      totalCapital,
      retainedEarnings,
      totalEquity,
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.5,
    }
  }, [allBalances])

  if (allBalances.length === 0) {
    return (
      <EmptyState
        title="No books yet"
        description="Create a fund below to seed its chart of accounts — the firm-wide balance sheet builds from there."
      />
    )
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-mono text-xs uppercase tracking-wide text-[var(--ink-muted)]">Firm balance sheet</h2>
        <span
          className={`inline-flex items-center gap-1 font-mono text-[.68rem] uppercase tracking-wide ${
            sheet.balanced ? 'text-[var(--accent)]' : 'text-[var(--red)]'
          }`}
        >
          {sheet.balanced ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
          {sheet.balanced ? 'Balanced' : 'Out of balance'}
        </span>
      </div>
      <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
        <BalanceColumn title="Assets" rows={sheet.assets} total={sheet.totalAssets} />
        <div className="flex flex-col gap-4">
          <BalanceColumn title="Liabilities" rows={sheet.liabilities} total={sheet.totalLiabilities} empty="None recorded" />
          <div>
            <div className="font-mono text-[.68rem] uppercase tracking-wide text-[var(--ink-faint)] mb-1.5">Equity</div>
            <table className="w-full text-sm">
              <tbody>
                {sheet.capital.map((a) => (
                  <tr key={a.account_id} className="border-t border-[var(--border)] first:border-0">
                    <td className="py-1 text-[var(--ink-muted)]">{a.name}</td>
                    <td className="py-1 text-right tabular">{formatCurrency(a.balance)}</td>
                  </tr>
                ))}
                <tr className="border-t border-[var(--border)]">
                  <td className="py-1 text-[var(--ink-muted)]">Retained earnings (P&amp;L)</td>
                  <td className="py-1 text-right tabular">{formatCurrency(sheet.retainedEarnings)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t border-[var(--border)] font-medium">
                  <td className="py-1.5">Total equity</td>
                  <td className="py-1.5 text-right tabular">{formatCurrency(sheet.totalEquity)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="border-t-2 border-[var(--ink)] pt-1.5 flex justify-between font-semibold text-sm">
            <span>Total liabilities + equity</span>
            <span className="tabular">{formatCurrency(sheet.totalLiabilities + sheet.totalEquity)}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}

function BalanceColumn({ title, rows, total, empty }) {
  return (
    <div>
      <div className="font-mono text-[.68rem] uppercase tracking-wide text-[var(--ink-faint)] mb-1.5">{title}</div>
      <table className="w-full text-sm">
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="py-1 text-[var(--ink-faint)]">{empty || 'None'}</td>
            </tr>
          ) : (
            rows.map((a) => (
              <tr key={a.account_id} className="border-t border-[var(--border)] first:border-0">
                <td className="py-1 text-[var(--ink-muted)]">{a.name}</td>
                <td className="py-1 text-right tabular">{formatCurrency(a.balance)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="border-t-2 border-[var(--ink)] mt-1 pt-1.5 flex justify-between font-semibold text-sm">
        <span>Total {title.toLowerCase()}</span>
        <span className="tabular">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}

function FundTable({ funds, summaries, selectedFundId, onSelect }) {
  const summaryFor = (id) => summaries.find((s) => s.fund_id === id)

  if (funds.length === 0) {
    return (
      <EmptyState
        title="No funds yet"
        description="Create your first fund — cash, holdings, capital, realized P&L, and fees accounts are seeded automatically."
      />
    )
  }

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-[var(--ink-faint)] font-mono uppercase border-b border-[var(--border)]">
            <th className="px-3 py-2 font-normal">Fund</th>
            <th className="px-3 py-2 font-normal text-right">NAV</th>
            <th className="px-3 py-2 font-normal text-right">Cash</th>
            <th className="px-3 py-2 font-normal text-right">Holdings</th>
            <th className="px-3 py-2 font-normal text-right">Capital</th>
            <th className="px-3 py-2 font-normal text-right">Realized</th>
            <th className="px-3 py-2 font-normal">Status</th>
          </tr>
        </thead>
        <tbody>
          {funds.map((fund) => {
            const s = summaryFor(fund.id)
            const nav = (Number(s?.cash_balance) || 0) + (Number(s?.holdings_value) || 0)
            const isSelected = fund.id === selectedFundId
            return (
              <tr
                key={fund.id}
                onClick={() => onSelect(fund.id)}
                className={`border-b border-[var(--border)] last:border-0 cursor-pointer ${
                  isSelected ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-2)]'
                }`}
              >
                <td className="px-3 py-2 font-medium">{fund.name}</td>
                <td className="px-3 py-2 text-right tabular font-medium">{formatCurrency(nav, fund.currency)}</td>
                <td className="px-3 py-2 text-right tabular text-[var(--ink-muted)]">{formatCurrency(s?.cash_balance, fund.currency)}</td>
                <td className="px-3 py-2 text-right tabular text-[var(--ink-muted)]">{formatCurrency(s?.holdings_value, fund.currency)}</td>
                <td className="px-3 py-2 text-right tabular text-[var(--ink-muted)]">{formatCurrency(s?.capital, fund.currency)}</td>
                <td
                  className={`px-3 py-2 text-right tabular ${
                    s?.realized_pnl > 0 ? 'text-[var(--accent)]' : s?.realized_pnl < 0 ? 'text-[var(--red)]' : 'text-[var(--ink-muted)]'
                  }`}
                >
                  {formatCurrency(s?.realized_pnl, fund.currency)}
                </td>
                <td className="px-3 py-2">
                  <Pill tone={fund.status === 'active' ? 'accent' : 'default'}>{fund.status}</Pill>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

const TABS = [
  { id: 'accounts', label: 'Chart of accounts' },
  { id: 'flows', label: 'Fund flows' },
  { id: 'ledger', label: 'Ledger activity' },
]

function FundDetail({ fund, onDeposit, onWithdraw }) {
  const [tab, setTab] = useState('accounts')
  const updateStatus = useUpdateFundStatus()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-mono text-xs uppercase tracking-wide text-[var(--ink-muted)]">{fund.name} — books</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onDeposit}>
            <ArrowDownToLine size={14} /> Deposit
          </Button>
          <Button variant="secondary" onClick={onWithdraw}>
            <ArrowUpFromLine size={14} /> Withdraw
          </Button>
          <Button
            variant="ghost"
            onClick={() => updateStatus.mutate({ id: fund.id, status: fund.status === 'active' ? 'closed' : 'active' })}
          >
            {fund.status === 'active' ? 'Close fund' : 'Reopen fund'}
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 font-mono text-[.7rem] uppercase tracking-wide border-b-2 -mb-px transition-colors ${
              tab === t.id ? 'text-[var(--accent)] border-[var(--accent)]' : 'text-[var(--ink-muted)] border-transparent hover:text-[var(--ink)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'accounts' && <ChartOfAccountsTab fund={fund} />}
      {tab === 'flows' && <FundFlowsTab fund={fund} />}
      {tab === 'ledger' && <LedgerActivityTab fund={fund} />}
    </div>
  )
}

function ChartOfAccountsTab({ fund }) {
  const { data: balances = [] } = useAccountBalances(fund.id)
  return (
    <Card className="p-4">
      <table className="w-full text-sm">
        <tbody>
          {balances.map((a) => (
            <tr key={a.account_id} className="border-t border-[var(--border)] first:border-0">
              <td className="py-1.5 text-[var(--ink-muted)]">{a.name}</td>
              <td className="py-1.5 text-[var(--ink-faint)] font-mono text-xs uppercase">{a.type}</td>
              <td className="py-1.5 text-right tabular font-medium">{formatCurrency(a.balance, fund.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function FundFlowsTab({ fund }) {
  const { data: flows = [] } = useFundFlows(fund.id)
  const deleteFlow = useDeleteFundFlow()

  if (flows.length === 0) {
    return <p className="text-sm text-[var(--ink-faint)] px-1">No deposits or withdrawals yet.</p>
  }

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-[var(--ink-faint)] font-mono uppercase border-b border-[var(--border)]">
            <th className="px-3 py-2 font-normal">Date</th>
            <th className="px-3 py-2 font-normal">Type</th>
            <th className="px-3 py-2 font-normal">Source</th>
            <th className="px-3 py-2 font-normal">Counterparty</th>
            <th className="px-3 py-2 font-normal text-right">Amount</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {flows.map((f) => (
            <tr key={f.id} className="border-b border-[var(--border)] last:border-0">
              <td className="px-3 py-2 font-mono text-xs">{format(new Date(f.flow_date), 'dd MMM yyyy')}</td>
              <td className="px-3 py-2 font-medium">{f.type === 'deposit' ? 'Deposit' : 'Withdrawal'}</td>
              <td className="px-3 py-2 text-[var(--ink-muted)]">{f.source === 'external' ? 'external' : 'firm cash'}</td>
              <td className="px-3 py-2 text-[var(--ink-muted)]">{f.counterparty || '—'}</td>
              <td className="px-3 py-2 text-right tabular font-medium">{formatCurrency(f.amount, fund.currency)}</td>
              <td className="px-3 py-2 text-right">
                <button onClick={() => deleteFlow.mutate(f.id)} className="text-[var(--ink-faint)] hover:text-[var(--red)]">
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function LedgerActivityTab({ fund }) {
  const { data: ledgerLines = [] } = useLedgerEntries(fund.id)

  if (ledgerLines.length === 0) {
    return <p className="text-sm text-[var(--ink-faint)] px-1">Nothing posted yet — open a trade or record a fund flow.</p>
  }

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-[var(--ink-faint)] font-mono uppercase border-b border-[var(--border)]">
            <th className="px-3 py-2 font-normal">Date</th>
            <th className="px-3 py-2 font-normal">Description</th>
            <th className="px-3 py-2 font-normal">Account</th>
            <th className="px-3 py-2 font-normal text-right">Debit</th>
            <th className="px-3 py-2 font-normal text-right">Credit</th>
          </tr>
        </thead>
        <tbody>
          {ledgerLines.map((row) => (
            <tr key={row.id} className="border-b border-[var(--border)] last:border-0">
              <td className="px-3 py-2 font-mono text-xs text-[var(--ink-muted)]">
                {row.entry ? format(new Date(row.entry.entry_date), 'dd MMM') : '—'}
              </td>
              <td className="px-3 py-2">{row.entry?.description}</td>
              <td className="px-3 py-2 text-[var(--ink-muted)]">{row.account?.name}</td>
              <td className="px-3 py-2 text-right tabular">{row.debit > 0 ? formatCurrency(row.debit, fund.currency) : ''}</td>
              <td className="px-3 py-2 text-right tabular">{row.credit > 0 ? formatCurrency(row.credit, fund.currency) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function NewFundModal({ open, onClose }) {
  const createFund = useCreateFund()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [currency, setCurrency] = useState('INR')

  async function handleSubmit(e) {
    e.preventDefault()
    await createFund.mutateAsync({ name, description, currency })
    setName('')
    setDescription('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="New fund">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Name">
          <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Momentum Alpha" />
        </Field>
        <Field label="Description">
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Currency">
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="INR">INR</option>
            <option value="USD">USD</option>
          </Select>
        </Field>
        <Button type="submit" disabled={createFund.isPending}>
          {createFund.isPending ? 'Creating…' : 'Create fund'}
        </Button>
      </form>
    </Modal>
  )
}

function FundFlowModal({ type, fund, onClose }) {
  const recordFlow = useRecordFundFlow()
  const [source, setSource] = useState('external')
  const [amount, setAmount] = useState('')
  const [flowDate, setFlowDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [counterparty, setCounterparty] = useState('')
  const [notes, setNotes] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    await recordFlow.mutateAsync({
      fundId: fund.id,
      type,
      source,
      amount: Number(amount),
      flowDate,
      counterparty,
      notes,
    })
    setAmount('')
    setCounterparty('')
    setNotes('')
    onClose()
  }

  return (
    <Modal open={!!type} onClose={onClose} title={type === 'deposit' ? `Deposit into ${fund.name}` : `Withdraw from ${fund.name}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Source">
          <Select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="external">External capital (money in/out of the firm)</option>
            <option value="firm_cash">Firm cash (move between firm and this fund)</option>
          </Select>
        </Field>
        <Field label="Amount">
          <Input type="number" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
        <Field label="Date">
          <Input type="date" required value={flowDate} onChange={(e) => setFlowDate(e.target.value)} />
        </Field>
        <Field label="Counterparty (optional)">
          <Input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} placeholder="e.g. own savings, broker transfer" />
        </Field>
        <Field label="Notes (optional)">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Button type="submit" disabled={recordFlow.isPending}>
          {recordFlow.isPending ? 'Posting…' : `Post ${type}`}
        </Button>
      </form>
    </Modal>
  )
}
