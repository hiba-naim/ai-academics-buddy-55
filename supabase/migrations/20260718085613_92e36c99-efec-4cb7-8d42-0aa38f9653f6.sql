ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS target_grade text,
  ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS weekly_study_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#22c55e',
  ADD COLUMN IF NOT EXISTS progress numeric NOT NULL DEFAULT 0;