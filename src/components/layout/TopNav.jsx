import { NavLink } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useFundContext } from '../../context/FundContext'
import { Select } from '../ui'

const items = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/journal', label: 'Journal' },
  { to: '/strategies', label: 'Strategies' },
  { to: '/funds', label: 'Ledger' },
  { to: '/watchlist', label: 'Watchlist' },
  { to: '/forecast', label: 'Forecast' },
  { to: '/relax', label: 'Relax' },
  { to: '/settings', label: 'Settings' },
]

export function TopNav() {
  const { theme, toggleTheme } = useTheme()
  const { funds, selectedFundId, setSelectedFundId } = useFundContext()

  return (
    <header className="sticky top-0 z-40 bg-[var(--surface)] border-b border-[var(--border)]">
      <div className="flex items-center gap-3 px-4 md:px-6 h-12 max-w-[1400px] mx-auto">
        <div className="font-display text-sm shrink-0 tracking-tight">
          Arch<span className="text-[var(--accent)]">e</span>
        </div>

        <nav className="flex items-center gap-0.5 overflow-x-auto flex-1 h-full">
          {items.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `shrink-0 h-full flex items-center px-2.5 font-mono text-[.7rem] uppercase tracking-wide border-b-2 transition-colors ${
                  isActive
                    ? 'text-[var(--accent)] border-[var(--accent)]'
                    : 'text-[var(--ink-muted)] border-transparent hover:text-[var(--ink)]'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {funds.length > 0 ? (
            <Select
              value={selectedFundId ?? ''}
              onChange={(e) => setSelectedFundId(e.target.value)}
              className="!w-auto !py-1 text-xs"
            >
              {funds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          ) : (
            <span className="hidden sm:inline text-xs text-[var(--ink-faint)] font-mono">no funds</span>
          )}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-sm text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </div>
    </header>
  )
}
