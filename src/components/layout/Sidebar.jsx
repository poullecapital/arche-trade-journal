import { NavLink } from 'react-router-dom'
import { BarChart3, BookOpen, Eye, Landmark, LayoutGrid, Leaf, Settings, Target, TrendingUp } from 'lucide-react'

const main = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/journal', label: 'Journal', icon: BookOpen },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/funds', label: 'Ledger', icon: Landmark },
  { to: '/watchlist', label: 'Watchlist', icon: Eye },
  { to: '/strategies', label: 'Strategies', icon: Target },
  { to: '/forecast', label: 'Forecast', icon: TrendingUp },
]

const utility = [
  { to: '/relax', label: 'Relax', icon: Leaf },
  { to: '/settings', label: 'Settings', icon: Settings },
]

function RailLink({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      className={({ isActive }) =>
        `group relative shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          isActive
            ? 'btn-3d'
            : 'text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]'
        }`
      }
    >
      <Icon size={18} strokeWidth={1.9} />
      <span className="pointer-events-none hidden md:block absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-[var(--primary)] text-[var(--primary-ink)] text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {label}
      </span>
    </NavLink>
  )
}

export function Sidebar() {
  return (
    <>
      <aside className="no-print hidden md:flex sticky top-4 self-start h-[calc(100vh-2rem)] w-[60px] shrink-0 flex-col items-center justify-between py-3 card-3d !rounded-[28px]">
        <div className="flex flex-col items-center gap-2">
          <div className="btn-3d w-10 h-10 mb-2 rounded-full flex items-center justify-center font-display text-base">
            A
          </div>
          {main.map((item) => (
            <RailLink key={item.to} {...item} />
          ))}
        </div>
        <div className="flex flex-col items-center gap-2">
          {utility.map((item) => (
            <RailLink key={item.to} {...item} />
          ))}
        </div>
      </aside>

      <nav className="no-print md:hidden fixed bottom-3 left-3 right-3 z-40 flex items-center justify-between gap-1 px-2 py-2 card-3d !rounded-full">
        {[...main, ...utility].map((item) => (
          <RailLink key={item.to} {...item} />
        ))}
      </nav>
    </>
  )
}
