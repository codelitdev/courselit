CREATE TABLE IF NOT EXISTS "lessons" (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  position integer NOT NULL DEFAULT 1,
  published_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS lessons_product_position_uidx ON lessons (product_id, position);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learners" (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deactivated')),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS learners_school_email_uidx ON learners (school_id, email);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learner_credentials" (
  learner_id uuid PRIMARY KEY REFERENCES learners(id) ON DELETE CASCADE,
  password_digest text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learner_sessions" (
  id uuid PRIMARY KEY,
  learner_id uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  token_digest text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enrollments" (
  id uuid PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('free_signup', 'admin_grant')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active')),
  created_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_learner_product_uidx ON enrollments (learner_id, product_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lesson_progress" (
  id uuid PRIMARY KEY,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS lesson_progress_enrollment_lesson_uidx ON lesson_progress (enrollment_id, lesson_id);
