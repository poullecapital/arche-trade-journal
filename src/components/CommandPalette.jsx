import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, BookOpen, Calculator, ClipboardCheck, NotebookPen, CornerDownLeft, Eye, Landmark, Leaf, LogOut, Moon, Plus, Search, Settings, Sun, Target, TrendingUp } from 'lucide-react'
import { Card } from './ui'
import { useAllTrades } from '../hooks/useTrades'
import { useFundContext } from '../context/FundContext'
import { useStrategies } from '../hooks/useStrategies'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

const PAGES = [
  { label: 'Today', to: '/', icon: Sun, keywords: 'home overview dashboard plan review positions' },
  { label: 'Trades', to: '/journal', icon: BookOpen, keywords: 'journal filter' },
  { label: 'Daily journal', to: '/journal/daily', icon: NotebookPen, keywords: 'plan review lessons diary' },
  { label: 'Review queue', to: '/journal/review', icon: ClipboardCheck, keywords: 'unreviewed grade' },
  { label: 'Analytics', to: '/analytics', icon: BarChart3, keywords: 'stats performance calendar report mistakes' },
  { label: 'Forecast', to: '/analytics?tab=forecast', icon: TrendingUp, keywords: 'monte carlo projection' },
  { label: 'Strategies', to: '/strategies', icon: Target, keywords: 'rules playbook' },
  { label: 'Watchlist', to: '/watchlist', icon: Eye, keywords: 'ideas setups' },
  { label: 'Funds & ledger', to: '/funds', icon: Landmark, keywords: 'funds holdings balance sheet books deposit withdraw' },
  { label: 'Settings', to: '/settings', icon: Settings, keywords: 'import export csv' },
]

export function CommandPalette({ open, onClose, onCalculator, onBreak }) {
  const navigate = useNavigate()
  const { selectedFundId } = useFundContext()
  const { data: trades = [] } = useAllTrades()
  const { data: strategies = [] } = useStrategies(selectedFundId)
  const { toggleTheme } = useTheme()
  const { signOut } = useAuth()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const listRef = useRef(null)

  // Fresh query each time the palette opens.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setQuery('')
      setIndex(0)
    }
  }

  const groups = useMemo(() => {
    const go = (to) => () => navigate(to)
    const actions = [
      { label: 'Log a trade', icon: Plus, run: go('/journal?new=1'), keywords: 'add new open entry' },
      { label: 'Position size calculator', icon: Calculator, run: onCalculator, keywords: 'risk quantity sizing' },
      { label: 'Take a break', icon: Leaf, run: onBreak, keywords: 'relax breathe timer focus ambient' },
      { label: 'New fund', icon: Landmark, run: go('/funds?new=1'), keywords: 'create' },
      { label: 'New strategy', icon: Target, run: go('/strategies?new=1'), keywords: 'create rules' },
      { label: 'Toggle light / dark theme', icon: Moon, run: toggleTheme, keywords: 'appearance' },
      { label: 'Sign out', icon: LogOut, run: signOut, keywords: 'logout' },
    ]
    const symbolCounts = {}
    for (const t of trades) symbolCounts[t.symbol] = (symbolCounts[t.symbol] || 0) + 1
    const symbols = Object.entries(symbolCounts).map(([symbol, count]) => ({
      label: symbol,
      hint: `${count} trade${count === 1 ? '' : 's'} in Journal`,
      icon: BookOpen,
      run: go(`/journal?symbol=${encodeURIComponent(symbol)}`),
    }))
    return [
      { title: 'Pages', items: PAGES.map((p) => ({ ...p, run: go(p.to) })) },
      { title: 'Actions', items: actions },
      { title: 'Symbols', items: symbols },
      { title: 'Strategies', items: strategies.map((s) => ({ label: s.name, hint: 'Strategy', icon: Target, run: go('/strategies') })) },
    ]
  }, [navigate, onCalculator, onBreak, toggleTheme, signOut, trades, strategies])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return groups
      .map((g) => ({
        title: g.title,
        items: g.items.filter((it) => !q || `${it.label} ${it.keywords ?? ''}`.toLowerCase().includes(q)).slice(0, q ? 8 : g.title === 'Pages' ? PAGES.length : 7),
      }))
      .filter((g) => g.items.length > 0 && (q || g.title === 'Pages' || g.title === 'Actions'))
  }, [groups, query])

  const flat = filtered.flatMap((g) => g.items)

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [index])

  if (!open) return null

  function choose(item) {
    onClose()
    item.run()
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((i) => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && flat[index]) {
      e.preventDefault()
      choose(flat[index])
    }
  }

  let cursor = -1
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-[#0b0e2a]/40 backdrop-blur-md p-4 pt-[12vh]" onMouseDown={onClose}>
      <Card className="w-full max-w-xl !bg-[var(--surface-solid)] overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
          <Search size={18} className="text-[var(--ink-faint)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIndex(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Search pages, symbols, actions…"
            className="flex-1 bg-transparent outline-none !outline-none text-base placeholder:text-[var(--ink-faint)]"
          />
          <kbd className="text-[.7rem] px-1.5 py-0.5 rounded-md inset text-[var(--ink-faint)]">esc</kbd>
        </div>
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {flat.length === 0 && <p className="text-sm text-[var(--ink-faint)] px-3 py-6 text-center">Nothing matches “{query}”.</p>}
          {filtered.map((g) => (
            <div key={g.title} className="mb-1">
              <div className="px-3 pt-2 pb-1 text-xs font-medium text-[var(--ink-faint)]">{g.title}</div>
              {g.items.map((it) => {
                cursor += 1
                const active = cursor === index
                const at = cursor
                const Icon = it.icon
                return (
                  <button
                    key={`${g.title}-${it.label}`}
                    data-active={active}
                    onMouseMove={() => setIndex(at)}
                    onClick={() => choose(it)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm ${active ? 'btn-3d' : 'hover:bg-[var(--surface-2)]'}`}
                  >
                    <Icon size={16} className={active ? '' : 'text-[var(--ink-muted)]'} />
                    <span className="flex-1 truncate font-medium">{it.label}</span>
                    {it.hint && <span className={`text-xs ${active ? 'opacity-80' : 'text-[var(--ink-faint)]'}`}>{it.hint}</span>}
                    {active && <CornerDownLeft size={14} className="opacity-80" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
