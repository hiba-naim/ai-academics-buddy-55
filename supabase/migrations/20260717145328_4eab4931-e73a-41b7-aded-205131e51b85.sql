
-- USERS
CREATE TABLE public.users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  major TEXT,
  year INTEGER,
  gpa NUMERIC(3,2),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.users TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.users_id_seq TO service_role;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- INSTRUCTORS
CREATE TABLE public.instructors (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  department TEXT,
  email TEXT UNIQUE,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.instructors TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.instructors_id_seq TO service_role;
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

-- COURSE CATALOG
CREATE TABLE public.course_catalog (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  credits INTEGER NOT NULL DEFAULT 3,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.course_catalog TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.course_catalog_id_seq TO service_role;
ALTER TABLE public.course_catalog ENABLE ROW LEVEL SECURITY;

-- COURSES (enrollments)
CREATE TABLE public.courses (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  catalog_id BIGINT NOT NULL REFERENCES public.course_catalog(id) ON DELETE RESTRICT,
  instructor_id BIGINT REFERENCES public.instructors(id) ON DELETE SET NULL,
  term TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('planned','in_progress','completed','dropped')),
  grade TEXT,
  credits INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.courses(user_id);
CREATE INDEX ON public.courses(catalog_id);
CREATE INDEX ON public.courses(instructor_id);
GRANT ALL ON public.courses TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.courses_id_seq TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- TASKS
CREATE TABLE public.tasks (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES public.courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.tasks(user_id);
CREATE INDEX ON public.tasks(course_id);
GRANT ALL ON public.tasks TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.tasks_id_seq TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- ASSESSMENTS
CREATE TABLE public.assessments (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'assignment' CHECK (type IN ('assignment','quiz','midterm','final','project','lab')),
  weight NUMERIC(5,2) NOT NULL DEFAULT 0,
  score NUMERIC(6,2),
  max_score NUMERIC(6,2) NOT NULL DEFAULT 100,
  date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.assessments(course_id);
GRANT ALL ON public.assessments TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.assessments_id_seq TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

-- REVIEWS
CREATE TABLE public.reviews (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  instructor_id BIGINT NOT NULL REFERENCES public.instructors(id) ON DELETE CASCADE,
  course_id BIGINT REFERENCES public.courses(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.reviews(user_id);
CREATE INDEX ON public.reviews(instructor_id);
GRANT ALL ON public.reviews TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.reviews_id_seq TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- updated_at helper + triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_users_updated       BEFORE UPDATE ON public.users          FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_instructors_updated BEFORE UPDATE ON public.instructors    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_catalog_updated     BEFORE UPDATE ON public.course_catalog FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_courses_updated     BEFORE UPDATE ON public.courses        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tasks_updated       BEFORE UPDATE ON public.tasks          FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_assessments_updated BEFORE UPDATE ON public.assessments    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_reviews_updated     BEFORE UPDATE ON public.reviews        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================
-- SEED DATA — one Bioinformatics student
-- =============================================================
WITH new_user AS (
  INSERT INTO public.users (email, full_name, major, year, gpa, avatar_url)
  VALUES ('maya.chen@university.edu', 'Maya Chen', 'Bioinformatics', 3, 3.78, NULL)
  RETURNING id
),
ins AS (
  INSERT INTO public.instructors (full_name, department, email, bio) VALUES
    ('Dr. Elena Rossi',    'Computational Biology', 'elena.rossi@university.edu',    'Genomics and sequence analysis.'),
    ('Prof. Amir Haddad',  'Computer Science',      'amir.haddad@university.edu',    'Algorithms for biological data.'),
    ('Dr. Priya Nair',     'Statistics',            'priya.nair@university.edu',     'Biostatistics and R.'),
    ('Prof. Marcus Weber', 'Molecular Biology',     'marcus.weber@university.edu',   'Molecular genetics.'),
    ('Dr. Sofia Alvarez',  'Data Science',          'sofia.alvarez@university.edu',  'Machine learning for omics.')
  RETURNING id, full_name
),
cat AS (
  INSERT INTO public.course_catalog (code, title, description, credits, department) VALUES
    ('BINF 301','Introduction to Bioinformatics','Foundations of sequence analysis and databases.',4,'Bioinformatics'),
    ('BINF 402','Genomics & Sequence Analysis','Genome assembly, alignment, and variant calling.',4,'Bioinformatics'),
    ('CS 350','Algorithms for Computational Biology','Dynamic programming, HMMs, graph algorithms.',3,'Computer Science'),
    ('STAT 320','Biostatistics','Statistical methods for biological data using R.',3,'Statistics'),
    ('MBIO 210','Molecular Biology','Structure and function of biomolecules.',3,'Molecular Biology'),
    ('DS 415','Machine Learning for Omics','ML techniques applied to genomic datasets.',3,'Data Science')
  RETURNING id, code
)
INSERT INTO public.courses (user_id, catalog_id, instructor_id, term, status, grade, credits)
SELECT
  (SELECT id FROM new_user),
  cat.id,
  ins.id,
  t.term, t.status, t.grade, t.credits
FROM (VALUES
  ('BINF 301','Dr. Elena Rossi',   'Fall 2025',   'completed',   'A-', 4),
  ('BINF 402','Dr. Elena Rossi',   'Spring 2026', 'in_progress', NULL, 4),
  ('CS 350',  'Prof. Amir Haddad', 'Spring 2026', 'in_progress', NULL, 3),
  ('STAT 320','Dr. Priya Nair',    'Fall 2025',   'completed',   'B+', 3),
  ('MBIO 210','Prof. Marcus Weber','Fall 2025',   'completed',   'A',  3),
  ('DS 415',  'Dr. Sofia Alvarez', 'Fall 2026',   'planned',     NULL, 3)
) AS t(code, instructor, term, status, grade, credits)
JOIN cat ON cat.code = t.code
JOIN ins ON ins.full_name = t.instructor;

-- Tasks
INSERT INTO public.tasks (user_id, course_id, title, description, due_date, priority, status)
SELECT u.id, c.id, t.title, t.description, t.due_date, t.priority, t.status
FROM public.users u
CROSS JOIN LATERAL (VALUES
  ('BINF 402','Read Ch. 4 — Read Alignment','Cover BWA and Bowtie2 fundamentals.', now() + interval '2 day',  'medium','todo'),
  ('BINF 402','Assignment 3: Variant Calling','Run GATK pipeline on provided FASTQ.', now() + interval '9 day', 'high',  'in_progress'),
  ('CS 350',  'Problem Set 5 — HMMs','Solve Viterbi & Baum-Welch exercises.',      now() + interval '5 day',  'high',  'todo'),
  ('CS 350',  'Group project meeting','Sync on suffix-tree implementation.',        now() + interval '1 day',  'low',   'todo'),
  ('DS 415',  'Register for Fall term','Confirm DS 415 seat with advisor.',         now() + interval '14 day', 'medium','todo'),
  (NULL,      'Update CV for internship','Add Rossi lab research assistant role.',  now() + interval '7 day',  'medium','in_progress'),
  ('BINF 301','Review midterm feedback','Revisit sections marked for review.',      now() - interval '3 day',  'low',   'done')
) AS t(code, title, description, due_date, priority, status)
LEFT JOIN public.course_catalog cat ON cat.code = t.code
LEFT JOIN public.courses c ON c.catalog_id = cat.id AND c.user_id = u.id
WHERE u.email = 'maya.chen@university.edu';

-- Assessments
INSERT INTO public.assessments (course_id, name, type, weight, score, max_score, date)
SELECT c.id, a.name, a.type, a.weight, a.score, a.max_score, a.date
FROM public.users u
JOIN public.courses c ON c.user_id = u.id
JOIN public.course_catalog cat ON cat.id = c.catalog_id
JOIN (VALUES
  ('BINF 301','Midterm Exam',       'midterm',   30, 87, 100, DATE '2025-10-15'),
  ('BINF 301','Final Project',      'project',   40, 92, 100, DATE '2025-12-10'),
  ('BINF 301','Weekly Quizzes Avg', 'quiz',      20, 88, 100, DATE '2025-12-01'),
  ('BINF 402','Assignment 1',       'assignment',15, 91, 100, DATE '2026-02-05'),
  ('BINF 402','Assignment 2',       'assignment',15, 85, 100, DATE '2026-02-25'),
  ('CS 350',  'Problem Set 1',      'assignment',10, 94, 100, DATE '2026-02-08'),
  ('CS 350',  'Problem Set 2',      'assignment',10, 89, 100, DATE '2026-02-22'),
  ('STAT 320','Midterm',            'midterm',   35, 82, 100, DATE '2025-10-20'),
  ('STAT 320','Final Exam',         'final',     40, 86, 100, DATE '2025-12-14'),
  ('MBIO 210','Lab Report',         'lab',       20, 95, 100, DATE '2025-11-05'),
  ('MBIO 210','Final Exam',         'final',     45, 93, 100, DATE '2025-12-16')
) AS a(code, name, type, weight, score, max_score, date) ON a.code = cat.code
WHERE u.email = 'maya.chen@university.edu';

-- Reviews
INSERT INTO public.reviews (user_id, instructor_id, course_id, rating, comment)
SELECT u.id, i.id, c.id, r.rating, r.comment
FROM public.users u
JOIN (VALUES
  ('Dr. Elena Rossi',   'BINF 301', 5, 'Incredibly clear explanations and supportive lab environment.'),
  ('Dr. Priya Nair',    'STAT 320', 4, 'Rigorous stats course; office hours are essential.'),
  ('Prof. Marcus Weber','MBIO 210', 5, 'Engaging lectures and fair grading.')
) AS r(instructor, code, rating, comment) ON TRUE
JOIN public.instructors i ON i.full_name = r.instructor
JOIN public.course_catalog cat ON cat.code = r.code
JOIN public.courses c ON c.catalog_id = cat.id AND c.user_id = u.id
WHERE u.email = 'maya.chen@university.edu';
