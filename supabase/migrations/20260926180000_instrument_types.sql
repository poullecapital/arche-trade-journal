-- Instrument types: equity, future, option, crypto.
--
-- These fields only describe the contract. Money still flows through
-- entry_price × entry_quantity, where entry_quantity is the total number of
-- units (lots × lot_size for F&O), so the ledger RPCs need no changes — except
-- partial_close_trade, which copies a trade into a new closed row and must
-- carry the contract details across.

alter table trades
  add column instrument_type text not null default 'equity'
    check (instrument_type in ('equity', 'future', 'option', 'crypto')),
  add column expiry date,
  add column strike numeric check (strike is null or strike > 0),
  add column option_type text check (option_type is null or option_type in ('CE', 'PE')),
  add column lot_size numeric check (lot_size is null or lot_size > 0),
  add constraint trades_option_fields_only_on_options
    check (instrument_type = 'option' or (strike is null and option_type is null));

create or replace function partial_close_trade(
  p_trade_id uuid,
  p_quantity numeric,
  p_exit_price numeric,
  p_exit_date timestamptz default now(),
  p_exit_fees numeric default 0
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_trade trades%rowtype;
  v_fee_share numeric;
  v_closed_id uuid;
begin
  select * into v_trade from trades where id = p_trade_id for update;
  if not found then
    raise exception 'Trade not found';
  end if;
  if v_trade.status <> 'open' then
    raise exception 'Can only partially close an open trade';
  end if;
  if p_quantity <= 0 or p_quantity >= v_trade.entry_quantity then
    raise exception 'Partial quantity must be more than 0 and less than the open quantity (%). Use Close trade to exit the full position.', v_trade.entry_quantity;
  end if;
  if p_exit_price <= 0 then
    raise exception 'Exit price must be positive';
  end if;

  v_fee_share := v_trade.entry_fees * (p_quantity / v_trade.entry_quantity);

  insert into trades(
    fund_id, strategy_id, symbol, direction, status,
    instrument_type, expiry, strike, option_type, lot_size,
    entry_price, entry_quantity, entry_date, entry_fees,
    exit_price, exit_date, exit_fees,
    stop_loss, target_price, notes, tags, rule_results, screenshots
  ) values (
    v_trade.fund_id, v_trade.strategy_id, v_trade.symbol, v_trade.direction, 'closed',
    v_trade.instrument_type, v_trade.expiry, v_trade.strike, v_trade.option_type, v_trade.lot_size,
    v_trade.entry_price, p_quantity, v_trade.entry_date, v_fee_share,
    p_exit_price, p_exit_date, coalesce(p_exit_fees, 0),
    v_trade.stop_loss, v_trade.target_price, v_trade.notes,
    array_append(v_trade.tags, 'partial-exit'), v_trade.rule_results, v_trade.screenshots
  ) returning id into v_closed_id;

  update trades set
    entry_quantity = v_trade.entry_quantity - p_quantity,
    entry_fees = v_trade.entry_fees - v_fee_share
  where id = p_trade_id;

  perform repost_trade_ledger(p_trade_id);
  perform repost_trade_ledger(v_closed_id);
  return v_closed_id;
end;
$$;
