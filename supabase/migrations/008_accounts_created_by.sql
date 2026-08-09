-- Accounts had no ownership concept at all - any authenticated rep could edit
-- or delete any account. Adding created_by so account edit/delete can be
-- restricted to the creating rep (or a manager/super_admin), matching the
-- same restriction being added to leads (assigned_rep_id) and deals
-- (assigned_rep_id). Existing accounts will have created_by = NULL since we
-- have no record of who created them - canModifyRecord() treats a NULL
-- owner as "no rep owns this", so those rows become manager/admin-only to
-- edit until touched again. Additive only.

alter table public.accounts
  add column if not exists created_by uuid references auth.users(id) on delete set null;
