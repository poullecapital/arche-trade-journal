-- Arche Phase 1 core schema: funds, chart of accounts, double-entry ledger,
-- strategies, trades, watchlist, manual portfolio/price entry, fund flows, sticky notes.
--
-- Ledger integrity model: accounts, ledger_entries and ledger_lines are never
-- written to directly by the client. They are populated only by the
-- SECURITY DEFINER RPC functions below (open_trade, close_trade,
-- record_fund_flow) or by triggers, so every balance shown in the app is
-- always a sum over real ledger lines.

-- ========== 1. Core tables ==========

create table funds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text,
  currency text not null default 'INR',
  status text not null default 'active' check (status in ('active','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fund_id uuid references funds(id) on delete cascade,
  name text not null,
  type text not null check (type in ('asset','liability','equity','income','expense')),
  subtype text not null,
  created_at timestamptz not null default now()
);
create unique index accounts_fund_subtype_uidx on accounts(fund_id, subtype) where fund_id is not null;
create unique index accounts_firm_subtype_uidx on accounts(user_id, subtype) where fund_id is null;

create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  description text not null,
  source_type text not null check (source_type in ('trade_open','trade_close','fund_flow','manual')),
  source_id uuid,
  created_at timestamptz not null default now()
);
create index ledger_entries_source_idx on ledger_entries(source_type, source_id);

create table ledger_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ledger_entry_id uuid not null references ledger_entries(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete restrict,
  debit numeric not null default 0 check (debit >= 0),
  credit numeric not null default 0 check (credit >= 0),
  check (debit = 0 or credit = 0)
);
create index ledger_lines_account_idx on ledger_lines(account_id);
create index ledger_lines_entry_idx on ledger_lines(ledger_entry_id);

create table strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fund_id uuid references funds(id) on delete set null,
  name text not null,
  summary text,
  playbook text,
  rules jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active','paused','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop table if exists trades;
create table trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fund_id uuid not null references funds(id) on delete restrict,
  strategy_id uuid references strategies(id) on delete set null,
  symbol text not null,
  direction text not null check (direction in ('long','short')),
  status text not null default 'open' check (status in ('open','closed')),
  entry_price numeric not null check (entry_price > 0),
  entry_quantity numeric not null check (entry_quantity > 0),
  entry_date timestamptz not null default now(),
  entry_fees numeric not null default 0 check (entry_fees >= 0),
  exit_price numeric check (exit_price is null or exit_price > 0),
  exit_date timestamptz,
  exit_fees numeric not null default 0 check (exit_fees >= 0),
  stop_loss numeric,
  target_price numeric,
  pnl numeric,
  r_multiple numeric,
  rule_results jsonb not null default '[]'::jsonb,
  notes text,
  screenshots text[] not null default '{}',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trades_fund_idx on trades(fund_id);
create index trades_strategy_idx on trades(strategy_id);
create index trades_status_idx on trades(status);

create table watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fund_id uuid not null references funds(id) on delete cascade,
  symbol text not null,
  entry_target numeric,
  exit_target numeric,
  stop_loss numeric,
  notes text,
  status text not null default 'watching' check (status in ('watching','triggered','dropped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index watchlist_fund_idx on watchlist_items(fund_id);

create table portfolio_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fund_id uuid not null references funds(id) on delete cascade,
  symbol text not null,
  quantity numeric not null default 0,
  avg_price numeric not null default 0,
  last_price numeric,
  last_price_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(fund_id, symbol)
);

create table price_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  symbol text not null,
  price numeric not null check (price > 0),
  recorded_at timestamptz not null default now()
);
create index price_history_symbol_idx on price_history(symbol, recorded_at desc);

create table fund_flows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fund_id uuid not null references funds(id) on delete restrict,
  type text not null check (type in ('deposit','withdrawal')),
  source text not null default 'external' check (source in ('external','firm_cash')),
  amount numeric not null check (amount > 0),
  flow_date date not null default current_date,
  counterparty text,
  notes text,
  ledger_entry_id uuid references ledger_entries(id),
  created_at timestamptz not null default now()
);
create index fund_flows_fund_idx on fund_flows(fund_id);

