-- Daily journal and trade reviews.
--
-- daily_journal: one entry per calendar day — the pre-market plan written
-- before the open and the review written after the close. Journaling is
-- personal, not per fund, so the date is the key.
--
-- trades.reviewed_at: when a closed trade was reviewed. Closed trades with no
-- value here make up the review queue.

create table daily_journal (
  journal_date date primary key,
  plan text not null default '',
  review text not null default '',
  lessons text not null default '',
  day_rating smallint check (day_rating between 1 and 5),
  followed_plan boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger daily_journal_set_updated_at before update on daily_journal
  for each row execute function set_updated_at();

-- Same access model as the other user-editable tables (see remove_authentication).
alter table daily_journal enable row level security;
create policy "open crud" on daily_journal for all using (true) with check (true);

alter table trades add column reviewed_at timestamptz;

-- Closed trades that already carry notes or mistake/emotion tags were
-- reviewed under the old convention; don't send them back to the queue.
update trades set reviewed_at = updated_at
where status = 'closed'
  and (
    coalesce(trim(notes), '') <> ''
    or exists (select 1 from unnest(tags) t where t like 'mistake:%' or t like 'emotion:%')
  );
