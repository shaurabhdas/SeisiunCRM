-- Stage-change approval workflow: a rep requesting a stage move now stashes
-- the raw request payload here instead of applying it immediately. A
-- manager/super_admin approves via a new endpoint that replays the stored
-- payload through the same apply logic the direct (manager) path already
-- uses. Managers/super_admins bypass this entirely - only rep-initiated
-- changes get gated, so this is purely additive to today's write paths.

alter table public.leads
  add column if not exists pending_transition jsonb,
  add column if not exists pending_transition_requested_by uuid references auth.users(id) on delete set null,
  add column if not exists pending_transition_requested_by_name text,
  add column if not exists pending_transition_requested_at timestamptz,
  add column if not exists pending_transition_action text;

alter table public.deals
  add column if not exists pending_transition jsonb,
  add column if not exists pending_transition_requested_by uuid references auth.users(id) on delete set null,
  add column if not exists pending_transition_requested_by_name text,
  add column if not exists pending_transition_requested_at timestamptz,
  add column if not exists pending_transition_action text;

-- Cached Slack member id for DMing managers - resolved lazily via
-- users.lookupByEmail on first notification, stored here to avoid a lookup
-- on every subsequent one.
alter table public.user_profiles
  add column if not exists slack_member_id text;

-- record_id is text, not uuid: leads.id is text while deals.id is uuid, and
-- this column has to hold either depending on record_type, so it can't be a
-- single typed FK regardless.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('approval_requested', 'approval_granted', 'record_updated')),
  record_type text not null check (record_type in ('lead', 'deal')),
  record_id text not null,
  record_name text not null,
  message text not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
