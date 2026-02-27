-- ══════════════════════════════════════════════════════
-- Studio Klarzeit — Migration: Neues Datenmodell
-- Kurse → Kapitel → Übungen (Container) → Fragen
-- ══════════════════════════════════════════════════════
-- ACHTUNG: Das löscht alle bestehenden Übungen und Antworten!
-- Nur ausführen, wenn keine Produktionsdaten vorhanden sind.
-- ══════════════════════════════════════════════════════

-- 1. Alte Tabellen löschen (Reihenfolge beachten wegen FK)
DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS exercises;

-- 2. Exercises neu als Container
CREATE TABLE exercises (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id uuid REFERENCES chapters(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order integer DEFAULT 0
);

-- 3. Neue Questions-Tabelle
CREATE TABLE questions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE,
  label text,
  question text NOT NULL,
  hint text,
  placeholder text,
  type text DEFAULT 'text',
  options jsonb,
  wide boolean DEFAULT false,
  sort_order integer DEFAULT 0
);

-- 4. Answers neu mit question_id
CREATE TABLE answers (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  answer_text text,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

-- 5. RLS aktivieren
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies: Exercises
CREATE POLICY "Anyone can read exercises" ON exercises FOR SELECT USING (true);
CREATE POLICY "Admins can insert exercises" ON exercises FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can update exercises" ON exercises FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can delete exercises" ON exercises FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 7. RLS Policies: Questions
CREATE POLICY "Anyone can read questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Admins can insert questions" ON questions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can update questions" ON questions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins can delete questions" ON questions FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 8. RLS Policies: Answers
CREATE POLICY "Users can read own answers" ON answers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own answers" ON answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own answers" ON answers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own answers" ON answers FOR DELETE USING (auth.uid() = user_id);
