-- Slack integration. A single, org-wide connection (not per-user, unlike the
-- Outlook integration) - one admin connects the CRM to the Seisiun Analytics
-- Slack workspace once, and the bot posts event notifications to a shared
-- channel on behalf of everyone. Access is gated at the application layer
-- (super_admin only) matching every other table in this schema - RLS is
-- disabled here same as elsewhere.

create table if not exists public.slack_integrations (
  id text primary key default 'default',
  team_id text not null,
  team_name text not null,
  bot_access_token text not null,
  connected_by uuid references auth.users(id),
  default_channel_id text,
  default_channel_name text,
  notify_new_lead boolean not null default true,
  notify_deal_won boolean not null default true,
  notify_deal_lost boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
