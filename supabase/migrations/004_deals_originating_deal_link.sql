-- The live deals table is missing originating_deal_id, which the POC -> Full
-- Contract conversion flow (deals/pipeline/page.tsx) and src/lib/deals.ts
-- already depend on. Additive only, mirrors 003_deals_lead_link.sql.

alter table public.deals
  add column if not exists originating_deal_id uuid references public.deals(id) on delete set null;
