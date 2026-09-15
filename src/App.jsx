import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { FundProvider } from './context/FundContext'
import { AppShell } from './components/layout/AppShell'
import { AuthPage } from './pages/AuthPage'
import { DashboardPage } from './pages/DashboardPage'
import { JournalPage } from './pages/JournalPage'
import { StrategiesPage } from './pages/StrategiesPage'
import { FundsLedgerPage } from './pages/FundsLedgerPage'
import { WatchlistPage } from './pages/WatchlistPage'
import { RelaxPage } from './pages/RelaxPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-[var(--ink-muted)]">Loading…</div>
  }

  if (!user) {
    return <AuthPage />
  }

  return (
    <FundProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="strategies" element={<StrategiesPage />} />
          <Route path="funds" element={<FundsLedgerPage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
          <Route path="relax" element={<RelaxPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </FundProvider>
  )
}

export default App
