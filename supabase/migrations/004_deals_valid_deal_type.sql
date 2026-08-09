-- The live valid_deal_type constraint only allowed ('new_logo','expansion','renewal'),
-- values the application never uses. Every part of the codebase (the New Deal form's
-- Deal Type dropdown, the Deal type, and the POC->full_contract conversion logic in
-- lib/deals.ts) uses 'poc' and 'full_contract' exclusively. The deals table has zero
-- rows currently, so this is safe to correct with no data migration needed.

alter table public.deals drop constraint if exists valid_deal_type;

alter table public.deals
  add constraint valid_deal_type check (deal_type = any (array['poc', 'full_contract']));
