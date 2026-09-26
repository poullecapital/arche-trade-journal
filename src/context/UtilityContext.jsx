import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { CommandPalette } from '../components/CommandPalette'
import { PositionCalculator } from '../components/PositionCalculator'

const UtilityContext = createContext(null)

// Global tools: Cmd/Ctrl+K search palette and the position-size calculator.
export function UtilityProvider({ children }) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [calculatorOpen, setCalculatorOpen] = useState(false)

  const openPalette = useCallback(() => setPaletteOpen(true), [])
  const openCalculator = useCallback(() => setCalculatorOpen(true), [])

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const value = useMemo(() => ({ openPalette, openCalculator }), [openPalette, openCalculator])

  return (
    <UtilityContext.Provider value={value}>
      {children}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onCalculator={openCalculator} />
      <PositionCalculator open={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
    </UtilityContext.Provider>
  )
}

export function useUtilities() {
  const ctx = useContext(UtilityContext)
  if (!ctx) throw new Error('useUtilities must be used within UtilityProvider')
  return ctx
}
