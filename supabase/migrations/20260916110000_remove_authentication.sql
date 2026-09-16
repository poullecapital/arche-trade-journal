-- Remove authentication: Arche becomes a single shared, open app with no
-- login. All tables are empty (no user ever signed up), so this is a clean
-- schema simplification rather than a data migration.
--
-- Ledger integrity is still enforced the same way as before — accounts,
-- ledger_entries and ledger_lines stay SELECT-only for clients, and trades/
-- fund_flows still only get created through the RPC functions — that
-- protection was never about *who* was logged in, it's about *how*
-- money-affecting rows get written.

-- ========== 1. Drop policies, views, and the old firm-account index ==========

drop policy if exists "funds crud own" on funds;
drop policy if exists "accounts select own" on accounts;
drop policy if exists "ledger_entries select own" on ledger_entries;
drop policy if exists "ledger_lines select own" on ledger_lines;
drop policy if exists "strategies crud own" on strategies;
drop policy if exists "trades select own" on trades;
drop policy if exists "trades update own" on trades;
drop policy if exists "trades delete own" on trades;
drop policy if exists "watchlist crud own" on watchlist_items;
drop policy if exists "holdings crud own" on portfolio_holdings;
drop policy if exists "price_history crud own" on price_history;
drop policy if exists "fund_flows select own" on fund_flows;
drop policy if exists "fund_flows delete own" on fund_flows;
drop policy if exists "sticky_notes crud own" on sticky_notes;

drop view if exists fund_summary;
drop view if exists firm_summary;
drop view if exists account_balances;

drop index if exists accounts_firm_subtype_uidx;

-- Drop the leftover single-note table from before Arche existed.
drop table if exists note;

-- ========== 2. Drop user_id everywhere (also drops the auth.users FKs) ==========

alter table funds drop column user_id;
alter table accounts drop column user_id;
alter table ledger_entries drop column user_id;
alter table ledger_lines drop column user_id;
alter table strategies drop column user_id;
alter table trades drop column user_id;
alter table watchlist_items drop column user_id;
alter table portfolio_holdings drop column user_id;
alter table price_history drop column user_id;
alter table fund_flows drop column user_id;
alter table sticky_notes drop column user_id;

create unique index accounts_firm_subtype_uidx on accounts(subtype) where fund_id is null;

-- ========== 3. Recreate balance views without user scoping ==========

create view account_balances with (security_invoker = true) as
select
  a.id as account_id,
  a.fund_id,
  a.name,
  a.type,
  a.subtype,
  case when a.type in ('asset','expense')
    then coalesce(sum(l.debit),0) - coalesce(sum(l.credit),0)
    else coalesce(sum(l.credit),0) - coalesce(sum(l.debit),0)
  end as balance
from accounts a
left join ledger_lines l on l.account_id = a.id
group by a.id, a.fund_id, a.name, a.type, a.subtype;

create view fund_summary with (security_invoker = true) as
select
  f.id as fund_id,
  f.name,
  f.currency,
  f.status,
  coalesce(sum(ab.balance) filter (where a.subtype = 'cash'), 0) as cash_balance,
  coalesce(sum(ab.balance) filter (where a.subtype = 'holdings'), 0) as holdings_value,
  coalesce(sum(ab.balance) filter (where a.subtype = 'capital'), 0) as capital,
  coalesce(sum(ab.balance) filter (where a.subtype = 'realized_pnl'), 0) as realized_pnl,
  coalesce(sum(ab.balance) filter (where a.subtype = 'fees'), 0) as fees_paid
from funds f
left join accounts a on a.fund_id = f.id
left join account_balances ab on ab.account_id = a.id
group by f.id, f.name, f.currency, f.status;

create view firm_summary with (security_invoker = true) as
select
  coalesce(sum(balance) filter (where subtype = 'firm_cash'), 0) as firm_cash,
  coalesce(sum(balance) filter (where subtype = 'firm_capital'), 0) as firm_capital
