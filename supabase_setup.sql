-- ============================================================
-- INBETRIEBNAHME-CHECKLISTE — Supabase SQL Setup
-- Ausführen im Supabase SQL Editor
-- ============================================================

-- 1. TABELLEN
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  commissioning_date DATE,
  creator_name TEXT NOT NULL,
  archived BOOLEAN DEFAULT FALSE,
  template_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_name)
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'in_arbeit', 'erledigt')),
  created_by TEXT NOT NULL,
  modified_by TEXT,
  completed_by TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name TEXT NOT NULL,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suggestion_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT UNIQUE NOT NULL,
  usage_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tasks JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INDIZES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_participants_project ON project_participants(project_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON project_participants(user_name);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id);
CREATE INDEX IF NOT EXISTS idx_activity_project ON activity_log(project_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_name);
CREATE INDEX IF NOT EXISTS idx_suggestions_count ON suggestion_library(usage_count DESC);

-- 3. UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. UPSERT SUGGESTION FUNKTION
-- ============================================================

CREATE OR REPLACE FUNCTION upsert_suggestion(p_title TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO suggestion_library (title, usage_count)
  VALUES (p_title, 1)
  ON CONFLICT (title) DO UPDATE
    SET usage_count = suggestion_library.usage_count + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 5. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- WICHTIG: Da keine Auth verwendet wird, erlauben wir vollen Zugriff über anon key.
-- Die Zugriffskontrolle erfolgt auf App-Ebene (Teilnehmer-Prüfung).

-- Projects: alle lesen/schreiben
CREATE POLICY "projects_all" ON projects FOR ALL USING (true) WITH CHECK (true);

-- Participants: alle lesen/schreiben  
CREATE POLICY "participants_all" ON project_participants FOR ALL USING (true) WITH CHECK (true);

-- Tasks: alle lesen/schreiben
CREATE POLICY "tasks_all" ON tasks FOR ALL USING (true) WITH CHECK (true);

-- Comments: alle lesen/schreiben
CREATE POLICY "comments_all" ON comments FOR ALL USING (true) WITH CHECK (true);

-- Activity Log: alle lesen/schreiben
CREATE POLICY "activity_all" ON activity_log FOR ALL USING (true) WITH CHECK (true);

-- Favorites: alle lesen/schreiben
CREATE POLICY "favorites_all" ON favorites FOR ALL USING (true) WITH CHECK (true);

-- Suggestions: alle lesen/schreiben
CREATE POLICY "suggestions_all" ON suggestion_library FOR ALL USING (true) WITH CHECK (true);

-- Templates: alle lesen
CREATE POLICY "templates_read" ON templates FOR SELECT USING (true);

-- 6. REALTIME AKTIVIEREN
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE project_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;

-- 7. STANDARD-VORLAGEN EINFÜGEN
-- ============================================================

INSERT INTO templates (name, tasks) VALUES
('CO₂-Verbundanlage', '["Messprotokolle","Elektrische Messungen","DIN-XP + HCO einstellen","Gaskühler HD-Leitung isolieren","Sauggasfühler bei Kühlzelle isolieren","Ausdehnungsgefäß auf 1,5 bar einstellen","TK-Druckschalter testen","Alarmweiterleitung testen","IP-Adresse einstellen","Anlagenbuch erstellen","Verplomben","Einschulung der Anlage","P-Touch Pickerl (Position, Abtauzeit, Fühlerposition)","Kühlzellenregler schließen (alle Regler)"]'),
('Split-Klimaanlage', '["Elektrische Messungen","Klimamodul","IP-Adresse einstellen","Klima Backbox testen","Alarmweiterleitung testen","Beschriften","Kabel beschriften","Einschulung der Anlage","Verplomben"]'),
('Wärmepumpe', '["Messprotokolle","Elektrische Messungen","Tankwasserpumpe + Alarm","Heizungsmodul einschalten","Ausdehnungsgefäß auf 1,5 bar einstellen","Wasserprobe durchführen","IP-Adresse einstellen","Alarmweiterleitung testen","Einschulung der Anlage","Anlagenbuch erstellen"]'),
('Kühlzelle', '["Messprotokolle","Elektrische Messungen","Sauggasfühler bei Kühlzelle isolieren","Pfeile + Pickerl (Rohre + Türe Kühlraum)","Kühlzellenregler schließen (alle Regler)","Kühlzellen Pickerl + GWA (Blitzleuchte)","P-Touch Pickerl (Position, Abtauzeit, Fühlerposition)","Adresse + Abtauzeit + TWP + GWA prüfen","Verplomben","Einschulung der Anlage"]'),
('Supermarkt', '["Messprotokolle","Elektrische Messungen","DIN-XP + HCO einstellen","Klimamodul","Tankwasserpumpe + Alarm","Deckenlüfterkassetten testen","Verplomben","TK-Druckschalter testen","P-Touch Pickerl (Position, Abtauzeit, Fühlerposition)","Gaskühler HD-Leitung isolieren","Sauggasfühler bei Kühlzelle isolieren","Ausdehnungsgefäß auf 1,5 bar einstellen","Honeywell testen","Umschaltventile testen","Zonenventile testen","Heizungsmodul einschalten","Verkaufsfühler Mitte Geschäft","Alarmweiterleitung testen","IP-Adresse einstellen","TWA Pumpe Getränke + Fleisch","Kühlzellen Pickerl + GWA (Blitzleuchte)","Adresse + Abtauzeit + TWP + GWA prüfen","Anlagenbuch erstellen","Einschulung der Anlage","Pläne aufkleben","Zublenden + Zwischendecke","Filter getauscht MO"]')
ON CONFLICT DO NOTHING;

-- ============================================================
-- FERTIG! Jetzt den ANON KEY in .env.local eintragen.
-- ============================================================
