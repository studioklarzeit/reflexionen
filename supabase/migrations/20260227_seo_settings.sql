-- ============================================================
-- Migration: SEO & Tracking Settings
-- Date: 2026-02-26
-- Description: Adds meta_description to blog_posts and seeds
--              SEO/tracking settings into the settings table.
-- ============================================================

-- 1. Add meta_description column to blog_posts
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS meta_description TEXT;

-- 2. Seed default SEO/tracking settings
INSERT INTO public.settings (key, value)
VALUES (
  'seo_tracking',
  '{"site_title":"Studio Klarzeit","default_meta_description":"","default_og_image":"","canonical_base_url":"","ga4_measurement_id":"","meta_pixel_id":""}'
)
ON CONFLICT (key) DO NOTHING;

-- Notify PostgREST to pick up the new schema
NOTIFY pgrst, 'reload schema';
