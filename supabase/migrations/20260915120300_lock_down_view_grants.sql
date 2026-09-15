revoke all on account_balances from public, anon, authenticated;
revoke all on fund_summary from public, anon, authenticated;
revoke all on firm_summary from public, anon, authenticated;

grant select on account_balances to authenticated;
grant select on fund_summary to authenticated;
grant select on firm_summary to authenticated;
