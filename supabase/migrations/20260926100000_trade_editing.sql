-- Trade editing: amend an existing trade, add to an open position, and take a
-- partial exit.
--
-- The ledger stays append-only from the client's point of view (SELECT-only),
-- so every edit goes through a SECURITY DEFINER function. Each function
-- updates the trade row and then calls repost_trade_ledger(), which deletes
-- the trade's ledger entries and rebuilds them from the row, so the books can
-- never drift from the trade they describe.

-- ========== 1. Rebuild a trade's ledger entries from its row ==========

create or replace function repost_trade_ledger(p_trade_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_trade trades%rowtype;
  v_entry_id uuid;
  v_cash uuid;
  v_holdings uuid;
  v_fees uuid;
  v_realized uuid;
  v_cost_basis numeric;
  v_proceeds numeric;
  v_plug numeric;
  v_pnl numeric;
  v_r_multiple numeric;
begin
  select * into v_trade from trades where id = p_trade_id for update;
  if not found then
    raise exception 'Trade not found';
  end if;

  select id into v_cash from accounts where fund_id = v_trade.fund_id and subtype = 'cash';
  select id into v_holdings from accounts where fund_id = v_trade.fund_id and subtype = 'holdings';
  select id into v_fees from accounts where fund_id = v_trade.fund_id and subtype = 'fees';
  select id into v_realized from accounts where fund_id = v_trade.fund_id and subtype = 'realized_pnl';

  if v_cash is null or v_holdings is null or v_fees is null or v_realized is null then
    raise exception 'Chart of accounts not found for this fund';
  end if;

  delete from ledger_entries
  where source_type in ('trade_open', 'trade_close') and source_id = v_trade.id;

  v_cost_basis := v_trade.entry_price * v_trade.entry_quantity;

  -- Opening entry
  insert into ledger_entries(entry_date, description, source_type, source_id)
  values (v_trade.entry_date::date, 'Open ' || v_trade.direction || ' ' || v_trade.symbol, 'trade_open', v_trade.id)
  returning id into v_entry_id;

  if v_trade.direction = 'long' then
    insert into ledger_lines(ledger_entry_id, account_id, debit, credit) values
      (v_entry_id, v_holdings, v_cost_basis, 0),
      (v_entry_id, v_cash, 0, v_cost_basis);
  else
    insert into ledger_lines(ledger_entry_id, account_id, debit, credit) values
      (v_entry_id, v_cash, v_cost_basis, 0),
      (v_entry_id, v_holdings, 0, v_cost_basis);
  end if;

  if v_trade.entry_fees > 0 then
    insert into ledger_lines(ledger_entry_id, account_id, debit, credit) values
      (v_entry_id, v_fees, v_trade.entry_fees, 0),
      (v_entry_id, v_cash, 0, v_trade.entry_fees);
  end if;

  if v_trade.status <> 'closed' then
    update trades set pnl = null, r_multiple = null where id = v_trade.id;
    return;
  end if;

  -- Closing entry
  v_proceeds := v_trade.exit_price * v_trade.entry_quantity;

  insert into ledger_entries(entry_date, description, source_type, source_id)
  values (v_trade.exit_date::date, 'Close ' || v_trade.direction || ' ' || v_trade.symbol, 'trade_close', v_trade.id)
  returning id into v_entry_id;

  if v_trade.direction = 'long' then
    v_plug := v_proceeds - v_cost_basis;
    insert into ledger_lines(ledger_entry_id, account_id, debit, credit) values
      (v_entry_id, v_cash, v_proceeds, 0),
      (v_entry_id, v_holdings, 0, v_cost_basis);
    v_pnl := v_proceeds - v_cost_basis - v_trade.entry_fees - v_trade.exit_fees;
  else
    v_plug := v_cost_basis - v_proceeds;
    insert into ledger_lines(ledger_entry_id, account_id, debit, credit) values
      (v_entry_id, v_holdings, v_cost_basis, 0),
      (v_entry_id, v_cash, 0, v_proceeds);
    v_pnl := v_cost_basis - v_proceeds - v_trade.entry_fees - v_trade.exit_fees;
  end if;

  if v_plug >= 0 then
    insert into ledger_lines(ledger_entry_id, account_id, debit, credit) values
      (v_entry_id, v_realized, 0, v_plug);
  else
    insert into ledger_lines(ledger_entry_id, account_id, debit, credit) values
      (v_entry_id, v_realized, -v_plug, 0);
  end if;

  if v_trade.exit_fees > 0 then
    insert into ledger_lines(ledger_entry_id, account_id, debit, credit) values
      (v_entry_id, v_fees, v_trade.exit_fees, 0),
      (v_entry_id, v_cash, 0, v_trade.exit_fees);
  end if;

  if v_trade.stop_loss is not null and v_trade.stop_loss <> v_trade.entry_price then
    v_r_multiple := v_pnl / (abs(v_trade.entry_price - v_trade.stop_loss) * v_trade.entry_quantity);
  end if;

  update trades set pnl = v_pnl, r_multiple = v_r_multiple where id = v_trade.id;
end;
$$;

-- ========== 2. Amend any field of a trade ==========

create or replace function amend_trade(
  p_trade_id uuid,
  p_symbol text,
  p_direction text,
  p_strategy_id uuid,
  p_entry_price numeric,
  p_entry_quantity numeric,
  p_entry_date timestamptz,
  p_entry_fees numeric,
  p_stop_loss numeric default null,
  p_target_price numeric default null,
  p_exit_price numeric default null,
  p_exit_date timestamptz default null,
  p_exit_fees numeric default 0
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_trade trades%rowtype;
begin
  select * into v_trade from trades where id = p_trade_id for update;
  if not found then
    raise exception 'Trade not found';
  end if;
  if p_direction not in ('long', 'short') then
    raise exception 'Unknown direction %', p_direction;
  end if;
  if v_trade.status = 'closed' and (p_exit_price is null or p_exit_date is null) then
    raise exception 'A closed trade needs an exit price and exit date';
  end if;

  update trades set
    symbol = upper(p_symbol),
    direction = p_direction,
    strategy_id = p_strategy_id,
    entry_price = p_entry_price,
    entry_quantity = p_entry_quantity,
    entry_date = p_entry_date,
    entry_fees = coalesce(p_entry_fees, 0),
    stop_loss = p_stop_loss,
    target_price = p_target_price,
    exit_price = case when v_trade.status = 'closed' then p_exit_price else null end,
    exit_date = case when v_trade.status = 'closed' then p_exit_date else null end,
    exit_fees = case when v_trade.status = 'closed' then coalesce(p_exit_fees, 0) else 0 end
  where id = p_trade_id;

  perform repost_trade_ledger(p_trade_id);
  return p_trade_id;
end;
$$;

-- ========== 3. Add to an open position (averages the entry price) ==========

create or replace function add_to_trade(
  p_trade_id uuid,
  p_price numeric,
  p_quantity numeric,
  p_fees numeric default 0
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_trade trades%rowtype;
  v_new_quantity numeric;
begin
  select * into v_trade from trades where id = p_trade_id for update;
  if not found then
    raise exception 'Trade not found';
  end if;
  if v_trade.status <> 'open' then
    raise exception 'Can only add to an open trade';
  end if;
  if p_price <= 0 or p_quantity <= 0 then
    raise exception 'Price and quantity must be positive';
  end if;

  v_new_quantity := v_trade.entry_quantity + p_quantity;

  update trades set
    entry_price = (v_trade.entry_price * v_trade.entry_quantity + p_price * p_quantity) / v_new_quantity,
    entry_quantity = v_new_quantity,
    entry_fees = v_trade.entry_fees + coalesce(p_fees, 0)
  where id = p_trade_id;

  perform repost_trade_ledger(p_trade_id);
  return p_trade_id;
end;
$$;

-- ========== 4. Partial exit: split the closed part into its own trade ==========

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
    entry_price, entry_quantity, entry_date, entry_fees,
    exit_price, exit_date, exit_fees,
    stop_loss, target_price, notes, tags, rule_results, screenshots
  ) values (
    v_trade.fund_id, v_trade.strategy_id, v_trade.symbol, v_trade.direction, 'closed',
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

-- ========== 5. Privileges ==========

-- repost_trade_ledger is an internal helper: nobody calls it over the API.
revoke execute on function repost_trade_ledger(uuid) from public, anon, authenticated;

revoke execute on function amend_trade(
  uuid, text, text, uuid, numeric, numeric, timestamptz, numeric, numeric, numeric, numeric, timestamptz, numeric
) from public;
revoke execute on function add_to_trade(uuid, numeric, numeric, numeric) from public;
revoke execute on function partial_close_trade(uuid, numeric, numeric, timestamptz, numeric) from public;

grant execute on function amend_trade(
  uuid, text, text, uuid, numeric, numeric, timestamptz, numeric, numeric, numeric, numeric, timestamptz, numeric
) to anon, authenticated;
grant execute on function add_to_trade(uuid, numeric, numeric, numeric) to anon, authenticated;
grant execute on function partial_close_trade(uuid, numeric, numeric, timestamptz, numeric) to anon, authenticated;