create table sticky_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content text not null default '',
  color text not null default 'amber',
  position_x numeric not null default 0,
  position_y numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== 2. updated_at trigger ==========

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger funds_set_updated_at before update on funds for each row execute function set_updated_at();
create trigger strategies_set_updated_at before update on strategies for each row execute function set_updated_at();
create trigger trades_set_updated_at before update on trades for each row execute function set_updated_at();
create trigger watchlist_set_updated_at before update on watchlist_items for each row execute function set_updated_at();
create trigger holdings_set_updated_at before update on portfolio_holdings for each row execute function set_updated_at();
create trigger sticky_notes_set_updated_at before update on sticky_notes for each row execute function set_updated_at();

-- ========== 3. Chart of accounts auto-seeding ==========

create or replace function create_fund_accounts() returns trigger as $$
begin
  insert into accounts (user_id, fund_id, name, type, subtype)
  select new.user_id, null, 'Firm Cash (Unallocated)', 'asset', 'firm_cash'
  where not exists (
    select 1 from accounts where user_id = new.user_id and fund_id is null and subtype = 'firm_cash'
  );

  insert into accounts (user_id, fund_id, name, type, subtype)
  select new.user_id, null, 'Firm Capital', 'equity', 'firm_capital'
  where not exists (
    select 1 from accounts where user_id = new.user_id and fund_id is null and subtype = 'firm_capital'
  );

  insert into accounts (user_id, fund_id, name, type, subtype) values
    (new.user_id, new.id, new.name || ' — Cash', 'asset', 'cash'),
    (new.user_id, new.id, new.name || ' — Holdings', 'asset', 'holdings'),
    (new.user_id, new.id, new.name || ' — Capital', 'equity', 'capital'),
    (new.user_id, new.id, new.name || ' — Realized P&L', 'income', 'realized_pnl'),
    (new.user_id, new.id, new.name || ' — Fees & Charges', 'expense', 'fees');

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger funds_create_accounts after insert on funds for each row execute function create_fund_accounts();

-- ========== 4. Ledger cleanup on delete ==========

create or replace function cleanup_trade_ledger() returns trigger as $$
begin
  delete from ledger_entries where source_type in ('trade_open','trade_close') and source_id = old.id;
  return old;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trades_cleanup_ledger after delete on trades for each row execute function cleanup_trade_ledger();

create or replace function cleanup_fund_flow_ledger() returns trigger as $$
begin
  if old.ledger_entry_id is not null then
    delete from ledger_entries where id = old.ledger_entry_id;
  end if;
  return old;
end;
$$ language plpgsql security definer set search_path = public;

create trigger fund_flows_cleanup_ledger after delete on fund_flows for each row execute function cleanup_fund_flow_ledger();

-- ========== 5. Balance views ==========

create view account_balances with (security_invoker = true) as
select
  a.id as account_id,
  a.user_id,
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
group by a.id, a.user_id, a.fund_id, a.name, a.type, a.subtype;

create view fund_summary with (security_invoker = true) as
select
  f.id as fund_id,
  f.user_id,
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
group by f.id, f.user_id, f.name, f.currency, f.status;

create view firm_summary with (security_invoker = true) as
select
  user_id,
  coalesce(sum(balance) filter (where subtype = 'firm_cash'), 0) as firm_cash,
  coalesce(sum(balance) filter (where subtype = 'firm_capital'), 0) as firm_capital
from account_balances
where fund_id is null
group by user_id;

