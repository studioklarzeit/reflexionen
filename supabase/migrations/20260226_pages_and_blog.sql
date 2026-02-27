-- ============================================================
-- Migration: Pages (CMS) & Blog Posts
-- Date: 2026-02-26
-- Description: Adds pages and blog_posts tables for the
--              Studio Klarzeit public website / CMS layer.
-- ============================================================

-- ----------------------------------------------------------
-- 1. Helper: updated_at trigger function
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------
-- 2. pages table
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT        UNIQUE NOT NULL,
  title           TEXT        NOT NULL,
  meta_description TEXT,
  sections        JSONB       DEFAULT '[]'::jsonb,
  is_published    BOOLEAN     DEFAULT false,
  sort_order      INT         DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pages_slug         ON public.pages (slug);
CREATE INDEX IF NOT EXISTS idx_pages_is_published  ON public.pages (is_published);

-- updated_at trigger
CREATE TRIGGER trg_pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Public read access for published pages (anon + authenticated)
CREATE POLICY "pages: public read published"
  ON public.pages
  FOR SELECT
  USING (is_published = true);

-- Authenticated users get full access (admin guard lives in app layer)
CREATE POLICY "pages: authenticated full access"
  ON public.pages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------
-- 3. blog_posts table
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT        UNIQUE NOT NULL,
  title           TEXT        NOT NULL,
  excerpt         TEXT,
  content         JSONB       DEFAULT '[]'::jsonb,
  cover_image     TEXT,
  author          TEXT        DEFAULT 'Studio Klarzeit',
  is_published    BOOLEAN     DEFAULT false,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug      ON public.blog_posts (slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published  ON public.blog_posts (is_published, published_at);

-- updated_at trigger
CREATE TRIGGER trg_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public read access for published posts (anon + authenticated)
CREATE POLICY "blog_posts: public read published"
  ON public.blog_posts
  FOR SELECT
  USING (is_published = true);

-- Authenticated users get full access (admin guard lives in app layer)
CREATE POLICY "blog_posts: authenticated full access"
  ON public.blog_posts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------
-- 4. Seed data: default pages
-- ----------------------------------------------------------

-- 4a. Home / Landing page
INSERT INTO public.pages (slug, title, meta_description, sections, is_published, sort_order)
VALUES (
  'home',
  'Willkommen bei Studio Klarzeit',
  'Studio Klarzeit — Selbstreflexion, Achtsamkeit und Klarheit. Dein digitaler Raum fuer innere Arbeit.',
  '[
    {
      "type": "hero",
      "heading": "Willkommen bei Studio Klarzeit",
      "subheading": "Selbstreflexion. Achtsamkeit. Klarheit. — Dein Raum fuer innere Arbeit.",
      "cta_text": "Zur App",
      "cta_link": "/"
    },
    {
      "type": "features",
      "heading": "Was dich erwartet",
      "items": [
        {
          "title": "Kurse",
          "description": "Strukturierte Selbstreflexionskurse mit Audio und Uebungen"
        },
        {
          "title": "Tools",
          "description": "Taegliche Rituale wie Tagebuch, Stimmungs-Check-In und Koerperwahrnehmung"
        },
        {
          "title": "Meditation",
          "description": "Gefuehrte Meditationen zum Ankommen und Loslassen"
        }
      ]
    },
    {
      "type": "text",
      "body": "Studio Klarzeit ist ein digitaler Raum fuer Selbstreflexion und persoenliches Wachstum. Hier findest du Kurse, Tools und Meditationen, die dir helfen, im Alltag innezuhalten, dich selbst besser kennenzulernen und mit mehr Klarheit durchs Leben zu gehen. Alles in deinem Tempo, alles an einem Ort."
    },
    {
      "type": "cta",
      "heading": "Bereit fuer mehr Klarheit?",
      "subheading": "Starte jetzt mit deinem persoenlichen Konto.",
      "cta_text": "Jetzt starten",
      "cta_link": "/"
    }
  ]'::jsonb,
  true,
  0
);

-- 4b. About page
INSERT INTO public.pages (slug, title, meta_description, sections, is_published, sort_order)
VALUES (
  'about',
  'Ueber Studio Klarzeit',
  'Erfahre mehr ueber Studio Klarzeit — wer wir sind und was uns antreibt.',
  '[
    {
      "type": "hero",
      "heading": "Ueber Studio Klarzeit",
      "subheading": "Wer wir sind und was uns antreibt."
    },
    {
      "type": "text",
      "body": "Studio Klarzeit entstand aus der Ueberzeugung, dass Selbstreflexion und Achtsamkeit fuer jeden Menschen zugaenglich sein sollten. Unser Ziel ist es, einen geschuetzten digitalen Raum zu schaffen, in dem du dich mit dir selbst verbinden kannst — ehrlich, liebevoll und in deinem eigenen Tempo."
    },
    {
      "type": "text",
      "body": "Wir glauben daran, dass kleine, regelmaessige Momente der inneren Einkehr grosse Veraenderungen bewirken koennen. Deshalb entwickeln wir Kurse, Tools und Meditationen, die sich natuerlich in deinen Alltag einfuegen."
    }
  ]'::jsonb,
  true,
  1
);

-- 4c. Kontakt page
INSERT INTO public.pages (slug, title, meta_description, sections, is_published, sort_order)
VALUES (
  'kontakt',
  'Kontakt',
  'Nimm Kontakt mit Studio Klarzeit auf.',
  '[
    {
      "type": "hero",
      "heading": "Kontakt",
      "subheading": "Wir freuen uns von dir zu hoeren."
    },
    {
      "type": "text",
      "body": "Hast du Fragen, Feedback oder Anregungen? Schreib uns gerne — wir melden uns so schnell wie moeglich bei dir."
    }
  ]'::jsonb,
  true,
  2
);

-- 4d. Datenschutz page
INSERT INTO public.pages (slug, title, meta_description, sections, is_published, sort_order)
VALUES (
  'datenschutz',
  'Datenschutzerklaerung',
  'Informationen zum Umgang mit deinen Daten bei Studio Klarzeit.',
  '[
    {
      "type": "hero",
      "heading": "Datenschutzerklaerung",
      "subheading": "Informationen zum Umgang mit deinen Daten."
    },
    {
      "type": "text",
      "body": "Diese Datenschutzerklaerung wird in Kuerze aktualisiert."
    }
  ]'::jsonb,
  true,
  3
);

-- 4e. AGB page
INSERT INTO public.pages (slug, title, meta_description, sections, is_published, sort_order)
VALUES (
  'agb',
  'Allgemeine Geschaeftsbedingungen',
  'Die Nutzungsbedingungen von Studio Klarzeit.',
  '[
    {
      "type": "hero",
      "heading": "Allgemeine Geschaeftsbedingungen",
      "subheading": "Unsere Nutzungsbedingungen."
    },
    {
      "type": "text",
      "body": "Die Allgemeinen Geschaeftsbedingungen werden in Kuerze veroeffentlicht."
    }
  ]'::jsonb,
  true,
  4
);

-- 4f. Privacy page (English)
INSERT INTO public.pages (slug, title, meta_description, sections, is_published, sort_order)
VALUES (
  'privacy',
  'Privacy Policy',
  'How Studio Klarzeit handles your data.',
  '[
    {
      "type": "hero",
      "heading": "Privacy Policy",
      "subheading": "How we handle your data."
    },
    {
      "type": "text",
      "body": "This privacy policy will be updated shortly."
    }
  ]'::jsonb,
  true,
  5
);

-- Notify PostgREST to pick up the new schema
NOTIFY pgrst, 'reload schema';
