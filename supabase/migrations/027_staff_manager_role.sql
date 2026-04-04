-- Phase 24: Add manager role to staff table CHECK constraint.
-- Extends the existing two-tier (owner/staff) role model to three-tier (owner/manager/staff).
-- Uses DROP IF EXISTS defensively in case constraint name differs from prior migration.

ALTER TABLE public.staff
  DROP CONSTRAINT IF EXISTS staff_role_check;

ALTER TABLE public.staff
  ADD CONSTRAINT staff_role_check
  CHECK (role IN ('owner', 'manager', 'staff'));