from account_balances
where fund_id is null;

revoke all on account_balances from public, anon, authenticated;
revoke all on fund_summary from public, anon, authenticated;
revoke all on firm_summary from public, anon, authenticated;
grant select on account_balances to anon, authenticated;
grant select on fund_summary to anon, authenticated;
grant select on firm_summary to anon, authenticated;

-- ========== 4. Open RLS policies (RLS stays on; every check is now `true`) ==========

create policy "open select" on accounts for select using (true);
create policy "open select" on ledger_entries for select using (true);
create policy "open select" on ledger_lines for select using (true);

create policy "open crud" on funds for all using (true) with check (true);
create policy "open crud" on strategies for all using (true) with check (true);
create policy "open crud" on watchlist_items for all using (true) with check (true);
create policy "open crud" on portfolio_holdings for all using (true) with check (true);
create policy "open crud" on price_history for all using (true) with check (true);
create policy "open crud" on sticky_notes for all using (true) with check (true);

create policy "open select" on trades for select using (true);
create policy "open update" on trades for update using (true) with check (true);
create policy "open delete" on trades for delete using (true);

create policy "open select" on fund_flows for select using (true);
create policy "open delete" on fund_flows for delete using (true);

-- ========== 5. Rewrite the account-seeding trigger without user_id ==========

create or replace function create_fund_accounts() returns trigger as $$
begin
  insert into accounts (fund_id, name, type, subtype)
  select null, 'Firm Cash (Unallocated)', 'asset', 'firm_cash'
  where not exists (select 1 from accounts where fund_id is null and subtype = 'firm_cash');

  insert into accounts (fund_id, name, type, subtype)
  select null, 'Firm Capital', 'equity', 'firm_capital'
  where not exists (select 1 from accounts where fund_id is null and subtype = 'firm_capital');

  insert into accounts (fund_id, name, type, subtype) values
    (new.id, new.name || ' — Cash', 'asset', 'cash'),
    (new.id, new.name || ' — Holdings', 'asset', 'holdings'),
    (new.id, new.name || ' — Capital', 'equity', 'capital'),
    (new.id, new.name || ' — Realized P&L', 'income', 'realized_pnl'),
    (new.id, new.name || ' — Fees & Charges', 'expense', 'fees');

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ========== 6. Rewrite the RPCs without auth.uid()/user_id ==========

