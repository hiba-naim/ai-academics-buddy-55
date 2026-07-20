import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const USER_ID = 1;

export const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const THEME_OPTIONS = ["system", "light", "dark"] as const;
export const WORKLOAD_OPTIONS = ["light", "balanced", "heavy"] as const;
export const SESSION_LENGTH_OPTIONS = [25, 50, 75, 90] as const;

export const settingsFormSchema = z.object({
  full_name: z.string().trim().min(2, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email address").max(255),
  university: z.string().trim().min(2, "University is required").max(160),
  major: z.string().trim().min(2, "Major is required").max(160),
  graduation_year: z.coerce.number().int().min(1900).max(2100),
  target_gpa: z.coerce.number().min(0).max(4),
  weekly_study_goal_hours: z.coerce.number().int().min(0).max(120),
  preferred_study_days: z.array(z.enum(DAY_OPTIONS)).min(1, "Choose at least one study day"),
  preferred_study_session_length: z.coerce.number().int().refine((value) => SESSION_LENGTH_OPTIONS.includes(value as (typeof SESSION_LENGTH_OPTIONS)[number]), {
    message: "Choose a valid study session length",
  }),
  default_semester: z.string().trim().min(2, "Select a default semester").max(80),
  max_credits_per_semester: z.coerce.number().int().min(0).max(30),
  preferred_workload: z.enum(WORKLOAD_OPTIONS),
  max_difficult_courses: z.coerce.number().int().min(0).max(10),
  show_ai_recommendations: z.boolean(),
  enable_planner_warnings: z.boolean(),
  notify_assignments: z.boolean(),
  notify_exams: z.boolean(),
  notify_weekly_summary: z.boolean(),
  notify_registration: z.boolean(),
  theme: z.enum(THEME_OPTIONS),
  compact_mode: z.boolean(),
  animations_enabled: z.boolean(),
});

export type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export const academicExportSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  settings: settingsFormSchema,
  courses: z.array(
    z.object({
      courseKey: z.string(),
      catalogCode: z.string(),
      catalogTitle: z.string().nullable(),
      instructorName: z.string().nullable(),
      term: z.string(),
      status: z.string(),
      grade: z.string().nullable(),
      credits: z.number().nullable(),
      difficulty: z.string(),
      target_grade: z.string().nullable(),
      weekly_study_hours: z.number(),
      color: z.string(),
      progress: z.number(),
    }),
  ),
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string().nullable(),
      due_date: z.string().nullable(),
      priority: z.string(),
      status: z.string(),
      task_type: z.string(),
      estimated_minutes: z.number(),
      weight: z.number(),
      courseKey: z.string().nullable(),
    }),
  ),
  assessments: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      score: z.number().nullable(),
      max_score: z.number(),
      weight: z.number(),
      date: z.string().nullable(),
      courseKey: z.string().nullable(),
    }),
  ),
});

export type AcademicExportPayload = z.infer<typeof academicExportSchema>;

export interface SettingsUserRow {
  id: number;
  full_name: string;
  email: string;
  university: string | null;
  major: string | null;
  graduation_year: number | null;
  gpa: number | null;
  target_gpa: number | null;
  weekly_study_goal_hours: number | null;
  preferred_study_days: string[] | null;
  preferred_study_session_length: number | null;
  default_semester: string | null;
  max_credits_per_semester: number | null;
  preferred_workload: string | null;
  max_difficult_courses: number | null;
  show_ai_recommendations: boolean;
  enable_planner_warnings: boolean;
  notify_assignments: boolean;
  notify_exams: boolean;
  notify_weekly_summary: boolean;
  notify_registration: boolean;
  theme: string | null;
  compact_mode: boolean;
  animations_enabled: boolean;
}

export interface SettingsCourseRow {
  id: number;
  term: string;
  status: string;
  grade: string | null;
  credits: number | null;
  difficulty: string;
  target_grade: string | null;
  weekly_study_hours: number;
  color: string;
  progress: number;
  catalog: { code: string; title: string; credits: number; department: string | null } | null;
  instructor: { full_name: string } | null;
}

export interface SettingsTaskRow {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  task_type: string;
  estimated_minutes: number;
  weight: number;
  course: { id: number; term: string; catalog: { code: string; title: string } | null } | null;
}

