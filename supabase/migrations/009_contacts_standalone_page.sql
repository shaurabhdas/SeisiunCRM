-- Powers the standalone Contacts page. The existing `contacts` table was only
-- ever created inline from a Lead (first_name/last_name/email all NOT NULL,
-- always tied to a lead_id). The new page needs contacts that can be added
-- with any subset of fields known at the time, optionally linked to a Lead,
-- Account, and/or Deal independently, plus ownership tracking so a contact's
-- creator can be given narrower edit rights than a manager/super_admin.
--
-- `name` is added alongside the existing first_name/last_name rather than
-- replacing them, so the Lead/Account embedded "add contact" forms (and the
-- stage-gate logic in leads/page.tsx that depends on contacts existing)
-- keep working unchanged. The new page reads/writes `name`; older rows keep
-- showing via first_name/last_name until edited. Additive only.
--
-- public schema only, matching how 005/008 (the other recent ALTER-style
-- migrations) were applied - see 009_contacts_standalone_page_test.sql for
-- the dev project's `test` schema counterpart.

alter table public.contacts
  alter column first_name drop not null,
  alter column last_name drop not null,
  alter column email drop not null,
  add column if not exists name text,
  add column if not exists organization text,
  add column if not exists deal_id uuid references public.deals(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists created_by_name text;
