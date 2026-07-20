-- Registration Planner v1
-- Adds a dedicated semester model and planner items so students can draft plans
-- without overloading the existing courses table.

CREATE TABLE public.semesters (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  term TEXT NOT NULL CHECK (term IN ('spring', 'summer', 'fall', 'winter')),
  academic_year INTEGER NOT NULL CHECK (academic_year >= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, term, academic_year)
);

CREATE TABLE public.semester_plan_items (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  semester_id BIGINT NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  catalog_id BIGINT NOT NULL REFERENCES public.course_catalog(id) ON DELETE RESTRICT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'registered', 'waitlisted')),
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (semester_id, catalog_id)
);

CREATE INDEX ON public.semesters(user_id);
CREATE INDEX ON public.semester_plan_items(user_id);
CREATE INDEX ON public.semester_plan_items(semester_id);
CREATE INDEX ON public.semester_plan_items(catalog_id);

GRANT ALL ON public.semesters TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.semesters_id_seq TO service_role;
GRANT ALL ON public.semester_plan_items TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.semester_plan_items_id_seq TO service_role;

ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semester_plan_items ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_semesters_updated
BEFORE UPDATE ON public.semesters
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_semester_plan_items_updated
BEFORE UPDATE ON public.semester_plan_items
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();