export interface SettingsAssessmentRow {
  id: number;
  name: string;
  type: string;
  score: number | null;
  max_score: number;
  weight: number;
  date: string | null;
  course: { id: number; term: string; catalog: { code: string; title: string } | null } | null;
}

export interface SettingsPageData {
  user: SettingsUserRow | null;
  courses: SettingsCourseRow[];
  tasks: SettingsTaskRow[];
  assessments: SettingsAssessmentRow[];
  availableSemesters: string[];
  stats: {
    activeCourses: number;
    completedCourses: number;
    totalTasks: number;
    completedTasks: number;
    upcomingDeadlines: number;
    totalAssessments: number;
  };
}

function buildCourseKey(catalogCode: string, term: string) {
  return `${catalogCode}__${term}`;
}

function normalizeDays(days: string[]) {
  return DAY_OPTIONS.filter((day) => days.includes(day));
}

function currentYear() {
  return new Date().getFullYear();
}

async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function settingsSelect() {
  return "id, full_name, email, university, major, graduation_year, gpa, target_gpa, weekly_study_goal_hours, preferred_study_days, preferred_study_session_length, default_semester, max_credits_per_semester, preferred_workload, max_difficult_courses, show_ai_recommendations, enable_planner_warnings, notify_assignments, notify_exams, notify_weekly_summary, notify_registration, theme, compact_mode, animations_enabled";
}

function baseUserSelect() {
  return "id, full_name, email, major, gpa, year";
}

function inferGraduationYear(year: number | null) {
  if (year == null) {
    return currentYear() + 1;
  }

  const offset = Math.max(0, 4 - Number(year));
  return currentYear() + offset;
}

function rowToCourseKey(row: { catalog?: { code: string } | null; term: string; id: number }) {
  return buildCourseKey(row.catalog?.code ?? `course-${row.id}`, row.term);
}

