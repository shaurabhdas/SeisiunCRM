-- The live deals table is missing lead_id, which src/lib/deals.ts, the Deal type,
-- and the "Link to Lead" UI on the New Deal form all already depend on. Additive only.

alter table public.deals
  add column if not exists lead_id text references public.leads(id) on delete set null;
