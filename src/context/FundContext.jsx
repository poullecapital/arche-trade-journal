import { createContext, useContext, useEffect, useState } from 'react'
import { useFunds } from '../hooks/useFunds'

const FundContext = createContext(null)
const STORAGE_KEY = 'arche-selected-fund'

export function FundProvider({ children }) {
  const { data: funds = [], isLoading } = useFunds()
  const [selectedFundId, setSelectedFundId] = useState(() => localStorage.getItem(STORAGE_KEY))

  useEffect(() => {
    if (!isLoading && funds.length > 0) {
      const stillExists = funds.some((f) => f.id === selectedFundId)
      if (!stillExists) setSelectedFundId(funds[0].id)
    }
  }, [funds, isLoading, selectedFundId])

  useEffect(() => {
    if (selectedFundId) localStorage.setItem(STORAGE_KEY, selectedFundId)
  }, [selectedFundId])

  const selectedFund = funds.find((f) => f.id === selectedFundId) ?? null

  return (
    <FundContext.Provider value={{ funds, isLoading, selectedFundId, selectedFund, setSelectedFundId }}>
      {children}
    </FundContext.Provider>
  )
}

export function useFundContext() {
  const ctx = useContext(FundContext)
  if (!ctx) throw new Error('useFundContext must be used within FundProvider')
  return ctx
}