const DEMO_ACADEMIC_EXPORT: AcademicExportPayload = {
  version: 1,
  exportedAt: "2026-07-19T00:00:00.000Z",
  settings: {
    full_name: "Maya Chen",
    email: "maya.chen@university.edu",
    university: "Example University",
    major: "Bioinformatics",
    graduation_year: 2027,
    target_gpa: 3.8,
    weekly_study_goal_hours: 12,
    preferred_study_days: ["Mon", "Wed", "Fri"],
    preferred_study_session_length: 50,
    default_semester: "Fall 2026",
    max_credits_per_semester: 15,
    preferred_workload: "balanced",
    max_difficult_courses: 2,
    show_ai_recommendations: true,
    enable_planner_warnings: true,
    notify_assignments: true,
    notify_exams: true,
    notify_weekly_summary: true,
    notify_registration: true,
    theme: "system",
    compact_mode: false,
    animations_enabled: true,
  },
  courses: [
    { courseKey: buildCourseKey("BINF 301", "Fall 2025"), catalogCode: "BINF 301", catalogTitle: "Introduction to Bioinformatics", instructorName: "Dr. Elena Rossi", term: "Fall 2025", status: "completed", grade: "A-", credits: 4, difficulty: "medium", target_grade: null, weekly_study_hours: 0, color: "#22c55e", progress: 100 },
    { courseKey: buildCourseKey("STAT 320", "Fall 2025"), catalogCode: "STAT 320", catalogTitle: "Biostatistics", instructorName: "Dr. Priya Nair", term: "Fall 2025", status: "completed", grade: "B+", credits: 3, difficulty: "medium", target_grade: null, weekly_study_hours: 0, color: "#3b82f6", progress: 100 },
    { courseKey: buildCourseKey("MBIO 210", "Fall 2025"), catalogCode: "MBIO 210", catalogTitle: "Molecular Biology", instructorName: "Prof. Marcus Weber", term: "Fall 2025", status: "completed", grade: "A", credits: 3, difficulty: "easy", target_grade: null, weekly_study_hours: 0, color: "#a855f7", progress: 100 },
    { courseKey: buildCourseKey("BINF 402", "Spring 2026"), catalogCode: "BINF 402", catalogTitle: "Genomics & Sequence Analysis", instructorName: "Dr. Elena Rossi", term: "Spring 2026", status: "in_progress", grade: null, credits: 4, difficulty: "hard", target_grade: "A", weekly_study_hours: 8, color: "#f59e0b", progress: 42 },
    { courseKey: buildCourseKey("CS 350", "Spring 2026"), catalogCode: "CS 350", catalogTitle: "Algorithms for Computational Biology", instructorName: "Prof. Amir Haddad", term: "Spring 2026", status: "in_progress", grade: null, credits: 3, difficulty: "hard", target_grade: "A-", weekly_study_hours: 6, color: "#ef4444", progress: 38 },
    { courseKey: buildCourseKey("DS 415", "Fall 2026"), catalogCode: "DS 415", catalogTitle: "Machine Learning for Omics", instructorName: "Dr. Sofia Alvarez", term: "Fall 2026", status: "planned", grade: null, credits: 3, difficulty: "medium", target_grade: null, weekly_study_hours: 0, color: "#06b6d4", progress: 0 },
  ],
  tasks: [
    { title: "Read Ch. 4 — Read Alignment", description: "Cover BWA and Bowtie2 fundamentals.", due_date: new Date(Date.now() + 2 * 86400000).toISOString(), priority: "medium", status: "todo", task_type: "assignment", estimated_minutes: 60, weight: 5, courseKey: buildCourseKey("BINF 402", "Spring 2026") },
    { title: "Assignment 3: Variant Calling", description: "Run GATK pipeline on provided FASTQ.", due_date: new Date(Date.now() + 9 * 86400000).toISOString(), priority: "high", status: "in_progress", task_type: "assignment", estimated_minutes: 180, weight: 15, courseKey: buildCourseKey("BINF 402", "Spring 2026") },
    { title: "Problem Set 5 — HMMs", description: "Solve Viterbi & Baum-Welch exercises.", due_date: new Date(Date.now() + 5 * 86400000).toISOString(), priority: "high", status: "todo", task_type: "assignment", estimated_minutes: 150, weight: 12, courseKey: buildCourseKey("CS 350", "Spring 2026") },
    { title: "Group project meeting", description: "Sync on suffix-tree implementation.", due_date: new Date(Date.now() + 1 * 86400000).toISOString(), priority: "low", status: "todo", task_type: "project", estimated_minutes: 45, weight: 2, courseKey: buildCourseKey("CS 350", "Spring 2026") },
    { title: "Register for Fall term", description: "Confirm DS 415 seat with advisor.", due_date: new Date(Date.now() + 14 * 86400000).toISOString(), priority: "medium", status: "todo", task_type: "assignment", estimated_minutes: 30, weight: 1, courseKey: buildCourseKey("DS 415", "Fall 2026") },
    { title: "Update CV for internship", description: "Add Rossi lab research assistant role.", due_date: new Date(Date.now() + 7 * 86400000).toISOString(), priority: "medium", status: "in_progress", task_type: "assignment", estimated_minutes: 90, weight: 2, courseKey: null },
    { title: "Review midterm feedback", description: "Revisit sections marked for review.", due_date: new Date(Date.now() - 3 * 86400000).toISOString(), priority: "low", status: "done", task_type: "assignment", estimated_minutes: 45, weight: 4, courseKey: buildCourseKey("BINF 301", "Fall 2025") },
  ],
  assessments: [
    { name: "Midterm Exam", type: "midterm", score: 87, max_score: 100, weight: 30, date: "2025-10-15", courseKey: buildCourseKey("BINF 301", "Fall 2025") },
    { name: "Final Project", type: "project", score: 92, max_score: 100, weight: 40, date: "2025-12-10", courseKey: buildCourseKey("BINF 301", "Fall 2025") },
    { name: "Weekly Quizzes Avg", type: "quiz", score: 88, max_score: 100, weight: 20, date: "2025-12-01", courseKey: buildCourseKey("BINF 301", "Fall 2025") },
    { name: "Assignment 1", type: "assignment", score: 91, max_score: 100, weight: 15, date: "2026-02-05", courseKey: buildCourseKey("BINF 402", "Spring 2026") },
    { name: "Assignment 2", type: "assignment", score: 85, max_score: 100, weight: 15, date: "2026-02-25", courseKey: buildCourseKey("BINF 402", "Spring 2026") },
    { name: "Problem Set 1", type: "assignment", score: 94, max_score: 100, weight: 10, date: "2026-02-08", courseKey: buildCourseKey("CS 350", "Spring 2026") },
    { name: "Problem Set 2", type: "assignment", score: 89, max_score: 100, weight: 10, date: "2026-02-22", courseKey: buildCourseKey("CS 350", "Spring 2026") },
    { name: "Midterm", type: "midterm", score: 82, max_score: 100, weight: 35, date: "2025-10-20", courseKey: buildCourseKey("STAT 320", "Fall 2025") },
    { name: "Final Exam", type: "final", score: 86, max_score: 100, weight: 40, date: "2025-12-14", courseKey: buildCourseKey("STAT 320", "Fall 2025") },
    { name: "Lab Report", type: "lab", score: 95, max_score: 100, weight: 20, date: "2025-11-05", courseKey: buildCourseKey("MBIO 210", "Fall 2025") },
    { name: "Final Exam", type: "final", score: 93, max_score: 100, weight: 45, date: "2025-12-16", courseKey: buildCourseKey("MBIO 210", "Fall 2025") },
  ],
};

