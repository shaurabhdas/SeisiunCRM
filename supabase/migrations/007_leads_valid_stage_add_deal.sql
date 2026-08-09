-- The app's stage-transition UI/API (leads/[id]/stage/route.ts, leads/page.tsx)
-- treats 'deal' as the terminal "closed won" lead stage - the Evaluating
-- outcome flow ("Proposal Requested"/"Pilot Agreed"/"Internal Review") calls
-- PUT .../stage with toStage: 'deal'. But the live valid_stage CHECK
-- constraint never included 'deal', so every such transition has been
-- failing with a 500 (constraint violation) in production. Found while
-- walking the full lead lifecycle as a test sales rep. Additive only.

alter table public.leads drop constraint valid_stage;

alter table public.leads
  add constraint valid_stage check (stage = ANY (ARRAY[
    'contact'::text, 'outreach'::text, 'connected'::text, 'presentation'::text,
    'demo'::text, 'evaluating'::text, 'disqualified'::text, 'deal'::text
  ]));
