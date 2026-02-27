-- ══════════════════════════════════════════════════════════════
-- Migration: Vollständige Row-Level Security (RLS)
-- Datum: 2026-02-27
-- Beschreibung: Sicherstellen, dass JEDE Tabelle RLS-Policies
--   hat. Jede Nutzerin kann nur auf eigene Daten zugreifen.
--   Admins können Inhalte verwalten.
--   Edge Functions (service_role) umgehen RLS automatisch.
-- ══════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- 0. Helper-Funktionen
-- ──────────────────────────────────────────────────────────────

-- is_admin(): Prüft ob aktueller User Admin ist
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

-- get_user_id_by_email(): Effiziente Email→UUID-Suche (ersetzt listUsers)
-- NUR für service_role (Edge Functions) — nicht für normale User!
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(lookup_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(lookup_email) LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(text) FROM authenticated, anon, public;

-- redeem_invite(): Einladungslink einlösen (SECURITY DEFINER, da User
-- keinen direkten INSERT auf course_access haben)
DROP FUNCTION IF EXISTS public.redeem_invite(text);
CREATE OR REPLACE FUNCTION public.redeem_invite(invite_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite record;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nicht eingeloggt');
  END IF;

  SELECT * INTO v_invite FROM public.course_invites WHERE token = invite_token;
  IF v_invite IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Ungültiger Einladungslink');
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Einladungslink abgelaufen');
  END IF;

  IF v_invite.max_uses IS NOT NULL AND v_invite.used_count >= v_invite.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'Limit erreicht');
  END IF;

  IF EXISTS (SELECT 1 FROM public.course_access WHERE user_id = v_user_id AND course_id = v_invite.course_id) THEN
    RETURN json_build_object('success', true);
  END IF;

  INSERT INTO public.course_access (user_id, course_id, access_type, created_at)
    VALUES (v_user_id, v_invite.course_id, 'invite', now())
    ON CONFLICT (user_id, course_id) DO NOTHING;

  UPDATE public.course_invites SET used_count = used_count + 1 WHERE token = invite_token;

  RETURN json_build_object('success', true);
END;
$$;


-- ══════════════════════════════════════════════════════════════
-- A. PROFIL-TABELLE
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: select own or admin" ON public.profiles;
CREATE POLICY "profiles: select own or admin" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

-- SECURITY: is_admin darf bei INSERT nicht auf true gesetzt werden
DROP POLICY IF EXISTS "profiles: insert own" ON public.profiles;
CREATE POLICY "profiles: insert own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id AND is_admin IS NOT TRUE);

-- SECURITY: User kann eigenes Profil updaten, aber NICHT is_admin ändern.
-- is_admin muss gleich bleiben wie der aktuelle Wert.
DROP POLICY IF EXISTS "profiles: update own" ON public.profiles;
CREATE POLICY "profiles: update own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_admin IS NOT DISTINCT FROM (
      SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "profiles: delete own" ON public.profiles;
CREATE POLICY "profiles: delete own" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- Admin darf is_admin-Flag setzen (update auf andere Profile)
DROP POLICY IF EXISTS "profiles: admin update" ON public.profiles;
CREATE POLICY "profiles: admin update" ON public.profiles
  FOR UPDATE USING (public.is_admin());


-- ══════════════════════════════════════════════════════════════
-- B. USER-DATEN-TABELLEN (user_id-Isolation)
-- ══════════════════════════════════════════════════════════════

-- ── B1. journal_entries ──────────────────────────────────────
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_entries: select own" ON public.journal_entries;
CREATE POLICY "journal_entries: select own" ON public.journal_entries
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_entries: insert own" ON public.journal_entries;
CREATE POLICY "journal_entries: insert own" ON public.journal_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_entries: update own" ON public.journal_entries;
CREATE POLICY "journal_entries: update own" ON public.journal_entries
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_entries: delete own" ON public.journal_entries;
CREATE POLICY "journal_entries: delete own" ON public.journal_entries
  FOR DELETE USING (auth.uid() = user_id);

-- ── B2. body_entries ─────────────────────────────────────────
ALTER TABLE public.body_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "body_entries: select own" ON public.body_entries;
CREATE POLICY "body_entries: select own" ON public.body_entries
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "body_entries: insert own" ON public.body_entries;
CREATE POLICY "body_entries: insert own" ON public.body_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "body_entries: update own" ON public.body_entries;
CREATE POLICY "body_entries: update own" ON public.body_entries
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "body_entries: delete own" ON public.body_entries;
CREATE POLICY "body_entries: delete own" ON public.body_entries
  FOR DELETE USING (auth.uid() = user_id);

-- ── B3. checkin_entries ──────────────────────────────────────
ALTER TABLE public.checkin_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "checkin_entries: select own" ON public.checkin_entries;
CREATE POLICY "checkin_entries: select own" ON public.checkin_entries
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "checkin_entries: insert own" ON public.checkin_entries;
CREATE POLICY "checkin_entries: insert own" ON public.checkin_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "checkin_entries: update own" ON public.checkin_entries;
CREATE POLICY "checkin_entries: update own" ON public.checkin_entries
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "checkin_entries: delete own" ON public.checkin_entries;
CREATE POLICY "checkin_entries: delete own" ON public.checkin_entries
  FOR DELETE USING (auth.uid() = user_id);

-- ── B4. meditation_logs ──────────────────────────────────────
ALTER TABLE public.meditation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meditation_logs: select own" ON public.meditation_logs;
CREATE POLICY "meditation_logs: select own" ON public.meditation_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "meditation_logs: insert own" ON public.meditation_logs;
CREATE POLICY "meditation_logs: insert own" ON public.meditation_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "meditation_logs: update own" ON public.meditation_logs;
CREATE POLICY "meditation_logs: update own" ON public.meditation_logs
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "meditation_logs: delete own" ON public.meditation_logs;
CREATE POLICY "meditation_logs: delete own" ON public.meditation_logs
  FOR DELETE USING (auth.uid() = user_id);

-- ── B5. chapter_progress ─────────────────────────────────────
ALTER TABLE public.chapter_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chapter_progress: select own" ON public.chapter_progress;
CREATE POLICY "chapter_progress: select own" ON public.chapter_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chapter_progress: insert own" ON public.chapter_progress;
CREATE POLICY "chapter_progress: insert own" ON public.chapter_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chapter_progress: update own" ON public.chapter_progress;
CREATE POLICY "chapter_progress: update own" ON public.chapter_progress
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chapter_progress: delete own" ON public.chapter_progress;
CREATE POLICY "chapter_progress: delete own" ON public.chapter_progress
  FOR DELETE USING (auth.uid() = user_id);

-- ── B6. friend_entries ───────────────────────────────────────
ALTER TABLE public.friend_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friend_entries: select own" ON public.friend_entries;
CREATE POLICY "friend_entries: select own" ON public.friend_entries
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "friend_entries: insert own" ON public.friend_entries;
CREATE POLICY "friend_entries: insert own" ON public.friend_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "friend_entries: update own" ON public.friend_entries;
CREATE POLICY "friend_entries: update own" ON public.friend_entries
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "friend_entries: delete own" ON public.friend_entries;
CREATE POLICY "friend_entries: delete own" ON public.friend_entries
  FOR DELETE USING (auth.uid() = user_id);

-- ── B7. energy_entries ───────────────────────────────────────
ALTER TABLE public.energy_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "energy_entries: select own" ON public.energy_entries;
CREATE POLICY "energy_entries: select own" ON public.energy_entries
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "energy_entries: insert own" ON public.energy_entries;
CREATE POLICY "energy_entries: insert own" ON public.energy_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "energy_entries: update own" ON public.energy_entries;
CREATE POLICY "energy_entries: update own" ON public.energy_entries
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "energy_entries: delete own" ON public.energy_entries;
CREATE POLICY "energy_entries: delete own" ON public.energy_entries
  FOR DELETE USING (auth.uid() = user_id);

-- ── B8. pro_questions (Admin liest alle) ─────────────────────
ALTER TABLE public.pro_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pro_questions: select own or admin" ON public.pro_questions;
CREATE POLICY "pro_questions: select own or admin" ON public.pro_questions
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "pro_questions: insert own" ON public.pro_questions;
CREATE POLICY "pro_questions: insert own" ON public.pro_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "pro_questions: update own" ON public.pro_questions;
CREATE POLICY "pro_questions: update own" ON public.pro_questions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "pro_questions: delete own" ON public.pro_questions;
CREATE POLICY "pro_questions: delete own" ON public.pro_questions
  FOR DELETE USING (auth.uid() = user_id);

-- ── B9. answers ──────────────────────────────────────────────
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
-- Bestehende Policies aus migration.sql bleiben (user_id-Isolation).
-- Falls nicht vorhanden, hier als Fallback:
DROP POLICY IF EXISTS "Users can read own answers" ON public.answers;
CREATE POLICY "Users can read own answers" ON public.answers
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own answers" ON public.answers;
CREATE POLICY "Users can insert own answers" ON public.answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own answers" ON public.answers;
CREATE POLICY "Users can update own answers" ON public.answers
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own answers" ON public.answers;
CREATE POLICY "Users can delete own answers" ON public.answers
  FOR DELETE USING (auth.uid() = user_id);

-- ── B10. course_access ───────────────────────────────────────
-- SECURITY: Kein INSERT/UPDATE für authenticated Users!
-- Zugriff wird NUR gewährt über:
--   - Edge Functions (service_role) nach Stripe-Zahlung
--   - redeem_invite() SECURITY DEFINER Funktion
ALTER TABLE public.course_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_access: select own or admin" ON public.course_access;
CREATE POLICY "course_access: select own or admin" ON public.course_access
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- KEIN INSERT Policy für authenticated! (Payment Bypass verhindern)
DROP POLICY IF EXISTS "course_access: insert own" ON public.course_access;
-- KEIN UPDATE Policy für authenticated!
DROP POLICY IF EXISTS "course_access: update own" ON public.course_access;

DROP POLICY IF EXISTS "course_access: delete own or admin" ON public.course_access;
CREATE POLICY "course_access: delete own or admin" ON public.course_access
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- ── B11. contact_messages (Admin liest/löscht alle) ──────────
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own" ON public.contact_messages;
DROP POLICY IF EXISTS "Users can insert own" ON public.contact_messages;
DROP POLICY IF EXISTS "Admin can read all" ON public.contact_messages;
DROP POLICY IF EXISTS "Admin can delete all" ON public.contact_messages;
DROP POLICY IF EXISTS "contact_messages: select own or admin" ON public.contact_messages;
CREATE POLICY "contact_messages: select own or admin" ON public.contact_messages
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "contact_messages: insert own" ON public.contact_messages;
CREATE POLICY "contact_messages: insert own" ON public.contact_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Öffentliches Kontaktformular: Anon darf inserieren (ohne user_id)
DROP POLICY IF EXISTS "contact_messages: anon insert" ON public.contact_messages;
CREATE POLICY "contact_messages: anon insert" ON public.contact_messages
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "contact_messages: delete admin" ON public.contact_messages;
CREATE POLICY "contact_messages: delete admin" ON public.contact_messages
  FOR DELETE USING (public.is_admin());


-- ══════════════════════════════════════════════════════════════
-- C. PURCHASES (Sonderfall: user_id kann NULL sein)
--    Schreibzugriff nur via Edge Functions (service_role).
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "purchases: select own or admin" ON public.purchases;
CREATE POLICY "purchases: select own or admin" ON public.purchases
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Kein INSERT/UPDATE/DELETE für authenticated.
-- Edge Functions nutzen service_role und umgehen RLS.

-- Idempotenz-Index für Stripe-Webhook (verhindert doppelte Verarbeitung)
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_checkout_session_unique
  ON public.purchases (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;


-- ══════════════════════════════════════════════════════════════
-- D. ÖFFENTLICHE CONTENT-TABELLEN (Read: alle, Write: Admin)
-- ══════════════════════════════════════════════════════════════

-- ── D1. courses ──────────────────────────────────────────────
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "courses: public read" ON public.courses;
CREATE POLICY "courses: public read" ON public.courses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "courses: admin insert" ON public.courses;
CREATE POLICY "courses: admin insert" ON public.courses
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "courses: admin update" ON public.courses;
CREATE POLICY "courses: admin update" ON public.courses
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "courses: admin delete" ON public.courses;
CREATE POLICY "courses: admin delete" ON public.courses
  FOR DELETE USING (public.is_admin());

-- ── D2. chapters (geschützt wie chapter_content) ─────────────
-- SECURITY: Kapitel-Daten (inkl. audio_url) nur für User mit Zugriff.
-- Kostenlose Kurse bleiben für alle sichtbar.
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chapters: public read" ON public.chapters;
DROP POLICY IF EXISTS "chapters: access read" ON public.chapters;
CREATE POLICY "chapters: access read" ON public.chapters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses co
      WHERE co.id = chapters.course_id
      AND (
        co.is_purchasable IS NOT TRUE
        OR EXISTS (
          SELECT 1 FROM public.course_access ca
          WHERE ca.user_id = auth.uid() AND ca.course_id = co.id
        )
        OR public.is_admin()
      )
    )
  );

