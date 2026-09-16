import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  NotebookPen,
  ListChecks,
  Landmark,
  Eye,
  TrendingUp,
  Coffee,
  Settings,
} from 'lucide-react'

const items = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/journal', label: 'Journal', icon: NotebookPen },
  { to: '/strategies', label: 'Strategies', icon: ListChecks },
  { to: '/funds', label: 'Funds & Ledger', icon: Landmark },
  { to: '/watchlist', label: 'Watchlist', icon: Eye },
  { to: '/forecast', label: 'Forecast', icon: TrendingUp },
  { to: '/relax', label: 'Relax', icon: Coffee },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] px-3 py-5 gap-6">
      <div className="px-2">
        <div className="font-display italic font-bold text-2xl text-[var(--ink)]">
          Arch<span className="text-[var(--accent)]">e</span>
        </div>
        <div className="text-[.68rem] text-[var(--ink-faint)] font-mono mt-0.5">Poulle Capital</div>
      </div>
      <nav className="flex flex-col gap-0.5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-medium'
                  : 'text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export function MobileNav() {
  return (
    <nav className="md:hidden flex items-center gap-1 overflow-x-auto border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
      {items.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium ${
              isActive ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--ink-muted)]'
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
