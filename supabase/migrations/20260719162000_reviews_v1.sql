ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS teaching_quality_rating INTEGER NOT NULL DEFAULT 3 CHECK (teaching_quality_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS course_difficulty_rating INTEGER NOT NULL DEFAULT 3 CHECK (course_difficulty_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS workload_rating INTEGER NOT NULL DEFAULT 3 CHECK (workload_rating BETWEEN 1 AND 5);