DROP POLICY IF EXISTS "chapters: admin insert" ON public.chapters;
CREATE POLICY "chapters: admin insert" ON public.chapters
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "chapters: admin update" ON public.chapters;
CREATE POLICY "chapters: admin update" ON public.chapters
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "chapters: admin delete" ON public.chapters;
CREATE POLICY "chapters: admin delete" ON public.chapters
  FOR DELETE USING (public.is_admin());

-- ── D3. chapter_content (geschützt via course_access JOIN) ───
-- SECURITY: Bezahlte Kursinhalte nur für User mit Zugriff sichtbar.
-- Kostenlose Kurse (is_purchasable != true) bleiben für alle lesbar.
ALTER TABLE public.chapter_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chapter_content: public read" ON public.chapter_content;
DROP POLICY IF EXISTS "chapter_content: access read" ON public.chapter_content;
CREATE POLICY "chapter_content: access read" ON public.chapter_content
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chapters ch
      JOIN public.courses co ON co.id = ch.course_id
      WHERE ch.id = chapter_content.chapter_id
      AND (
        co.is_purchasable IS NOT TRUE
        OR EXISTS (
          SELECT 1 FROM public.course_access ca
          WHERE ca.user_id = auth.uid() AND ca.course_id = co.id
        )
        OR public.is_admin()
      )
    )
  );

