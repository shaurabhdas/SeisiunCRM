-- 10 orphaned lead_stage_history rows (lead_id NULL, changed_by NULL) were found
-- in production causing "Unknown Opportunity/Unknown Account" in Forecast Pulse.
-- No current code path in the app can produce a row missing lead_id - every
-- insert site sets it from an authenticated, validated lead lookup - so these
-- were written by something outside this codebase. Removing the orphans and
-- adding NOT NULL so any future occurrence fails loudly (500) instead of
-- silently corrupting a dashboard.

delete from public.lead_stage_history where lead_id is null;

alter table public.lead_stage_history
  alter column lead_id set not null;
