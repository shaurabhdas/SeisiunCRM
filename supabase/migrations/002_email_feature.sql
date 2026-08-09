-- Email feature (Phase 1) — additive only, public schema.
-- No attachment fields on email_templates (attachments are per-email, at compose time only).
-- No scheduled-send support (no scheduled_for column, no 'scheduled' status).

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text not null,
  subject text not null,
  body_html text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_by_name text,
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint valid_industry check (
    industry in ('retail', 'banking', 'insurance', 'energy', 'logistics', 'general')
  )
);

create table if not exists public.email_attachments (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_type text not null,
  file_size integer not null,
  storage_path text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_by_name text,
  category text not null default 'other',
  created_at timestamptz default now(),
  constraint valid_category check (
    category in ('brochure', 'pitch_deck', 'case_study', 'pricing', 'sow', 'other')
  )
);

create table if not exists public.microsoft_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  outlook_email text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.emails (
  id uuid primary key default gen_random_uuid(),
  sent_by uuid references auth.users(id) on delete set null,
  sent_by_name text,
  sent_from text not null,
  to_recipients jsonb not null default '[]',
  cc_recipients jsonb not null default '[]',
  subject text not null,
  body_html text not null,
  template_id uuid references public.email_templates(id) on delete set null,
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

-- Storage bucket for email attachments (private, PDF only, 25MB limit)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('email-attachments', 'email-attachments', false, 26214400, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload email attachments" on storage.objects;
create policy "Authenticated users can upload email attachments"
on storage.objects for insert
to authenticated
with check (bucket_id = 'email-attachments');

drop policy if exists "Authenticated users can read email attachments" on storage.objects;
create policy "Authenticated users can read email attachments"
on storage.objects for select
to authenticated
using (bucket_id = 'email-attachments');

drop policy if exists "Uploaders can delete their email attachments" on storage.objects;
create policy "Uploaders can delete their email attachments"
on storage.objects for delete
to authenticated
using (bucket_id = 'email-attachments' and owner = auth.uid());

-- Seed the 5 default industry templates (idempotent by name)
insert into public.email_templates (name, industry, subject, body_html, is_default)
select 'Retail Client Introduction', 'retail', 'Transforming Retail Analytics at {{prospect_company}}',
  '<p>Dear {{prospect_name}},</p><p>I hope this message finds you well. My name is {{rep_name}} from Seisiun Analytics.</p><p>We specialize in helping retail organizations like {{prospect_company}} consolidate fragmented data across multiple channels into a single real-time analytics platform.</p><p>I would love to schedule a brief 20-minute call to understand your current analytics challenges and share how we have helped similar retail businesses improve decision-making speed by up to 40%.</p><p>Would you be available for a brief call this week?</p><p>Best regards,<br>{{rep_name}}<br>Seisiun Analytics</p>',
  true
where not exists (select 1 from public.email_templates where name = 'Retail Client Introduction');

insert into public.email_templates (name, industry, subject, body_html, is_default)
select 'Banking Client Introduction', 'banking', 'Real-Time Risk Analytics for {{prospect_company}}',
  '<p>Dear {{prospect_name}},</p><p>I am reaching out from Seisiun Analytics regarding an opportunity to enhance your risk and compliance reporting capabilities at {{prospect_company}}.</p><p>Our platform enables banking institutions to consolidate regulatory reporting, risk dashboards, and performance analytics into a unified real-time view, reducing reporting cycles from days to hours.</p><p>I would welcome the opportunity to discuss how we can support {{prospect_company}}''s analytics objectives.</p><p>Best regards,<br>{{rep_name}}<br>Seisiun Analytics</p>',
  true
where not exists (select 1 from public.email_templates where name = 'Banking Client Introduction');

insert into public.email_templates (name, industry, subject, body_html, is_default)
select 'Insurance Client Introduction', 'insurance', 'Streamlining Claims and Underwriting Analytics at {{prospect_company}}',
  '<p>Dear {{prospect_name}},</p><p>I am writing from Seisiun Analytics to introduce a platform purpose-built for insurance analytics challenges.</p><p>We help insurers like {{prospect_company}} unify claims data, underwriting metrics, and portfolio performance into a single real-time dashboard, enabling faster decisions and improved loss ratios.</p><p>Would you have 20 minutes this week for a brief introduction call?</p><p>Best regards,<br>{{rep_name}}<br>Seisiun Analytics</p>',
  true
where not exists (select 1 from public.email_templates where name = 'Insurance Client Introduction');

insert into public.email_templates (name, industry, subject, body_html, is_default)
select 'Energy Client Introduction', 'energy', 'Operational Analytics for {{prospect_company}}',
  '<p>Dear {{prospect_name}},</p><p>I am reaching out from Seisiun Analytics with a solution designed for the unique data challenges facing energy companies like {{prospect_company}}.</p><p>Our platform integrates operational, financial, and compliance data streams into a unified analytics environment, helping energy organizations make faster decisions across their asset portfolio.</p><p>I would love to connect briefly to explore whether there is a fit.</p><p>Best regards,<br>{{rep_name}}<br>Seisiun Analytics</p>',
  true
where not exists (select 1 from public.email_templates where name = 'Energy Client Introduction');

insert into public.email_templates (name, industry, subject, body_html, is_default)
select 'Logistics Client Introduction', 'logistics', 'Supply Chain Visibility Analytics for {{prospect_company}}',
  '<p>Dear {{prospect_name}},</p><p>I am writing from Seisiun Analytics to introduce our supply chain analytics platform to {{prospect_company}}.</p><p>We help logistics organizations consolidate shipment, inventory, and carrier performance data into real-time dashboards that give operations teams the visibility they need to reduce delays and optimize costs.</p><p>Would you be available for a brief call this week?</p><p>Best regards,<br>{{rep_name}}<br>Seisiun Analytics</p>',
  true
where not exists (select 1 from public.email_templates where name = 'Logistics Client Introduction');
