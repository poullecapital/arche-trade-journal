import { Outlet } from 'react-router-dom'
import { Moon, Sun, LogOut } from 'lucide-react'
import { Sidebar, MobileNav } from './Sidebar'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import { useFundContext } from '../../context/FundContext'
import { Select } from '../ui'

export function AppShell() {
  const { theme, toggleTheme } = useTheme()
  const { signOut, user } = useAuth()
  const { funds, selectedFundId, setSelectedFundId } = useFundContext()

  return (
    <div className="min-h-screen flex bg-[var(--bg)] text-[var(--ink)]">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileNav />
        <header className="flex items-center justify-between gap-3 px-4 md:px-8 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="min-w-0">
            {funds.length > 0 ? (
              <Select
                value={selectedFundId ?? ''}
                onChange={(e) => setSelectedFundId(e.target.value)}
                className="!w-auto"
              >
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            ) : (
              <span className="text-sm text-[var(--ink-muted)]">No funds yet</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline text-xs text-[var(--ink-faint)] font-mono truncate max-w-[16ch]">
              {user?.email}
            </span>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => signOut()}
              className="p-2 rounded-lg text-[var(--ink-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <main className="flex-1 px-4 md:px-8 py-6 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
