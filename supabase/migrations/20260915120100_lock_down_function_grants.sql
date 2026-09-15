-- Harden function privileges flagged by the Supabase security advisor:
-- trigger-only functions should not be callable via RPC at all, and the
-- money-moving RPCs should not be callable by the anonymous role.

set search_path = public;

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

revoke execute on function create_fund_accounts() from public, anon, authenticated;
revoke execute on function cleanup_trade_ledger() from public, anon, authenticated;
revoke execute on function cleanup_fund_flow_ledger() from public, anon, authenticated;

revoke execute on function open_trade(
  uuid, uuid, text, text, numeric, numeric, timestamptz, numeric, numeric, numeric, text, text[], jsonb
) from public, anon;

revoke execute on function close_trade(
  uuid, numeric, timestamptz, numeric
) from public, anon;

revoke execute on function record_fund_flow(
  uuid, text, text, numeric, date, text, text
) from public, anon;

grant execute on function open_trade(
  uuid, uuid, text, text, numeric, numeric, timestamptz, numeric, numeric, numeric, text, text[], jsonb
) to authenticated;

grant execute on function close_trade(
  uuid, numeric, timestamptz, numeric
) to authenticated;

grant execute on function record_fund_flow(
  uuid, text, text, numeric, date, text, text
) to authenticated;
