-- Mirrors 009_contacts_standalone_page.sql for the dev project's `test`
-- schema (used by the vitest integration suite). created_by has no FK to
-- auth.users here, matching the same choice already made in
-- 002_email_feature_test.sql, since the test schema's mock auth id has no
-- corresponding auth.users row. Additive only.

alter table test.contacts
  alter column first_name drop not null,
  alter column last_name drop not null,
  alter column email drop not null,
  add column if not exists name text,
  add column if not exists organization text,
  add column if not exists deal_id uuid references test.deals(id) on delete set null,
  add column if not exists created_by uuid,
  add column if not exists created_by_name text;
