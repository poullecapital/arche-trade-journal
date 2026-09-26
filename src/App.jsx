import { Navigate, Route, Routes } from 'react-router-dom'
import { FundProvider } from './context/FundContext'
import { useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { AppShell } from './components/layout/AppShell'
import { TodayPage } from './pages/TodayPage'
import { JournalPage } from './pages/JournalPage'
import { DailyJournalPage } from './pages/DailyJournalPage'
import { ReviewQueuePage } from './pages/ReviewQueuePage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { StrategiesPage } from './pages/StrategiesPage'
import { FundsLedgerPage } from './pages/FundsLedgerPage'
import { WatchlistPage } from './pages/WatchlistPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  const { signedIn } = useAuth()
  if (!signedIn) return <LoginPage />

  return (
    <FundProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<TodayPage />} />
          <Route path="journal" element={<JournalPage />} />
          <Route path="journal/daily" element={<DailyJournalPage />} />
          <Route path="journal/review" element={<ReviewQueuePage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="strategies" element={<StrategiesPage />} />
          <Route path="funds" element={<FundsLedgerPage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
          {/* Old addresses: Forecast is now an Analytics tab; Relax is the Break drawer. */}
          <Route path="forecast" element={<Navigate to="/analytics?tab=forecast" replace />} />
          <Route path="relax" element={<Navigate to="/" replace />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </FundProvider>
  )
}

export default App
