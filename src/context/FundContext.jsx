import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useFunds } from '../hooks/useFunds'

const FundContext = createContext(null)
const STORAGE_KEY = 'arche-selected-fund'
export const ALL_FUNDS = 'all'

// The fund scope picked in the top bar applies to every page: either one fund
// or ALL_FUNDS. `selectedFund`/`selectedFundId` are null in all-funds mode, so
// pages that act on a single fund (logging a trade, a fund's books) ask for one.
export function FundProvider({ children }) {
  const { data: funds = [], isLoading } = useFunds()
  const [scope, setScope] = useState(() => localStorage.getItem(STORAGE_KEY) ?? ALL_FUNDS)

  useEffect(() => {
    if (!isLoading && scope !== ALL_FUNDS && !funds.some((f) => f.id === scope)) setScope(ALL_FUNDS)
  }, [funds, isLoading, scope])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, scope)
  }, [scope])

  const selectedFund = funds.find((f) => f.id === scope) ?? null
  const selectedFundId = selectedFund?.id ?? null
  const inScope = useCallback((fundId) => !selectedFundId || fundId === selectedFundId, [selectedFundId])
  const scopeName = selectedFund ? selectedFund.name : 'All funds'

  return (
    <FundContext.Provider
      value={{ funds, isLoading, scope, setScope, selectedFund, selectedFundId, setSelectedFundId: setScope, inScope, scopeName }}
    >
      {children}
    </FundContext.Provider>
  )
}

export function useFundContext() {
  const ctx = useContext(FundContext)
  if (!ctx) throw new Error('useFundContext must be used within FundProvider')
  return ctx
}
