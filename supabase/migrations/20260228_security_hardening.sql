-- ══════════════════════════════════════════════════════════════
-- Security Hardening: course_invites + Storage Bucket Policies
-- ══════════════════════════════════════════════════════════════

-- ── Fix 1: course_invites SELECT nur für Admins ──
-- Bisher: jeder authentifizierte User konnte alle Invite-Tokens lesen.
-- Neu: nur Admins können Invites lesen. Die redeem_invite()-RPC braucht
-- kein SELECT — sie läuft als SECURITY DEFINER.

DROP POLICY IF EXISTS "course_invites: authenticated read" ON public.course_invites;
CREATE POLICY "course_invites: admin read" ON public.course_invites
  FOR SELECT TO authenticated USING (public.is_admin());

-- ── Fix 8: Storage Bucket Policies ──
-- Images-Bucket: Public read, Admin-only upload/delete
-- (Falls Policies schon existieren, werden sie ersetzt)

-- Allow public read for images bucket
DO $$
BEGIN
  -- Drop existing policies if any
  DROP POLICY IF EXISTS "Images: public read" ON storage.objects;
  DROP POLICY IF EXISTS "Images: admin upload" ON storage.objects;
  DROP POLICY IF EXISTS "Images: admin update" ON storage.objects;
  DROP POLICY IF EXISTS "Images: admin delete" ON storage.objects;

  -- Public read
  CREATE POLICY "Images: public read" ON storage.objects
    FOR SELECT USING (bucket_id = 'images');

  -- Admin-only write
  CREATE POLICY "Images: admin upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'images' AND public.is_admin());

  CREATE POLICY "Images: admin update" ON storage.objects
    FOR UPDATE USING (bucket_id = 'images' AND public.is_admin());

  CREATE POLICY "Images: admin delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'images' AND public.is_admin());
END $$;

-- Meditations bucket (audio files)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Meditations: public read" ON storage.objects;
  DROP POLICY IF EXISTS "Meditations: admin upload" ON storage.objects;
  DROP POLICY IF EXISTS "Meditations: admin delete" ON storage.objects;

  CREATE POLICY "Meditations: public read" ON storage.objects
    FOR SELECT USING (bucket_id = 'meditations');

  CREATE POLICY "Meditations: admin upload" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'meditations' AND public.is_admin());

  CREATE POLICY "Meditations: admin delete" ON storage.objects
    FOR DELETE USING (bucket_id = 'meditations' AND public.is_admin());
END $$;
