-- ============================================================
-- Admin User Management: RLS, Notifications, Progress RPC
-- ============================================================

-- 1. Admin can read chapter_progress of all users
CREATE POLICY "chapter_progress: admin select"
  ON public.chapter_progress FOR SELECT
  USING (public.is_admin());

-- 2. Admin can read answers of all users
CREATE POLICY "answers: admin select"
  ON public.answers FOR SELECT
  USING (public.is_admin());

-- 3. Notifications table (admin → user messages)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject text,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- User reads own notifications
CREATE POLICY "notifications: select own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- User marks own as read
CREATE POLICY "notifications: update own"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin reads all
CREATE POLICY "notifications: admin select"
  ON public.notifications FOR SELECT
  USING (public.is_admin());

-- Admin inserts (sends messages)
CREATE POLICY "notifications: admin insert"
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_admin());

-- Admin deletes
CREATE POLICY "notifications: admin delete"
  ON public.notifications FOR DELETE
  USING (public.is_admin());

-- 4. RPC: Admin fetches all progress data for a user in one call
CREATE OR REPLACE FUNCTION public.admin_get_user_progress(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Nicht autorisiert';
  END IF;

  SELECT json_build_object(
    'chapter_progress', (
      SELECT COALESCE(json_agg(json_build_object(
        'chapter_id', cp.chapter_id,
        'is_completed', cp.is_completed,
        'completed_at', cp.completed_at
      )), '[]'::json)
      FROM public.chapter_progress cp WHERE cp.user_id = target_user_id
    ),
    'answers', (
      SELECT COALESCE(json_agg(json_build_object(
        'question_id', a.question_id,
        'updated_at', a.updated_at
      )), '[]'::json)
      FROM public.answers a WHERE a.user_id = target_user_id
    ),
    'course_access', (
      SELECT COALESCE(json_agg(json_build_object(
        'course_id', ca.course_id,
        'access_type', ca.access_type,
        'created_at', ca.created_at
      )), '[]'::json)
      FROM public.course_access ca WHERE ca.user_id = target_user_id
    )
  ) INTO result;

  RETURN result;
END;
$$;