export const getSettingsPageData = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await getSupabaseAdmin();

  const [userRes, coursesRes, tasksRes, assessmentsRes] = await Promise.all([
    supabaseAdmin.from("users").select(settingsSelect()).eq("id", USER_ID).single(),
    supabaseAdmin
      .from("courses")
      .select(
        "id, term, status, grade, credits, difficulty, target_grade, weekly_study_hours, color, progress, catalog:course_catalog(code, title, credits, department), instructor:instructors(full_name)",
      )
      .eq("user_id", USER_ID)
      .order("term", { ascending: true }),
    supabaseAdmin
      .from("tasks")
      .select(
        "id, title, description, due_date, priority, status, task_type, estimated_minutes, weight, course:courses(id, term, catalog:course_catalog(code, title))",
      )
      .eq("user_id", USER_ID)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabaseAdmin
      .from("assessments")
      .select("id, name, type, score, max_score, weight, date, course:courses(id, term, catalog:course_catalog(code, title))")
      .order("date", { ascending: true, nullsFirst: false }),
  ]);

  const courses = (coursesRes.data ?? []) as SettingsCourseRow[];
  const tasks = (tasksRes.data ?? []) as SettingsTaskRow[];
  const assessments = (assessmentsRes.data ?? []) as SettingsAssessmentRow[];

  return {
    user: (userRes.data ?? null) as SettingsUserRow | null,
    courses,
    tasks,
    assessments,
    availableSemesters: Array.from(new Set(courses.map((course) => course.term))).sort((a, b) => a.localeCompare(b)),
    stats: {
      activeCourses: courses.filter((course) => course.status === "in_progress").length,
      completedCourses: courses.filter((course) => course.status === "completed").length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter((task) => task.status === "done").length,
      upcomingDeadlines: tasks.filter((task) => task.status !== "done" && task.due_date != null).length,
      totalAssessments: assessments.length,
    },
  } satisfies SettingsPageData;
});

