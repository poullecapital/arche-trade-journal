// Journal deep link that opens the log form pre-filled from a watchlist idea.
export function logTradeLink(item) {
  const params = new URLSearchParams({ new: '1', symbol: item.symbol, fund: item.fund_id })
  if (item.entry_target != null) params.set('entry', item.entry_target)
  if (item.stop_loss != null) params.set('stop', item.stop_loss)
  if (item.exit_target != null) params.set('target', item.exit_target)
  return `/journal?${params}`
}
