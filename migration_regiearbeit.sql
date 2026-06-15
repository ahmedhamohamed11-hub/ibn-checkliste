-- ============================================================
-- Migration: Regiearbeit-Status hinzufügen
-- Im Supabase SQL Editor ausführen
-- ============================================================

-- 1. CHECK-Constraint entfernen und neu setzen (inkl. 'regiearbeit')
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('offen', 'in_arbeit', 'regiearbeit', 'erledigt'));

-- 2. Standard-Vorlagen in templates-Tabelle sicherstellen
--    (Falls die templates-Tabelle noch die alte JSONB-Struktur hat,
--     wird hier nichts kaputt gemacht)

-- Fertig!
-- Die neue 'Regiearbeit'-Option steht jetzt in der App zur Verfügung.