export const saveSettings = createServerFn({ method: "POST" })
  .inputValidator((data: SettingsFormValues) => settingsFormSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await getSupabaseAdmin();
    const updateRow = {
      full_name: data.full_name,
      email: data.email,
      university: data.university,
      major: data.major,
      graduation_year: data.graduation_year,
      target_gpa: data.target_gpa,
      weekly_study_goal_hours: data.weekly_study_goal_hours,
      preferred_study_days: normalizeDays(data.preferred_study_days),
      preferred_study_session_length: data.preferred_study_session_length,
      default_semester: data.default_semester,
      max_credits_per_semester: data.max_credits_per_semester,
      preferred_workload: data.preferred_workload,
      max_difficult_courses: data.max_difficult_courses,
      show_ai_recommendations: data.show_ai_recommendations,
      enable_planner_warnings: data.enable_planner_warnings,
      notify_assignments: data.notify_assignments,
      notify_exams: data.notify_exams,
      notify_weekly_summary: data.notify_weekly_summary,
      notify_registration: data.notify_registration,
      theme: data.theme,
      compact_mode: data.compact_mode,
      animations_enabled: data.animations_enabled,
    };

    const { data: updated, error } = await supabaseAdmin.from("users").update(updateRow).eq("id", USER_ID).select(settingsSelect()).single();
    if (!error && updated) {
      return updated as SettingsUserRow;
    }

    const { data: baseRow, error: baseError } = await supabaseAdmin
      .from("users")
      .update({ full_name: data.full_name, email: data.email, major: data.major })
      .eq("id", USER_ID)
      .select(baseUserSelect())
      .single();

    if (baseError) {
      throw new Error(baseError.message);
    }

    return {
      id: baseRow.id,
      full_name: data.full_name,
      email: data.email,
      university: data.university,
      major: data.major,
      graduation_year: data.graduation_year,
      gpa: baseRow.gpa,
      target_gpa: data.target_gpa,
      weekly_study_goal_hours: data.weekly_study_goal_hours,
      preferred_study_days: normalizeDays(data.preferred_study_days),
      preferred_study_session_length: data.preferred_study_session_length,
      default_semester: data.default_semester,
      max_credits_per_semester: data.max_credits_per_semester,
      preferred_workload: data.preferred_workload,
      max_difficult_courses: data.max_difficult_courses,
      show_ai_recommendations: data.show_ai_recommendations,
      enable_planner_warnings: data.enable_planner_warnings,
      notify_assignments: data.notify_assignments,
      notify_exams: data.notify_exams,
      notify_weekly_summary: data.notify_weekly_summary,
      notify_registration: data.notify_registration,
      theme: data.theme,
      compact_mode: data.compact_mode,
      animations_enabled: data.animations_enabled,
    } satisfies SettingsUserRow;
  });

async function clearAcademicRecords() {
  const { supabaseAdmin } = await getSupabaseAdmin();
  const { data: courseRows, error: courseError } = await supabaseAdmin.from("courses").select("id").eq("user_id", USER_ID);
  if (courseError) {
    throw new Error(courseError.message);
  }

  const courseIds = (courseRows ?? []).map((row) => row.id);
  if (courseIds.length > 0) {
    const { error: assessmentError } = await supabaseAdmin.from("assessments").delete().in("course_id", courseIds);
    if (assessmentError) {
      throw new Error(assessmentError.message);
    }
  }

  const { error: taskError } = await supabaseAdmin.from("tasks").delete().eq("user_id", USER_ID);
  if (taskError) {
    throw new Error(taskError.message);
  }

  const { error: courseDeleteError } = await supabaseAdmin.from("courses").delete().eq("user_id", USER_ID);
  if (courseDeleteError) {
    throw new Error(courseDeleteError.message);
  }
}

