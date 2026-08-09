-- The Pipeline "Manager Override" modal (detailed-pipeline.tsx) lets a user set
-- a manual probability and a custom risk flag/text on a lead, but
-- api/deals/[id]/override/route.ts silently dropped these fields on save, and
-- api/forecast/pulse-pipeline/route.ts hardcoded them to false/null on read —
-- so the feature was fully inert. Additive only.

alter table public.leads
  add column if not exists manual_probability numeric,
  add column if not exists override_risk_flag boolean not null default false,
  add column if not exists custom_risk_text text;