create or replace function record_fund_flow(
  p_fund_id uuid,
  p_type text,
  p_source text,
  p_amount numeric,
  p_flow_date date,
  p_counterparty text default null,
  p_notes text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_entry_id uuid;
  v_flow_id uuid;
  v_fund_cash uuid;
  v_fund_capital uuid;
  v_firm_cash uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select id into v_fund_cash from accounts where fund_id = p_fund_id and subtype = 'cash';
  select id into v_fund_capital from accounts where fund_id = p_fund_id and subtype = 'capital';
  select id into v_firm_cash from accounts where fund_id is null and subtype = 'firm_cash';

  if v_fund_cash is null or v_fund_capital is null or v_firm_cash is null then
    raise exception 'Chart of accounts not found for this fund';
  end if;

  insert into ledger_entries(entry_date, description, source_type)
  values (p_flow_date, initcap(p_type) || ' — ' || coalesce(p_counterparty, initcap(p_source)), 'fund_flow')
  returning id into v_entry_id;

  if p_type = 'deposit' then
    if p_source = 'external' then
      insert into ledger_lines(ledger_entry_id, account_id, debit, credit) values
        (v_entry_id, v_fund_cash, p_amount, 0),
        (v_entry_id, v_fund_capital, 0, p_amount);
    else
      insert into ledger_lines(ledger_entry_id, account_id, debit, credit) values
        (v_entry_id, v_fund_cash, p_amount, 0),
        (v_entry_id, v_firm_cash, 0, p_amount);
    end if;
  elsif p_type = 'withdrawal' then
    if p_source = 'external' then
      insert into ledger_lines(ledger_entry_id, account_id, debit, credit) values
        (v_entry_id, v_fund_capital, p_amount, 0),
        (v_entry_id, v_fund_cash, 0, p_amount);
    else
      insert into ledger_lines(ledger_entry_id, account_id, debit, credit) values
        (v_entry_id, v_firm_cash, p_amount, 0),
        (v_entry_id, v_fund_cash, 0, p_amount);
    end if;
  else
    raise exception 'Unknown flow type %', p_type;
  end if;

  insert into fund_flows(fund_id, type, source, amount, flow_date, counterparty, notes, ledger_entry_id)
  values (p_fund_id, p_type, p_source, p_amount, p_flow_date, p_counterparty, p_notes, v_entry_id)
  returning id into v_flow_id;

  return v_flow_id;
end;
$$;

create or replace function open_trade(
  p_fund_id uuid,
  p_strategy_id uuid,
  p_symbol text,
  p_direction text,
  p_entry_price numeric,
  p_entry_quantity numeric,
  p_entry_date timestamptz default now(),
  p_entry_fees numeric default 0,
  p_stop_loss numeric default null,
  p_target_price numeric default null,
  p_notes text default null,
  p_tags text[] default '{}',
  p_rule_results jsonb default '[]'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_trade_id uuid;
  v_entry_id uuid;
  v_cash uuid;
  v_holdings uuid;
  v_fees uuid;
  v_cost numeric := p_entry_price * p_entry_quantity;
begin
  select id into v_cash from accounts where fund_id = p_fund_id and subtype = 'cash';
  select id into v_holdings from accounts where fund_id = p_fund_id and subtype = 'holdings';
  select id into v_fees from accounts where fund_id = p_fund_id and subtype = 'fees';

  if v_cash is null or v_holdings is null or v_fees is null then
    raise exception 'Chart of accounts not found for this fund';
  end if;

  insert into trades(
    fund_id, strategy_id, symbol, direction, status,
    entry_price, entry_quantity, entry_date, entry_fees,
    stop_loss, target_price, notes, tags, rule_results
  ) values (
    p_fund_id, p_strategy_id, p_symbol, p_direction, 'open',
    p_entry_price, p_entry_quantity, p_entry_date, p_entry_fees,
    p_stop_loss, p_target_price, p_notes, p_tags, p_rule_results
  ) returning id into v_trade_id;

  insert into ledger_entries(entry_date, description, source_type, source_id)
  values (p_entry_date::date, 'Open ' || p_direction || ' ' || p_symbol, 'trade_open', v_trade_id)
  returning id into v_entry_id;

  if p_direction = 'long' then
    insert into ledger_lines(ledger_entry_id, account_id, debit, credit) values
      (v_entry_id, v_holdings, v_cost, 0),
      (v_entry_id, v_cash, 0, v_cost);
  elsif p_direction = 'short' then
    insert into ledger_lines(ledger_entry_id, account_id, debit, credit) values
      (v_entry_id, v_cash, v_cost, 0),
      (v_entry_id, v_holdings, 0, v_cost);
  else
    raise exception 'Unknown direction %', p_direction;
  end if;

  if p_entry_fees > 0 then
    insert into ledger_lines(ledger_entry_id, account_id, debit, credit) values
      (v_entry_id, v_fees, p_entry_fees, 0),
      (v_entry_id, v_cash, 0, p_entry_fees);
  end if;

  return v_trade_id;
end;
$$;

create or replace function close_trade(
  p_trade_id uuid,
  p_exit_price numeric,
  p_exit_date timestamptz default now(),
  p_exit_fees numeric default 0
) returns uuid
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
  if v_trade.status = 'closed' then
    raise exception 'Trade already closed';
  end if;

  select id into v_cash from accounts where fund_id = v_trade.fund_id and subtype = 'cash';
  select id into v_holdings from accounts where fund_id = v_trade.fund_id and subtype = 'holdings';
  select id into v_fees from accounts where fund_id = v_trade.fund_id and subtype = 'fees';
  select id into v_realized from accounts where fund_id = v_trade.fund_id and subtype = 'realized_pnl';

  v_cost_basis := v_trade.entry_price * v_trade.entry_quantity;
  v_proceeds := p_exit_price * v_trade.entry_quantity;

  insert into ledger_entries(entry_date, description, source_type, source_id)
  values (p_exit_date::date, 'Close ' || v_trade.direction || ' ' || v_trade.symbol, 'trade_close', v_trade.id)
  returning id into v_entry_id;

  if v_trade.direction = 'long' then
    v_plug := v_proceeds - v_cost_basis;
    insert into ledger_lines(ledger_entry_id, account_id, debit, credit) values
      (v_entry_id, v_cash, v_proceeds, 0),
      (v_entry_id, v_holdings, 0, v_cost_basis);
    v_pnl := v_proceeds - v_cost_basis - v_trade.entry_fees - p_exit_fees;
  else
    v_plug := v_cost_basis - v_proceeds;
    insert into ledger_lines(ledger_entry_id, account_id, debit, credit) values
      (v_entry_id, v_holdings, v_cost_basis, 0),
      (v_entry_id, v_cash, 0, v_proceeds);
    v_pnl := v_cost_basis - v_proceeds - v_trade.entry_fees - p_exit_fees;
  end if;

  if v_plug >= 0 then
    insert into ledger_lines(ledger_entry_id, account_id, debit, credit) values
      (v_entry_id, v_realized, 0, v_plug);
  else
    insert into ledger_lines(ledger_entry_id, account_id, debit, credit) values
      (v_entry_id, v_realized, -v_plug, 0);
  end if;

  if p_exit_fees > 0 then
    insert into ledger_lines(ledger_entry_id, account_id, debit, credit) values
      (v_entry_id, v_fees, p_exit_fees, 0),
      (v_entry_id, v_cash, 0, p_exit_fees);
  end if;

  if v_trade.stop_loss is not null and v_trade.stop_loss <> v_trade.entry_price then
    v_r_multiple := v_pnl / (abs(v_trade.entry_price - v_trade.stop_loss) * v_trade.entry_quantity);
  end if;

  update trades set
    exit_price = p_exit_price,
    exit_date = p_exit_date,
    exit_fees = p_exit_fees,
    status = 'closed',
    pnl = v_pnl,
    r_multiple = v_r_multiple
  where id = v_trade.id;

  return v_trade.id;
end;
$$;

revoke execute on function open_trade(
  uuid, uuid, text, text, numeric, numeric, timestamptz, numeric, numeric, numeric, text, text[], jsonb
) from public;
revoke execute on function close_trade(uuid, numeric, timestamptz, numeric) from public;
revoke execute on function record_fund_flow(uuid, text, text, numeric, date, text, text) from public;

grant execute on function open_trade(
  uuid, uuid, text, text, numeric, numeric, timestamptz, numeric, numeric, numeric, text, text[], jsonb
) to anon, authenticated;
grant execute on function close_trade(uuid, numeric, timestamptz, numeric) to anon, authenticated;
grant execute on function record_fund_flow(uuid, text, text, numeric, date, text, text) to anon, authenticated;

-- ========== 7. Open the trade-screenshots storage bucket ==========

drop policy if exists "trade screenshots select own" on storage.objects;
drop policy if exists "trade screenshots insert own" on storage.objects;
drop policy if exists "trade screenshots delete own" on storage.objects;

create policy "trade screenshots open select" on storage.objects for select using (bucket_id = 'trade-screenshots');
create policy "trade screenshots open insert" on storage.objects for insert with check (bucket_id = 'trade-screenshots');
create policy "trade screenshots open delete" on storage.objects for delete using (bucket_id = 'trade-screenshots');
