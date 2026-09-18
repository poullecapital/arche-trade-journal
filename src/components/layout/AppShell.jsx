import { Outlet } from 'react-router-dom'
import { TopNav } from './TopNav'

export function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--ink)]">
      <TopNav />
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 md:px-6 py-5">
        <Outlet />
      </main>
    </div>
  )
}
