-- Production CourseLit stores Lesson.content as Mongo Mixed: text lessons
-- contain TipTap/ProseMirror documents and other lesson types contain their
-- own JSON payloads. Preserve that shape in PostgreSQL.
CREATE OR REPLACE FUNCTION courselit_lesson_content_json(value text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF value IS NULL OR btrim(value) = '' THEN
    RETURN '{}'::jsonb;
  END IF;

  BEGIN
    RETURN value::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'type', 'doc',
      'content', jsonb_build_array(
        jsonb_build_object(
          'type', 'paragraph',
          'content', jsonb_build_array(jsonb_build_object('type', 'text', 'text', value))
        )
      )
    );
  END;
END;
$$;

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'text';

ALTER TABLE lessons
  DROP CONSTRAINT IF EXISTS lessons_type_check;
ALTER TABLE lessons
  ADD CONSTRAINT lessons_type_check
  CHECK (type IN ('text', 'video', 'audio', 'pdf', 'file', 'embed', 'quiz', 'scorm'));

ALTER TABLE lessons
  ALTER COLUMN content DROP DEFAULT;

ALTER TABLE lessons
  ALTER COLUMN content TYPE jsonb
  USING courselit_lesson_content_json(content::text);
ALTER TABLE lessons
  ALTER COLUMN content SET DEFAULT '{}'::jsonb;

DROP FUNCTION courselit_lesson_content_json(text);
