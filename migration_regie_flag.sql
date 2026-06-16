-- ============================================================
-- Migration: Regiearbeit von eigenem Status zu Zusatzmarkierung
-- Im Supabase SQL Editor ausführen
-- ============================================================

-- 1. Neue Spalte: is_regie (Kennzeichnung, kein eigener Status mehr)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_regie BOOLEAN NOT NULL DEFAULT false;

-- 2. Bestehende Aufgaben mit status = 'regiearbeit' migrieren:
--    Sie werden zu 'erledigt' + is_regie = true
UPDATE tasks
SET status = 'erledigt', is_regie = true
WHERE status = 'regiearbeit';

-- 3. CHECK-Constraint zurücksetzen auf die ursprünglichen 3 Stati
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('offen', 'in_arbeit', 'erledigt'));

-- Fertig! "Regiearbeit" ist jetzt eine Kennzeichnung innerhalb von
-- "Erledigt" (is_regie = true), kein eigener Status mehr.
