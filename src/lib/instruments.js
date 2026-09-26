import { differenceInCalendarDays, format, parseISO } from 'date-fns'

export const INSTRUMENTS = [
  { id: 'equity', label: 'Equity' },
  { id: 'future', label: 'Future' },
  { id: 'option', label: 'Option' },
  { id: 'crypto', label: 'Crypto' },
]

export const instrumentName = (id) => INSTRUMENTS.find((i) => i.id === id)?.label ?? 'Equity'

// F&O contracts trade in lots and expire; options also have a strike and side.
export const usesLots = (type) => type === 'future' || type === 'option'

// "NIFTY 25000 CE · 30 Oct", "BANKNIFTY FUT · 30 Oct", or just the symbol.
export function instrumentLabel(t) {
  const expiry = t.expiry ? ` · ${format(parseISO(t.expiry), 'd MMM')}` : ''
  if (t.instrument_type === 'option') {
    return `${t.symbol}${t.strike != null ? ` ${Number(t.strike)}` : ''}${t.option_type ? ` ${t.option_type}` : ''}${expiry}`
  }
  if (t.instrument_type === 'future') return `${t.symbol} FUT${expiry}`
  return t.symbol
}

// Days until expiry for an open F&O trade, or null.
export function daysToExpiry(t, now = new Date()) {
  if (!t.expiry || t.status !== 'open') return null
  return differenceInCalendarDays(parseISO(t.expiry), now)
}

// Form values -> trades columns. Fields that don't apply to the type are nulled.
export function instrumentColumns(f) {
  const type = f.instrumentType || 'equity'
  const n = (v) => (v === '' || v == null ? null : Number(v))
  return {
    instrument_type: type,
    expiry: usesLots(type) ? f.expiry || null : null,
    lot_size: usesLots(type) ? n(f.lotSize) : null,
    strike: type === 'option' ? n(f.strike) : null,
    option_type: type === 'option' ? f.optionType || null : null,
  }
}
