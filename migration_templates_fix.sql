-- ============================================================
-- Migration: templates-System reparieren
-- Im Supabase SQL Editor ausführen
-- ============================================================

-- 1. Alte templates-Tabelle umbenennen (Daten sichern)
ALTER TABLE templates RENAME TO templates_old;

-- 2. Neue templates-Tabelle mit richtiger Struktur
CREATE TABLE templates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_by  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. template_tasks-Tabelle erstellen (fehlte komplett)
CREATE TABLE template_tasks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_template_tasks_template ON template_tasks(template_id);

-- 4. RLS aktivieren
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies — vollen Zugriff erlauben (wie alle anderen Tabellen)
CREATE POLICY "templates_all"      ON templates      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "template_tasks_all" ON template_tasks FOR ALL USING (true) WITH CHECK (true);

-- 6. updated_at Trigger für templates
CREATE OR REPLACE TRIGGER templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Fertig! Die App kann jetzt Vorlagen erstellen, bearbeiten und löschen.
