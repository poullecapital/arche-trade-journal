import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { CommandPalette } from '../components/CommandPalette'
import { PositionCalculator } from '../components/PositionCalculator'
import { BreakDrawer } from '../components/BreakDrawer'

const UtilityContext = createContext(null)

// Global tools: Cmd/Ctrl+K search palette, the position-size calculator and the break drawer.
export function UtilityProvider({ children }) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [calculatorOpen, setCalculatorOpen] = useState(false)
  const [breakOpen, setBreakOpen] = useState(false)

  const openPalette = useCallback(() => setPaletteOpen(true), [])
  const openCalculator = useCallback(() => setCalculatorOpen(true), [])
  const openBreak = useCallback(() => setBreakOpen(true), [])
  const closeBreak = useCallback(() => setBreakOpen(false), [])

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

  const value = useMemo(() => ({ openPalette, openCalculator, openBreak }), [openPalette, openCalculator, openBreak])

  return (
    <UtilityContext.Provider value={value}>
      {children}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onCalculator={openCalculator} onBreak={openBreak} />
      <PositionCalculator open={calculatorOpen} onClose={() => setCalculatorOpen(false)} />
      <BreakDrawer open={breakOpen} onClose={closeBreak} />
    </UtilityContext.Provider>
  )
}

export function useUtilities() {
  const ctx = useContext(UtilityContext)
  if (!ctx) throw new Error('useUtilities must be used within UtilityProvider')
  return ctx
}
