
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_type text NOT NULL DEFAULT 'assignment',
  ADD COLUMN IF NOT EXISTS estimated_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS weight numeric NOT NULL DEFAULT 0;

UPDATE public.tasks SET task_type = 'assignment' WHERE task_type IS NULL;