-- ========== 6. RPC: record_fund_flow ==========

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
  v_user uuid := auth.uid();
  v_entry_id uuid;
  v_flow_id uuid;
  v_fund_cash uuid;
  v_fund_capital uuid;
  v_firm_cash uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select id into v_fund_cash from accounts where fund_id = p_fund_id and subtype = 'cash' and user_id = v_user;
  select id into v_fund_capital from accounts where fund_id = p_fund_id and subtype = 'capital' and user_id = v_user;
  select id into v_firm_cash from accounts where fund_id is null and subtype = 'firm_cash' and user_id = v_user;

  if v_fund_cash is null or v_fund_capital is null or v_firm_cash is null then
    raise exception 'Chart of accounts not found for this fund';
  end if;

  insert into ledger_entries(user_id, entry_date, description, source_type)
  values (v_user, p_flow_date, initcap(p_type) || ' — ' || coalesce(p_counterparty, initcap(p_source)), 'fund_flow')
  returning id into v_entry_id;

  if p_type = 'deposit' then
    if p_source = 'external' then
      insert into ledger_lines(user_id, ledger_entry_id, account_id, debit, credit) values
        (v_user, v_entry_id, v_fund_cash, p_amount, 0),
        (v_user, v_entry_id, v_fund_capital, 0, p_amount);
    else
      insert into ledger_lines(user_id, ledger_entry_id, account_id, debit, credit) values
        (v_user, v_entry_id, v_fund_cash, p_amount, 0),
        (v_user, v_entry_id, v_firm_cash, 0, p_amount);
    end if;
  elsif p_type = 'withdrawal' then
    if p_source = 'external' then
      insert into ledger_lines(user_id, ledger_entry_id, account_id, debit, credit) values
        (v_user, v_entry_id, v_fund_capital, p_amount, 0),
        (v_user, v_entry_id, v_fund_cash, 0, p_amount);
    else
      insert into ledger_lines(user_id, ledger_entry_id, account_id, debit, credit) values
        (v_user, v_entry_id, v_firm_cash, p_amount, 0),
        (v_user, v_entry_id, v_fund_cash, 0, p_amount);
    end if;
  else
    raise exception 'Unknown flow type %', p_type;
  end if;

  insert into fund_flows(user_id, fund_id, type, source, amount, flow_date, counterparty, notes, ledger_entry_id)
  values (v_user, p_fund_id, p_type, p_source, p_amount, p_flow_date, p_counterparty, p_notes, v_entry_id)
  returning id into v_flow_id;

  return v_flow_id;
end;
$$;

-- ========== 7. RPC: open_trade ==========

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
  v_user uuid := auth.uid();
  v_trade_id uuid;
  v_entry_id uuid;
  v_cash uuid;
  v_holdings uuid;
  v_fees uuid;
  v_cost numeric := p_entry_price * p_entry_quantity;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_cash from accounts where fund_id = p_fund_id and subtype = 'cash' and user_id = v_user;
  select id into v_holdings from accounts where fund_id = p_fund_id and subtype = 'holdings' and user_id = v_user;
  select id into v_fees from accounts where fund_id = p_fund_id and subtype = 'fees' and user_id = v_user;

  if v_cash is null or v_holdings is null or v_fees is null then
    raise exception 'Chart of accounts not found for this fund';
  end if;

  insert into trades(
    user_id, fund_id, strategy_id, symbol, direction, status,
    entry_price, entry_quantity, entry_date, entry_fees,
    stop_loss, target_price, notes, tags, rule_results
  ) values (
    v_user, p_fund_id, p_strategy_id, p_symbol, p_direction, 'open',
    p_entry_price, p_entry_quantity, p_entry_date, p_entry_fees,
    p_stop_loss, p_target_price, p_notes, p_tags, p_rule_results
  ) returning id into v_trade_id;

  insert into ledger_entries(user_id, entry_date, description, source_type, source_id)
  values (v_user, p_entry_date::date, 'Open ' || p_direction || ' ' || p_symbol, 'trade_open', v_trade_id)
  returning id into v_entry_id;

  if p_direction = 'long' then
    insert into ledger_lines(user_id, ledger_entry_id, account_id, debit, credit) values
      (v_user, v_entry_id, v_holdings, v_cost, 0),
      (v_user, v_entry_id, v_cash, 0, v_cost);
  elsif p_direction = 'short' then
    insert into ledger_lines(user_id, ledger_entry_id, account_id, debit, credit) values
      (v_user, v_entry_id, v_cash, v_cost, 0),
      (v_user, v_entry_id, v_holdings, 0, v_cost);
  else
    raise exception 'Unknown direction %', p_direction;
  end if;

  if p_entry_fees > 0 then
    insert into ledger_lines(user_id, ledger_entry_id, account_id, debit, credit) values
      (v_user, v_entry_id, v_fees, p_entry_fees, 0),
      (v_user, v_entry_id, v_cash, 0, p_entry_fees);
  end if;

  return v_trade_id;