DROP POLICY IF EXISTS "chapter_content: admin insert" ON public.chapter_content;
CREATE POLICY "chapter_content: admin insert" ON public.chapter_content
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "chapter_content: admin update" ON public.chapter_content;
CREATE POLICY "chapter_content: admin update" ON public.chapter_content
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "chapter_content: admin delete" ON public.chapter_content;
CREATE POLICY "chapter_content: admin delete" ON public.chapter_content
  FOR DELETE USING (public.is_admin());

-- ── D4. exercises ────────────────────────────────────────────
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read exercises" ON public.exercises;
CREATE POLICY "Anyone can read exercises" ON public.exercises
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert exercises" ON public.exercises;
CREATE POLICY "Admins can insert exercises" ON public.exercises
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update exercises" ON public.exercises;
CREATE POLICY "Admins can update exercises" ON public.exercises
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete exercises" ON public.exercises;
CREATE POLICY "Admins can delete exercises" ON public.exercises
  FOR DELETE USING (public.is_admin());

-- ── D5. exercise_content (geschützt via course_access JOIN) ──
-- SECURITY: exercises → chapters → courses JOIN-Kette
ALTER TABLE public.exercise_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exercise_content: public read" ON public.exercise_content;
DROP POLICY IF EXISTS "exercise_content: access read" ON public.exercise_content;
CREATE POLICY "exercise_content: access read" ON public.exercise_content
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exercises ex
      JOIN public.chapters ch ON ch.id = ex.chapter_id
      JOIN public.courses co ON co.id = ch.course_id
      WHERE ex.id = exercise_content.exercise_id
      AND (
        co.is_purchasable IS NOT TRUE
        OR EXISTS (
          SELECT 1 FROM public.course_access ca
          WHERE ca.user_id = auth.uid() AND ca.course_id = co.id
        )
        OR public.is_admin()
      )
    )
  );