async function applyAcademicSnapshot(snapshot: AcademicExportPayload) {
  const { supabaseAdmin } = await getSupabaseAdmin();

  const { error: userError } = await supabaseAdmin
    .from("users")
    .update({
      full_name: snapshot.settings.full_name,
      email: snapshot.settings.email,
      university: snapshot.settings.university,
      major: snapshot.settings.major,
      graduation_year: snapshot.settings.graduation_year,
      target_gpa: snapshot.settings.target_gpa,
      weekly_study_goal_hours: snapshot.settings.weekly_study_goal_hours,
      preferred_study_days: normalizeDays(snapshot.settings.preferred_study_days),
      preferred_study_session_length: snapshot.settings.preferred_study_session_length,
      default_semester: snapshot.settings.default_semester,
      max_credits_per_semester: snapshot.settings.max_credits_per_semester,
      preferred_workload: snapshot.settings.preferred_workload,
      max_difficult_courses: snapshot.settings.max_difficult_courses,
      show_ai_recommendations: snapshot.settings.show_ai_recommendations,
      enable_planner_warnings: snapshot.settings.enable_planner_warnings,
      notify_assignments: snapshot.settings.notify_assignments,
      notify_exams: snapshot.settings.notify_exams,
      notify_weekly_summary: snapshot.settings.notify_weekly_summary,
      notify_registration: snapshot.settings.notify_registration,
      theme: snapshot.settings.theme,
      compact_mode: snapshot.settings.compact_mode,
      animations_enabled: snapshot.settings.animations_enabled,
    })
    .eq("id", USER_ID);

  if (userError) {
    const { error: baseError } = await supabaseAdmin
      .from("users")
      .update({ full_name: snapshot.settings.full_name, email: snapshot.settings.email, major: snapshot.settings.major })
      .eq("id", USER_ID);

    if (baseError) {
      throw new Error(baseError.message);
    }
  }

  await clearAcademicRecords();

  const catalogCodes = Array.from(new Set(snapshot.courses.map((course) => course.catalogCode)));
  const instructorNames = Array.from(new Set(snapshot.courses.map((course) => course.instructorName).filter((value): value is string => Boolean(value))));

  const { data: catalogRows, error: catalogError } = await supabaseAdmin.from("course_catalog").select("id, code").in("code", catalogCodes);
  if (catalogError) {
    throw new Error(catalogError.message);
  }

  const { data: instructorRows, error: instructorError } = instructorNames.length > 0
    ? await supabaseAdmin.from("instructors").select("id, full_name").in("full_name", instructorNames)
    : { data: [], error: null };
  if (instructorError) {
    throw new Error(instructorError.message);
  }

  const catalogIdByCode = new Map((catalogRows ?? []).map((row) => [row.code, row.id] as const));
  const instructorIdByName = new Map((instructorRows ?? []).map((row) => [row.full_name, row.id] as const));
  const courseIdByKey = new Map<string, number>();

  for (const course of snapshot.courses) {
    const catalogId = catalogIdByCode.get(course.catalogCode);
    if (!catalogId) {
      throw new Error(`Missing catalog entry for ${course.catalogCode}`);
    }

    const { data: insertedCourse, error } = await supabaseAdmin
      .from("courses")
      .insert({
        user_id: USER_ID,
        catalog_id: catalogId,
        instructor_id: course.instructorName ? instructorIdByName.get(course.instructorName) ?? null : null,
        term: course.term,
        status: course.status,
        grade: course.grade,
        credits: course.credits,
        difficulty: course.difficulty,
        target_grade: course.target_grade,
        weekly_study_hours: course.weekly_study_hours,
        color: course.color,
        progress: course.progress,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    courseIdByKey.set(course.courseKey, insertedCourse.id);
  }

  for (const task of snapshot.tasks) {
    const courseId = task.courseKey ? courseIdByKey.get(task.courseKey) ?? null : null;
    const { error } = await supabaseAdmin.from("tasks").insert({
      user_id: USER_ID,
      course_id: courseId,
      title: task.title,
      description: task.description,
      due_date: task.due_date,
      priority: task.priority,
      status: task.status,
      task_type: task.task_type,
      estimated_minutes: task.estimated_minutes,
      weight: task.weight,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  for (const assessment of snapshot.assessments) {
    const courseId = assessment.courseKey ? courseIdByKey.get(assessment.courseKey) ?? null : null;
    if (!courseId) {
      throw new Error(`Missing course mapping for assessment ${assessment.name}`);
    }

    const { error } = await supabaseAdmin.from("assessments").insert({
      course_id: courseId,
      name: assessment.name,
      type: assessment.type,
      score: assessment.score,
      max_score: assessment.max_score,
      weight: assessment.weight,
      date: assessment.date,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  const { data: refreshedUser, error: refreshError } = await supabaseAdmin
    .from("users")
    .select(baseUserSelect())
    .eq("id", USER_ID)
    .single();
  if (refreshError) {
    throw new Error(refreshError.message);
  }

  return {
    id: refreshedUser.id,
    full_name: snapshot.settings.full_name,
    email: snapshot.settings.email,
    university: snapshot.settings.university,
    major: snapshot.settings.major,
    graduation_year: snapshot.settings.graduation_year,
    gpa: refreshedUser.gpa,
    target_gpa: snapshot.settings.target_gpa,
    weekly_study_goal_hours: snapshot.settings.weekly_study_goal_hours,
    preferred_study_days: normalizeDays(snapshot.settings.preferred_study_days),
    preferred_study_session_length: snapshot.settings.preferred_study_session_length,
    default_semester: snapshot.settings.default_semester,
    max_credits_per_semester: snapshot.settings.max_credits_per_semester,
    preferred_workload: snapshot.settings.preferred_workload,
    max_difficult_courses: snapshot.settings.max_difficult_courses,
    show_ai_recommendations: snapshot.settings.show_ai_recommendations,
    enable_planner_warnings: snapshot.settings.enable_planner_warnings,
    notify_assignments: snapshot.settings.notify_assignments,
    notify_exams: snapshot.settings.notify_exams,
    notify_weekly_summary: snapshot.settings.notify_weekly_summary,
    notify_registration: snapshot.settings.notify_registration,
    theme: snapshot.settings.theme,
    compact_mode: snapshot.settings.compact_mode,
    animations_enabled: snapshot.settings.animations_enabled,
  } satisfies SettingsUserRow;
}

export const importAcademicData = createServerFn({ method: "POST" })
  .inputValidator((data: AcademicExportPayload) => academicExportSchema.parse(data))
  .handler(async ({ data }) => applyAcademicSnapshot(data));

export const resetDemoData = createServerFn({ method: "POST" }).handler(async () =>
  applyAcademicSnapshot(DEMO_ACADEMIC_EXPORT),
);

export function buildAcademicExport(settings: SettingsFormValues, data: SettingsPageData): AcademicExportPayload {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    courses: data.courses.map((course) => ({
      courseKey: rowToCourseKey(course),
      catalogCode: course.catalog?.code ?? `course-${course.id}`,
      catalogTitle: course.catalog?.title ?? null,
      instructorName: course.instructor?.full_name ?? null,
      term: course.term,
      status: course.status,
      grade: course.grade,
      credits: course.credits,
      difficulty: course.difficulty,
      target_grade: course.target_grade,
      weekly_study_hours: course.weekly_study_hours,
      color: course.color,
      progress: course.progress,
    })),
    tasks: data.tasks.map((task) => ({
      title: task.title,
      description: task.description,
      due_date: task.due_date,
      priority: task.priority,
      status: task.status,
      task_type: task.task_type,
      estimated_minutes: task.estimated_minutes,
      weight: task.weight,
      courseKey: task.course?.catalog?.code && task.course.term ? buildCourseKey(task.course.catalog.code, task.course.term) : null,
    })),
    assessments: data.assessments.map((assessment) => ({
      name: assessment.name,
      type: assessment.type,
      score: assessment.score,
      max_score: assessment.max_score,
      weight: assessment.weight,
      date: assessment.date,
      courseKey: assessment.course?.catalog?.code && assessment.course.term ? buildCourseKey(assessment.course.catalog.code, assessment.course.term) : null,
    })),
  };
}

export function getDefaultSettingsFromUser(user: SettingsUserRow | null, availableSemesters: string[]): SettingsFormValues {
  const fallbackSemester = availableSemesters[availableSemesters.length - 1] ?? `Fall ${currentYear()}`;

  return {
    full_name: user?.full_name ?? "",
    email: user?.email ?? "",
    university: user?.university ?? "",
    major: user?.major ?? "",
    graduation_year: user?.graduation_year ?? currentYear() + 1,
    target_gpa: user?.target_gpa ?? 3.8,
    weekly_study_goal_hours: user?.weekly_study_goal_hours ?? 12,
    preferred_study_days: normalizeDays(user?.preferred_study_days ?? ["Mon", "Wed", "Fri"]),
    preferred_study_session_length: user?.preferred_study_session_length ?? 50,
    default_semester: user?.default_semester ?? fallbackSemester,
    max_credits_per_semester: user?.max_credits_per_semester ?? 15,
    preferred_workload: (user?.preferred_workload as SettingsFormValues["preferred_workload"]) ?? "balanced",
    max_difficult_courses: user?.max_difficult_courses ?? 2,
    show_ai_recommendations: user?.show_ai_recommendations ?? true,
    enable_planner_warnings: user?.enable_planner_warnings ?? true,
    notify_assignments: user?.notify_assignments ?? true,
    notify_exams: user?.notify_exams ?? true,
    notify_weekly_summary: user?.notify_weekly_summary ?? true,
    notify_registration: user?.notify_registration ?? true,
    theme: (user?.theme as SettingsFormValues["theme"]) ?? "system",
    compact_mode: user?.compact_mode ?? false,
    animations_enabled: user?.animations_enabled ?? true,
  };
}