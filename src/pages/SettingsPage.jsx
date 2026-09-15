import { useState } from 'react'
import { Download, LogOut, Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Button, Card, PageHeader } from '../components/ui'

function toCsv(rows) {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')
}

function download(filename, content) {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user, signOut } = useAuth()
  const [exporting, setExporting] = useState(false)

  async function exportTrades() {
    setExporting(true)
    const { data, error } = await supabase
      .from('trades')
      .select('symbol,direction,status,entry_price,entry_quantity,entry_date,exit_price,exit_date,fees:entry_fees,pnl,r_multiple,notes')
      .order('entry_date')
    setExporting(false)
    if (error) return alert(error.message)
    download(`arche-trades-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(data))
  }

  async function exportLedger() {
    setExporting(true)
    const { data, error } = await supabase
      .from('ledger_lines')
      .select('debit,credit,account:accounts(name,type,subtype),entry:ledger_entries(entry_date,description,source_type)')
      .order('id')
    setExporting(false)
    if (error) return alert(error.message)
    const rows = data.map((r) => ({
      date: r.entry?.entry_date,
      description: r.entry?.description,
      account: r.account?.name,
      type: r.account?.type,
      debit: r.debit,
      credit: r.credit,
    }))
    download(`arche-ledger-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows))
  }

  return (
    <div className="flex flex-col gap-8 max-w-xl">
      <PageHeader title="Settings" />

      <Card className="p-5 flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">Appearance</h2>
        <div className="flex gap-2">
          <Button variant={theme === 'light' ? 'primary' : 'secondary'} onClick={() => setTheme('light')}>
            <Sun size={15} /> Light
          </Button>
          <Button variant={theme === 'dark' ? 'primary' : 'secondary'} onClick={() => setTheme('dark')}>
            <Moon size={15} /> Dark
          </Button>
        </div>
      </Card>

      <Card className="p-5 flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">Account</h2>
        <div className="text-sm text-[var(--ink-muted)]">{user?.email}</div>
        <Button variant="secondary" className="self-start" onClick={() => signOut()}>
          <LogOut size={15} /> Sign out
        </Button>
      </Card>

      <Card className="p-5 flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">Data export</h2>
        <p className="text-sm text-[var(--ink-muted)]">
          Every number in Arche is derived from the ledger — export it any time as a plain CSV escape hatch.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={exportTrades} disabled={exporting}>
            <Download size={15} /> Trades CSV
          </Button>
          <Button variant="secondary" onClick={exportLedger} disabled={exporting}>
            <Download size={15} /> Ledger CSV
          </Button>
        </div>
      </Card>
    </div>
  )
}
