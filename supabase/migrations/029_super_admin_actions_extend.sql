-- Migration: 029_super_admin_actions_extend.sql
-- Phase 26 — Extend super_admin_actions CHECK constraint for new action types
-- Adds: password_reset, disable_account, enable_account

ALTER TABLE public.super_admin_actions
  DROP CONSTRAINT IF EXISTS super_admin_actions_action_check;

ALTER TABLE public.super_admin_actions
  ADD CONSTRAINT super_admin_actions_action_check
  CHECK (action IN ('suspend', 'unsuspend', 'activate_addon', 'deactivate_addon', 'password_reset', 'disable_account', 'enable_account'));
