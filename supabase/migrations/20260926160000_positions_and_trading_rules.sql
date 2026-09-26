-- Positions and risk rules.
--
-- trades.mark_price: a hand-entered current price for an open trade, used for
-- unrealized P&L (there is no live price feed). Cleared meaning is "unmarked".
--
-- trading_rules: the single set of goals and risk limits, moved out of
-- browser storage so every device sees the same limits. One row, id = true.

alter table trades
  add column mark_price numeric check (mark_price is null or mark_price > 0),
  add column mark_price_at timestamptz;

create table trading_rules (
  id boolean primary key default true check (id),
  monthly_target numeric check (monthly_target is null or monthly_target > 0),
  max_daily_loss numeric check (max_daily_loss is null or max_daily_loss > 0),
  max_trades_per_day integer check (max_trades_per_day is null or max_trades_per_day > 0),
  max_risk_pct numeric check (max_risk_pct is null or (max_risk_pct > 0 and max_risk_pct <= 100)),
  require_stop boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger trading_rules_set_updated_at before update on trading_rules
  for each row execute function set_updated_at();

-- Same access model as the other user-editable tables (see remove_authentication).
alter table trading_rules enable row level security;
create policy "open crud" on trading_rules for all using (true) with check (true);