DROP POLICY IF EXISTS "exercise_content: admin insert" ON public.exercise_content;
CREATE POLICY "exercise_content: admin insert" ON public.exercise_content
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "exercise_content: admin update" ON public.exercise_content;
CREATE POLICY "exercise_content: admin update" ON public.exercise_content
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "exercise_content: admin delete" ON public.exercise_content;
CREATE POLICY "exercise_content: admin delete" ON public.exercise_content
  FOR DELETE USING (public.is_admin());

-- ── D6. questions (geschützt via course_access JOIN) ─────────
-- SECURITY: questions → exercises → chapters → courses JOIN-Kette
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read questions" ON public.questions;
DROP POLICY IF EXISTS "Jeder darf lesen" ON public.questions;
DROP POLICY IF EXISTS "questions: public read" ON public.questions;
DROP POLICY IF EXISTS "questions: access read" ON public.questions;
CREATE POLICY "questions: access read" ON public.questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exercises ex
      JOIN public.chapters ch ON ch.id = ex.chapter_id
      JOIN public.courses co ON co.id = ch.course_id
      WHERE ex.id = questions.exercise_id
      AND (
        co.is_purchasable IS NOT TRUE
        OR EXISTS (
          SELECT 1 FROM public.course_access ca
          WHERE ca.user_id = auth.uid() AND ca.course_id = co.id
        )
        OR public.is_admin()
      )
    )
  );

