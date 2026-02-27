-- ══════════════════════════════════════════════════════════════
-- RPC: get_course_preview(slug_param)
-- Gibt Kurs, 1. Kapitel und Content-Blöcke zurück.
-- SECURITY DEFINER: Umgeht RLS, damit Anon-User das 1. Kapitel
-- eines veröffentlichten Kurses sehen können (Reinhören-Feature).
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_course_preview(slug_param text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_course json;
  v_chapter json;
  v_blocks json;
  v_total int;
  v_course_id uuid;
  v_chapter_id uuid;
BEGIN
  -- 1. Kurs laden (nur veröffentlichte)
  SELECT to_json(c.*) INTO v_course
  FROM public.courses c
  WHERE c.sales_slug = slug_param
    AND c.sales_published = true
  LIMIT 1;

  IF v_course IS NULL THEN
    RETURN json_build_object('course', NULL);
  END IF;

  v_course_id := (v_course->>'id')::uuid;

  -- 2. Gesamt-Kapitelzahl
  SELECT count(*) INTO v_total
  FROM public.chapters
  WHERE course_id = v_course_id;

  -- 3. Erstes Kapitel (niedrigster sort_order)
  SELECT to_json(ch.*) INTO v_chapter
  FROM public.chapters ch
  WHERE ch.course_id = v_course_id
  ORDER BY ch.sort_order ASC
  LIMIT 1;

  IF v_chapter IS NULL THEN
    RETURN json_build_object('course', v_course, 'chapter', NULL, 'blocks', '[]'::json, 'total_chapters', v_total);
  END IF;

  v_chapter_id := (v_chapter->>'id')::uuid;

  -- 4. Content-Blöcke des 1. Kapitels
  SELECT json_agg(b ORDER BY b.sort_order ASC) INTO v_blocks
  FROM public.chapter_content b
  WHERE b.chapter_id = v_chapter_id;

  RETURN json_build_object(
    'course', v_course,
    'chapter', v_chapter,
    'blocks', COALESCE(v_blocks, '[]'::json),
    'total_chapters', v_total
  );
END;
$$;

-- Anon + Authenticated dürfen die Funktion aufrufen
GRANT EXECUTE ON FUNCTION public.get_course_preview(text) TO anon, authenticated;
