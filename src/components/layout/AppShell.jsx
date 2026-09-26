import { Outlet, useNavigate } from 'react-router-dom'
import { Calculator, Leaf, LogOut, Moon, Plus, Search, Sun } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { ALL_FUNDS, useFundContext } from '../../context/FundContext'
import { UtilityProvider, useUtilities } from '../../context/UtilityContext'
import { Button, Select } from '../ui'
import { Sidebar } from './Sidebar'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

const iconButton =
  'raised w-10 h-10 rounded-full flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)] hover:-translate-y-px active:translate-y-px transition-transform'

function Topbar() {
  const { theme, toggleTheme } = useTheme()
  const { signOut } = useAuth()
  const { funds, scope, setScope } = useFundContext()
  const { openPalette, openCalculator, openBreak } = useUtilities()
  const navigate = useNavigate()

  return (
    <header className="no-print flex items-center justify-between gap-3">
      <div className="hidden sm:block text-sm text-[var(--ink-muted)]">
        {greeting()}, <span className="font-medium text-[var(--ink)]">Kathir</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={openPalette}
          className="raised hidden sm:flex items-center gap-2 h-10 pl-3.5 pr-2.5 rounded-full text-sm text-[var(--ink-faint)] hover:text-[var(--ink)]"
          title="Search (Ctrl/Cmd + K)"
        >
          <Search size={15} /> Search
          <kbd className="text-[.68rem] px-1.5 py-0.5 rounded-md inset">⌘K</kbd>
        </button>
        <button onClick={openPalette} className={`sm:hidden ${iconButton}`} title="Search">
          <Search size={16} />
        </button>
        <button onClick={openCalculator} className={iconButton} title="Position size calculator">
          <Calculator size={16} />
        </button>
        <button onClick={openBreak} className={iconButton} title="Take a break">
          <Leaf size={16} />
        </button>
        <Button onClick={() => navigate('/journal?new=1')} className="!h-10 !px-4">
          <Plus size={16} /> <span className="hidden sm:inline">Log trade</span>
        </Button>
        {funds.length > 0 && (
          <Select
            aria-label="Fund scope"
            title="Every page shows this fund, or all of them"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="!w-auto raised !shadow-[var(--shadow-sm)] !rounded-full !bg-[var(--surface-solid)] !px-4 !h-10 font-medium"
          >
            <option value={ALL_FUNDS}>All funds</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        )}
        {/* On phones these live in the ⌘K palette to keep the bar on one line. */}
        <div className="hidden sm:flex items-center gap-2">
          <button onClick={toggleTheme} className={iconButton} title="Toggle theme">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={signOut} className={iconButton} title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}

export function AppShell() {
  return (
    <UtilityProvider>
      <div className="min-h-screen flex gap-4 p-3 md:p-4 text-[var(--ink)]">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col gap-5 pb-24 md:pb-4">
          <Topbar />
          <main className="w-full max-w-[1280px]">
            <Outlet />
          </main>
        </div>
      </div>
    </UtilityProvider>
  )
}
