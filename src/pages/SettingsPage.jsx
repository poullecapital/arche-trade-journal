import { useState } from 'react'
import { Download, Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabase'
import { Button, Card, PageHeader } from '../components/ui'
import { ImportTrades } from '../components/ImportTrades'
import { downloadFile as download, toCsv } from '../lib/csv'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
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
    <div className="flex flex-col gap-5 max-w-3xl">
      <PageHeader title="Settings" subtitle="Appearance and data export" />

      <Card className="p-5 flex flex-col gap-4">
        <h2 className="font-display text-base">Appearance</h2>
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
        <h2 className="font-display text-base">Data export</h2>
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

      <ImportTrades />
    </div>
  )
}
