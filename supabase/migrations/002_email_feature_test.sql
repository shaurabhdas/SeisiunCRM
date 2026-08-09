-- Email feature (Phase 1) — additive only, test schema (dedicated test Supabase project).
-- Mirrors 002_email_feature.sql with plain uuid columns instead of auth.users foreign keys.

create schema if not exists test;

create table if not exists test.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text not null,
  subject text not null,
  body_html text not null,
  created_by uuid,
  created_by_name text,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint valid_industry check (
    industry in ('retail', 'banking', 'insurance', 'energy', 'logistics', 'general')
  )
);

create table if not exists test.email_attachments (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  storage_path text not null,
  uploaded_by uuid,
  uploaded_by_name text,
  category text not null default 'other',
  created_at timestamptz default now(),
  constraint valid_category check (
    category in ('brochure', 'pitch_deck', 'case_study', 'pricing', 'sow', 'other')
  )
);

create table if not exists test.microsoft_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  outlook_email text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists test.emails (
  id uuid primary key default gen_random_uuid(),
  sent_by uuid,
  sent_by_name text,
  sent_from text not null,
  to_recipients jsonb not null default '[]',
  cc_recipients jsonb not null default '[]',
  subject text not null,
  body_html text not null,
  template_id uuid references test.email_templates(id) on delete set null,
  template_name text,
  lead_ids uuid[] default '{}',
  deal_ids uuid[] default '{}',
  account_ids uuid[] default '{}',
  attachment_ids uuid[] default '{}',
  microsoft_message_id text,
  status text not null default 'sent',
  sent_at timestamptz,
  reply_received boolean default false,
  reply_received_at timestamptz,
  created_at timestamptz default now(),
  constraint valid_status check (
    status in ('draft', 'sent', 'failed', 'replied')
  )
);