end;
$$;

-- ========== 8. RPC: close_trade ==========

create or replace function close_trade(
  p_trade_id uuid,
  p_exit_price numeric,
  p_exit_date timestamptz default now(),
  p_exit_fees numeric default 0
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
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
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_trade from trades where id = p_trade_id and user_id = v_user for update;
  if not found then
    raise exception 'Trade not found';
  end if;
  if v_trade.status = 'closed' then
    raise exception 'Trade already closed';
  end if;

  select id into v_cash from accounts where fund_id = v_trade.fund_id and subtype = 'cash' and user_id = v_user;
  select id into v_holdings from accounts where fund_id = v_trade.fund_id and subtype = 'holdings' and user_id = v_user;
  select id into v_fees from accounts where fund_id = v_trade.fund_id and subtype = 'fees' and user_id = v_user;
  select id into v_realized from accounts where fund_id = v_trade.fund_id and subtype = 'realized_pnl' and user_id = v_user;

  v_cost_basis := v_trade.entry_price * v_trade.entry_quantity;
  v_proceeds := p_exit_price * v_trade.entry_quantity;

  insert into ledger_entries(user_id, entry_date, description, source_type, source_id)
  values (v_user, p_exit_date::date, 'Close ' || v_trade.direction || ' ' || v_trade.symbol, 'trade_close', v_trade.id)
  returning id into v_entry_id;

  if v_trade.direction = 'long' then
    v_plug := v_proceeds - v_cost_basis;
    insert into ledger_lines(user_id, ledger_entry_id, account_id, debit, credit) values
      (v_user, v_entry_id, v_cash, v_proceeds, 0),
      (v_user, v_entry_id, v_holdings, 0, v_cost_basis);
    v_pnl := v_proceeds - v_cost_basis - v_trade.entry_fees - p_exit_fees;
  else
    v_plug := v_cost_basis - v_proceeds;
    insert into ledger_lines(user_id, ledger_entry_id, account_id, debit, credit) values
      (v_user, v_entry_id, v_holdings, v_cost_basis, 0),
      (v_user, v_entry_id, v_cash, 0, v_proceeds);
    v_pnl := v_cost_basis - v_proceeds - v_trade.entry_fees - p_exit_fees;
  end if;

  if v_plug >= 0 then
    insert into ledger_lines(user_id, ledger_entry_id, account_id, debit, credit) values
      (v_user, v_entry_id, v_realized, 0, v_plug);
  else
    insert into ledger_lines(user_id, ledger_entry_id, account_id, debit, credit) values
      (v_user, v_entry_id, v_realized, -v_plug, 0);
  end if;

  if p_exit_fees > 0 then
    insert into ledger_lines(user_id, ledger_entry_id, account_id, debit, credit) values
      (v_user, v_entry_id, v_fees, p_exit_fees, 0),
      (v_user, v_entry_id, v_cash, 0, p_exit_fees);
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

-- ========== 9. Row Level Security ==========

alter table funds enable row level security;
alter table accounts enable row level security;
alter table ledger_entries enable row level security;
alter table ledger_lines enable row level security;
alter table strategies enable row level security;
alter table trades enable row level security;
alter table watchlist_items enable row level security;
alter table portfolio_holdings enable row level security;
alter table price_history enable row level security;
alter table fund_flows enable row level security;
alter table sticky_notes enable row level security;

create policy "funds crud own" on funds for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "accounts select own" on accounts for select using (auth.uid() = user_id);

create policy "ledger_entries select own" on ledger_entries for select using (auth.uid() = user_id);
create policy "ledger_lines select own" on ledger_lines for select using (auth.uid() = user_id);

create policy "strategies crud own" on strategies for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "trades select own" on trades for select using (auth.uid() = user_id);
create policy "trades update own" on trades for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "trades delete own" on trades for delete using (auth.uid() = user_id);

create policy "watchlist crud own" on watchlist_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "holdings crud own" on portfolio_holdings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "price_history crud own" on price_history for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "fund_flows select own" on fund_flows for select using (auth.uid() = user_id);
create policy "fund_flows delete own" on fund_flows for delete using (auth.uid() = user_id);

create policy "sticky_notes crud own" on sticky_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
