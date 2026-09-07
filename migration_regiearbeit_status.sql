-- ============================================================
-- Migration: "Regiearbeit" als eigener Status (orange)
-- Im Supabase SQL Editor ausführen
-- Idempotent: kann gefahrlos mehrfach ausgeführt werden,
-- baut keine bestehenden Tabellen neu auf.
-- ============================================================

-- 1. CHECK-Constraint auf 'tasks.status' erneuern (inkl. 'regiearbeit')
--    Ersetzt die Einschränkung aus migration_regie_flag.sql, die
--    'regiearbeit' zuvor entfernt hatte. Regiearbeit ist jetzt wieder
--    ein vollwertiger Status, gleichrangig neben offen/in_arbeit/erledigt.
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('offen', 'in_arbeit', 'regiearbeit', 'erledigt'));

-- 2. Absicherung: template_tasks-Tabelle sicherstellen, falls die
--    Migration migration_templates_fix.sql noch nicht ausgeführt wurde.
--    (Kein Effekt, wenn die Tabelle bereits existiert.)
CREATE TABLE IF NOT EXISTS templates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_by  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS template_tasks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_tasks_template ON template_tasks(template_id);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "templates_all" ON templates;
CREATE POLICY "templates_all" ON templates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "template_tasks_all" ON template_tasks;
CREATE POLICY "template_tasks_all" ON template_tasks FOR ALL USING (true) WITH CHECK (true);

-- Fertig! "Regiearbeit" ist jetzt wieder ein eigener, gleichwertiger
-- Status (orange), auswählbar direkt neben Offen / In Arbeit / Erledigt.