DROP POLICY IF EXISTS "Admins can insert questions" ON public.questions;
CREATE POLICY "Admins can insert questions" ON public.questions
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update questions" ON public.questions;
CREATE POLICY "Admins can update questions" ON public.questions
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete questions" ON public.questions;
CREATE POLICY "Admins can delete questions" ON public.questions
  FOR DELETE USING (public.is_admin());

-- ── D7. meditations ──────────────────────────────────────────
ALTER TABLE public.meditations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "meditations: public read" ON public.meditations;
CREATE POLICY "meditations: public read" ON public.meditations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "meditations: admin insert" ON public.meditations;
CREATE POLICY "meditations: admin insert" ON public.meditations
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "meditations: admin update" ON public.meditations;
CREATE POLICY "meditations: admin update" ON public.meditations
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "meditations: admin delete" ON public.meditations;
CREATE POLICY "meditations: admin delete" ON public.meditations
  FOR DELETE USING (public.is_admin());

-- ── D8. settings ─────────────────────────────────────────────
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings: public read" ON public.settings;
CREATE POLICY "settings: public read" ON public.settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "settings: admin insert" ON public.settings;
CREATE POLICY "settings: admin insert" ON public.settings
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "settings: admin update" ON public.settings;
CREATE POLICY "settings: admin update" ON public.settings
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "settings: admin delete" ON public.settings;
CREATE POLICY "settings: admin delete" ON public.settings
  FOR DELETE USING (public.is_admin());

-- ── D9. course_invites ───────────────────────────────────────
ALTER TABLE public.course_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_invites: authenticated read" ON public.course_invites;
CREATE POLICY "course_invites: authenticated read" ON public.course_invites
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "course_invites: admin insert" ON public.course_invites;
CREATE POLICY "course_invites: admin insert" ON public.course_invites
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "course_invites: admin update" ON public.course_invites;
CREATE POLICY "course_invites: admin update" ON public.course_invites
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "course_invites: admin delete" ON public.course_invites;
CREATE POLICY "course_invites: admin delete" ON public.course_invites
  FOR DELETE USING (public.is_admin());


-- ══════════════════════════════════════════════════════════════
-- E. CMS-TABELLEN: Write nur Admin (statt alle auth Users)
-- ══════════════════════════════════════════════════════════════

-- ── E1. pages ────────────────────────────────────────────────
-- Bestehende zu offene Policy entfernen:
DROP POLICY IF EXISTS "pages: authenticated full access" ON public.pages;

-- Admin kann alles (inkl. unpublished lesen):
DROP POLICY IF EXISTS "pages: admin write" ON public.pages;
CREATE POLICY "pages: admin write" ON public.pages
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "pages: admin read all" ON public.pages;
CREATE POLICY "pages: admin read all" ON public.pages
  FOR SELECT USING (public.is_admin());
-- "pages: public read published" bleibt bestehen (nur published).

-- ── E2. blog_posts ───────────────────────────────────────────
DROP POLICY IF EXISTS "blog_posts: authenticated full access" ON public.blog_posts;

DROP POLICY IF EXISTS "blog_posts: admin write" ON public.blog_posts;
CREATE POLICY "blog_posts: admin write" ON public.blog_posts
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "blog_posts: admin read all" ON public.blog_posts;
CREATE POLICY "blog_posts: admin read all" ON public.blog_posts
  FOR SELECT USING (public.is_admin());
-- "blog_posts: public read published" bleibt bestehen (nur published).


-- ══════════════════════════════════════════════════════════════
-- PostgREST Schema-Cache auffrischen
-- ══════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';
