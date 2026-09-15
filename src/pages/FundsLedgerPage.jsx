import { useState } from 'react'
import { Plus, ArrowDownToLine, ArrowUpFromLine, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { useFundContext } from '../context/FundContext'
import { useCreateFund, useFundSummaries, useFirmSummary, useUpdateFundStatus } from '../hooks/useFunds'
import { useAccountBalances, useFundFlows, useRecordFundFlow, useDeleteFundFlow, useLedgerEntries } from '../hooks/useLedger'
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
  Stat,
  Textarea,
  formatCurrency,
} from '../components/ui'

export function FundsLedgerPage() {
  const { funds, selectedFundId, selectedFund, setSelectedFundId } = useFundContext()
  const { data: summaries = [] } = useFundSummaries()
  const { data: firm } = useFirmSummary()
  const [newFundOpen, setNewFundOpen] = useState(false)
  const [flowOpen, setFlowOpen] = useState(null) // 'deposit' | 'withdrawal' | null

  const summaryFor = (id) => summaries.find((s) => s.fund_id === id)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Capital & Ledger"
        title="Funds & Ledger"
        action={
          <Button onClick={() => setNewFundOpen(true)}>
            <Plus size={16} /> New fund
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Firm cash (unallocated)" value={formatCurrency(firm?.firm_cash)} />
        <Stat label="Firm capital" value={formatCurrency(firm?.firm_capital)} />
        <Stat label="Funds" value={funds.length} />
        <Stat
          label="Total NAV"
          value={formatCurrency(summaries.reduce((s, f) => s + Number(f.cash_balance) + Number(f.holdings_value), 0))}
        />
      </div>

      {funds.length === 0 ? (
        <EmptyState
          title="No funds yet"
          description="Create your first fund to seed its chart of accounts — cash, holdings, capital, realized P&L, and fees are set up automatically."
          action={<Button onClick={() => setNewFundOpen(true)}>Create a fund</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {funds.map((fund) => {
            const s = summaryFor(fund.id)
            const nav = (Number(s?.cash_balance) || 0) + (Number(s?.holdings_value) || 0)
            const isSelected = fund.id === selectedFundId
            return (
              <Card
                key={fund.id}
                onClick={() => setSelectedFundId(fund.id)}
                className={`p-4 cursor-pointer flex flex-col gap-2 ${
                  isSelected ? 'ring-2 ring-[var(--accent)]' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-semibold">{fund.name}</span>
                  <Pill tone={fund.status === 'active' ? 'accent' : 'default'}>{fund.status}</Pill>
                </div>
                <div className="tabular text-xl font-semibold">{formatCurrency(nav, fund.currency)}</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[var(--ink-muted)] font-mono">
                  <span>Cash · {formatCurrency(s?.cash_balance, fund.currency)}</span>
                  <span>Holdings · {formatCurrency(s?.holdings_value, fund.currency)}</span>
                  <span>Realized · {formatCurrency(s?.realized_pnl, fund.currency)}</span>
                  <span>Fees · {formatCurrency(s?.fees_paid, fund.currency)}</span>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {selectedFund && (
        <FundDetail
          fund={selectedFund}
          onDeposit={() => setFlowOpen('deposit')}
          onWithdraw={() => setFlowOpen('withdrawal')}
        />
      )}

      <NewFundModal open={newFundOpen} onClose={() => setNewFundOpen(false)} />
      {selectedFund && (
        <FundFlowModal type={flowOpen} fund={selectedFund} onClose={() => setFlowOpen(null)} />
      )}
    </div>
  )
}

function FundDetail({ fund, onDeposit, onWithdraw }) {
  const { data: balances = [] } = useAccountBalances(fund.id)
  const { data: flows = [] } = useFundFlows(fund.id)
  const { data: ledgerLines = [] } = useLedgerEntries(fund.id)
  const deleteFlow = useDeleteFundFlow()
  const updateStatus = useUpdateFundStatus()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display text-xl font-semibold">{fund.name} — books</h2>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onDeposit}>
            <ArrowDownToLine size={15} /> Deposit
          </Button>
          <Button variant="secondary" onClick={onWithdraw}>
            <ArrowUpFromLine size={15} /> Withdraw
          </Button>
          <Button
            variant="ghost"
            onClick={() =>
              updateStatus.mutate({ id: fund.id, status: fund.status === 'active' ? 'closed' : 'active' })
            }
          >
            {fund.status === 'active' ? 'Close fund' : 'Reopen fund'}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <Card className="p-4">
          <h3 className="font-medium text-sm mb-3">Chart of accounts</h3>
          <table className="w-full text-sm">
            <tbody>
              {balances.map((a) => (
                <tr key={a.account_id} className="border-t border-[var(--border)] first:border-0">
                  <td className="py-1.5 text-[var(--ink-muted)]">{a.name}</td>
                  <td className="py-1.5 text-right tabular font-medium">{formatCurrency(a.balance, fund.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-4">
          <h3 className="font-medium text-sm mb-3">Fund flows</h3>
          {flows.length === 0 ? (
            <p className="text-sm text-[var(--ink-faint)]">No deposits or withdrawals yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {flows.map((f) => (
                <li key={f.id} className="flex items-center justify-between text-sm border-t border-[var(--border)] first:border-0 pt-2 first:pt-0">
                  <div>
                    <span className="font-medium">{f.type === 'deposit' ? 'Deposit' : 'Withdrawal'}</span>
                    <span className="text-[var(--ink-faint)] ml-2 font-mono text-xs">
                      {format(new Date(f.flow_date), 'dd MMM yyyy')} · {f.source === 'external' ? 'external' : 'firm cash'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular font-medium">{formatCurrency(f.amount, fund.currency)}</span>
                    <button onClick={() => deleteFlow.mutate(f.id)} className="text-[var(--ink-faint)] hover:text-[var(--red)]">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <h3 className="font-medium text-sm mb-3">Recent ledger activity</h3>
        {ledgerLines.length === 0 ? (
          <p className="text-sm text-[var(--ink-faint)]">Nothing posted yet — open a trade or record a fund flow.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[var(--ink-faint)] font-mono uppercase">
                  <th className="pb-2 font-normal">Date</th>
                  <th className="pb-2 font-normal">Description</th>
                  <th className="pb-2 font-normal">Account</th>
                  <th className="pb-2 font-normal text-right">Debit</th>
                  <th className="pb-2 font-normal text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {ledgerLines.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--border)]">
                    <td className="py-1.5 font-mono text-xs text-[var(--ink-muted)]">
                      {row.entry ? format(new Date(row.entry.entry_date), 'dd MMM') : '—'}
                    </td>
                    <td className="py-1.5">{row.entry?.description}</td>
                    <td className="py-1.5 text-[var(--ink-muted)]">{row.account?.name}</td>
                    <td className="py-1.5 text-right tabular">{row.debit > 0 ? formatCurrency(row.debit, fund.currency) : ''}</td>
                    <td className="py-1.5 text-right tabular">{row.credit > 0 ? formatCurrency(row.credit, fund.currency) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
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
