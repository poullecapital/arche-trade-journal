import { NavLink } from 'react-router-dom'
import { BarChart3, BookOpen, ClipboardCheck, Eye, Landmark, NotebookPen, Settings, Sun, Target } from 'lucide-react'
import { LogoMark } from '../ui'
import { useReviewQueue } from '../../hooks/useReviewQueue'

// Navigation grouped by what you're doing: today's session, recording trades,
// learning from them, planning the next ones, and the money behind it all.
// `mobile` marks the items that fit the phone bar; the rest are a ⌘K away.
const groups = [
  { title: null, items: [{ to: '/', label: 'Today', icon: Sun, end: true, mobile: true }] },
  {
    title: 'Journal',
    items: [
      { to: '/journal', label: 'Trades', icon: BookOpen, end: true, mobile: true },
      { to: '/journal/daily', label: 'Daily journal', icon: NotebookPen, mobile: true },
      { to: '/journal/review', label: 'Review', icon: ClipboardCheck, badge: 'review', mobile: true },
    ],
  },
  { title: 'Insights', items: [{ to: '/analytics', label: 'Analytics', icon: BarChart3, mobile: true }] },
  {
    title: 'Playbook',
    items: [
      { to: '/strategies', label: 'Strategies', icon: Target },
      { to: '/watchlist', label: 'Watchlist', icon: Eye },
    ],
  },
  { title: 'Money', items: [{ to: '/funds', label: 'Funds & ledger', icon: Landmark, mobile: true }] },
]

const settings = { to: '/settings', label: 'Settings', icon: Settings, mobile: true }

function NavItem({ to, label, icon: Icon, end, count }) {
  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      className={({ isActive }) =>
        `group relative shrink-0 h-10 w-10 lg:w-full rounded-full flex items-center justify-center lg:justify-start lg:gap-3 lg:px-3.5 text-sm font-medium transition-colors ${
          isActive ? 'btn-3d' : 'text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]'
        }`
      }
    >
      <Icon size={18} strokeWidth={1.9} className="shrink-0" />
      <span className="hidden lg:inline truncate">{label}</span>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 lg:static lg:ml-auto min-w-[1.15rem] h-[1.15rem] px-1 rounded-full bg-[var(--amber)] text-white text-[.65rem] font-semibold flex items-center justify-center tabular">
          {count}
        </span>
      )}
      <span className="pointer-events-none hidden md:block lg:hidden absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-[var(--primary)] text-[var(--primary-ink)] text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
        {label}
      </span>
    </NavLink>
  )
}

export function Sidebar() {
  const { queue } = useReviewQueue()
  const counts = { review: queue.length }
  const item = (it) => <NavItem key={it.to} {...it} count={it.badge ? counts[it.badge] : 0} />

  return (
    <>
      <aside className="no-print hidden md:flex sticky top-4 self-start h-[calc(100vh-2rem)] w-[60px] lg:w-[208px] shrink-0 flex-col justify-between py-3 lg:px-3 card-3d !rounded-[28px]">
        <div className="flex flex-col items-center lg:items-stretch gap-1">
          <div className="flex items-center gap-2.5 mb-3 lg:px-1.5">
            <LogoMark className="w-10 h-10 shrink-0" />
            <span className="hidden lg:inline font-display text-lg">Arche</span>
          </div>
          {groups.map((g, i) => (
            <div key={g.title ?? i} className="flex flex-col items-center lg:items-stretch gap-1">
              {g.title && (
                <>
                  <div className="hidden lg:block px-3.5 pt-3 pb-1 text-[.68rem] font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
                    {g.title}
                  </div>
                  <div className="lg:hidden w-6 my-1 border-t border-[var(--border)]" />
                </>
              )}
              {g.items.map(item)}
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center lg:items-stretch">
          {item(settings)}
        </div>
      </aside>

      <nav className="no-print md:hidden fixed bottom-3 left-3 right-3 z-40 flex items-center justify-between gap-1 px-2 py-2 card-3d !rounded-full">
        {[...groups.flatMap((g) => g.items), settings].filter((it) => it.mobile).map(item)}
      </nav>
    </>
  )
}
