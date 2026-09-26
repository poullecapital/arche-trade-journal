// Column matching and row validation for the CSV trade import.

export const FIELDS = [
  { id: 'symbol', label: 'Symbol', required: true, aliases: ['symbol', 'ticker', 'scrip', 'instrument', 'stock', 'security', 'name'] },
  { id: 'direction', label: 'Direction / side', aliases: ['direction', 'side', 'tradetype', 'type', 'buysell', 'action'] },
  { id: 'entryPrice', label: 'Entry price', required: true, aliases: ['entryprice', 'buyprice', 'avgprice', 'openprice', 'price', 'entry'] },
  { id: 'quantity', label: 'Quantity', required: true, aliases: ['quantity', 'qty', 'shares', 'size', 'units'] },
  { id: 'entryDate', label: 'Entry date', required: true, aliases: ['entrydate', 'date', 'buydate', 'opendate', 'opened', 'tradedate'] },
  { id: 'entryFees', label: 'Entry fees', aliases: ['entryfees', 'fees', 'brokerage', 'charges', 'commission'] },
  { id: 'exitPrice', label: 'Exit price', aliases: ['exitprice', 'sellprice', 'closeprice', 'exit'] },
  { id: 'exitDate', label: 'Exit date', aliases: ['exitdate', 'selldate', 'closedate', 'closed'] },
  { id: 'exitFees', label: 'Exit fees', aliases: ['exitfees'] },
  { id: 'notes', label: 'Notes', aliases: ['notes', 'remarks', 'comment', 'comments'] },
]

const normalize = (h) => h.toLowerCase().replace(/[^a-z0-9]/g, '')

export function autoMap(headers) {
  const map = {}
  const used = new Set()
  for (const f of FIELDS) {
    const idx = headers.findIndex((h, i) => !used.has(i) && f.aliases.includes(normalize(h)))
    if (idx >= 0) {
      map[f.id] = String(idx)
      used.add(idx)
    } else {
      map[f.id] = ''
    }
  }
  return map
}

const parseNumber = (v) => {
  const cleaned = String(v ?? '').replace(/[₹$,\s]/g, '')
  return cleaned === '' ? null : Number(cleaned)
}

export function parseDate(value, dmy) {
  const v = String(value ?? '').trim()
  if (!v) return null
  let d
  const m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})(?:[ T](\d{1,2}):(\d{2}))?$/)
  if (m && dmy) {
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
    d = new Date(year, Number(m[2]) - 1, Number(m[1]), m[4] ? Number(m[4]) : 12, m[5] ? Number(m[5]) : 0)
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    d = new Date(`${v}T12:00:00`)
  } else if (m) {
    d = new Date(`${m[3].length === 2 ? `20${m[3]}` : m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}T${m[4] ? `${m[4].padStart(2, '0')}:${m[5]}` : '12:00'}:00`)
  } else {
    d = new Date(v)
  }
  return Number.isNaN(d.getTime()) ? undefined : d
}

export function buildRow(cells, map, opts) {
  const get = (id) => (map[id] === '' ? '' : (cells[Number(map[id])] ?? '').trim())
  const errors = []

  const symbol = get('symbol').toUpperCase()
  if (!symbol) errors.push('missing symbol')

  const dirRaw = get('direction').toLowerCase()
  let direction = opts.defaultDirection
  if (dirRaw) {
    if (/^(long|buy|b|bought)$/.test(dirRaw)) direction = 'long'
    else if (/^(short|sell|s|sold)$/.test(dirRaw)) direction = 'short'
    else errors.push(`unknown direction “${dirRaw}”`)
  }

  const entryPrice = parseNumber(get('entryPrice'))
  if (!(entryPrice > 0)) errors.push('entry price must be a positive number')
  const quantity = parseNumber(get('quantity'))
  if (!(quantity > 0)) errors.push('quantity must be a positive number')

  const entryDate = parseDate(get('entryDate'), opts.dmy)
  if (!entryDate) errors.push('entry date missing or unreadable')

  const exitPriceRaw = get('exitPrice')
  let exitPrice = null
  let exitDate = null
  if (exitPriceRaw) {
    exitPrice = parseNumber(exitPriceRaw)
    if (!(exitPrice > 0)) errors.push('exit price must be a positive number')
    exitDate = parseDate(get('exitDate'), opts.dmy)
    if (!exitDate) errors.push('exit date missing or unreadable')
  }

  return {
    errors,
    trade: {
      symbol,
      direction,
      entryPrice,
      quantity,
      entryDate,
      entryFees: parseNumber(get('entryFees')) ?? 0,
      exitPrice,
      exitDate,
      exitFees: parseNumber(get('exitFees')) ?? 0,
      notes: get('notes') || null,
    },
  }
}
