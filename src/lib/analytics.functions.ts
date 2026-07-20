import { createServerFn } from "@tanstack/react-start";

const USER_ID = 1;
// TODO: Replace the demo user id with authenticated user identity once auth is wired end to end.

type CourseRow = {
  id: number;
  term: string;
  status: string;
  grade: string | null;
  credits: number | null;
  difficulty: string;
  target_grade: string | null;
  weekly_study_hours: number;
  catalog: { code: string; title: string; credits: number; department: string | null } | null;
};

type TaskRow = {
  id: number;
  title: string;
  due_date: string | null;
  priority: string;
  status: string;
  estimated_minutes: number;
  weight: number;
  course: { id: number; catalog: { code: string; title: string } | null } | null;
};

type AssessmentRow = {
  id: number;
  name: string;
  type: string;
  score: number | null;
  max_score: number;
  weight: number;
  date: string | null;
  course: {
    id: number;
    term: string;
    catalog: { code: string; title: string; department: string | null } | null;
  } | null;
};

type UserRow = {
  id: number;
  full_name: string;
  gpa: number | null;
  major: string | null;
  year: number | null;
};

export interface AnalyticsOverview {
  currentGpa: number;
  totalCompletedCredits: number;
  activeCourses: number;
  weeklyWorkload: number;
  tasksCompletedThisWeek: number;
  semesterHealthScore: number;
}

export interface AnalyticsRecommendation {
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
}

export interface AnalyticsData {
  user: UserRow | null;
  courses: CourseRow[];
  tasks: TaskRow[];
  assessments: AssessmentRow[];
  overview: AnalyticsOverview;
  recommendations: AnalyticsRecommendation[];
  charts: {
    gpaTrend: { term: string; gpa: number }[];
    creditsPerSemester: { term: string; credits: number }[];
    weeklyWorkload: { day: string; hours: number }[];
    gradeDistribution: { label: string; count: number }[];
    taskCompletion: { status: string; count: number }[];
    courseDifficulty: { label: string; count: number }[];
  };
  breakdowns: {
    departmentPerformance: { department: string; average: number; courses: number }[];
    averageCourseGrades: { code: string; title: string; average: number; term: string }[];
    mostDifficultCourses: { code: string; title: string; difficulty: number; term: string }[];
    strongestCourses: { code: string; title: string; score: number; term: string }[];
    weakestCourses: { code: string; title: string; score: number; term: string }[];
  };
  productivity: {
    tasksCompleted: number;
    completionPercentage: number;
    upcomingDeadlines: TaskRow[];
    averageWeeklyStudyHours: number;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function gradeToPoints(grade: string | null): number | null {
  if (!grade) return null;
  const normalized = grade.trim().toUpperCase();
  const map: Record<string, number> = {
    "A+": 4,
    A: 4,
    "A-": 3.7,
    "B+": 3.3,
    B: 3,
    "B-": 2.7,
    "C+": 2.3,
    C: 2,
    "C-": 1.7,
    "D+": 1.3,
    D: 1,
    F: 0,
  };
  if (normalized in map) return map[normalized];
  const numeric = Number(normalized);
  if (!Number.isNaN(numeric)) {
    if (numeric >= 90) return 4;
    if (numeric >= 85) return 3.7;
    if (numeric >= 80) return 3.3;
    if (numeric >= 75) return 3;
    if (numeric >= 70) return 2.7;
    if (numeric >= 65) return 2.3;
    if (numeric >= 60) return 2;
    if (numeric >= 55) return 1;
    return 0;
  }
  return null;
}

function difficultyToLabel(value: string): string {
  switch (value) {
    case "easy":
      return "Easy";
    case "hard":
      return "Hard";
    default:
      return "Medium";
  }
}

function priorityStudyHours(priority: string): number {
  if (priority === "high") return 3.5;
  if (priority === "medium") return 2;
  return 1;
}

function buildGpaTrend(courses: CourseRow[]) {
  const byTerm = new Map<string, CourseRow[]>();
  for (const course of courses.filter((course) => course.grade)) {
    if (!byTerm.has(course.term)) byTerm.set(course.term, []);
    byTerm.get(course.term)!.push(course);
  }

  return Array.from(byTerm.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([term, rows]) => {
      const points = rows.map((course) => gradeToPoints(course.grade)).filter((value): value is number => value != null);
      const credits = rows.reduce((sum, course) => sum + Number(course.credits ?? course.catalog?.credits ?? 0), 0);
      const weighted = rows.reduce((sum, course) => {
        const points = gradeToPoints(course.grade);
        const weight = Number(course.credits ?? course.catalog?.credits ?? 0);
        return sum + (points != null ? points * weight : 0);
      }, 0);
      return {
        term,
        gpa: credits > 0 && weighted > 0 ? round(weighted / credits, 2) : points.length > 0 ? round(points.reduce((s, p) => s + p, 0) / points.length, 2) : 0,
      };
    });
}

function buildCreditsPerSemester(courses: CourseRow[]) {
  const byTerm = new Map<string, number>();
  for (const course of courses) {
    const credits = Number(course.credits ?? course.catalog?.credits ?? 0);
    byTerm.set(course.term, (byTerm.get(course.term) ?? 0) + credits);
  }
  return Array.from(byTerm.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([term, credits]) => ({ term, credits }));
}

function buildWeeklyWorkload(tasks: TaskRow[], courses: CourseRow[]) {
  const weekStart = new Date();
  const day = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - day);
  weekStart.setHours(0, 0, 0, 0);

  const activeCourseCount = courses.filter((course) => course.status === "in_progress").length;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return days.map((label, index) => {
    const dayDate = new Date(weekStart.getTime() + index * 86400000);
    const iso = dayDate.toISOString().slice(0, 10);
    const dayTasks = tasks.filter((task) => task.due_date?.slice(0, 10) === iso);
    const taskLoad = dayTasks.reduce((sum, task) => sum + priorityStudyHours(task.priority), 0);
    const baseline = activeCourseCount * 0.75;
    return { day: label, hours: round(taskLoad + baseline, 1) };
  });
}

function buildGradeDistribution(courses: CourseRow[]) {
  const buckets = ["A", "B", "C", "D", "F"];
  const counts = new Map(buckets.map((bucket) => [bucket, 0] as const));
  for (const course of courses) {
    const points = gradeToPoints(course.grade);
    if (points == null) continue;
    const grade = course.grade?.trim().toUpperCase() ?? "";
    let label = "F";
    if (grade.startsWith("A")) label = "A";
    else if (grade.startsWith("B")) label = "B";
    else if (grade.startsWith("C")) label = "C";
    else if (grade.startsWith("D")) label = "D";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return buckets.map((label) => ({ label, count: counts.get(label) ?? 0 }));
}

function buildTaskCompletion(tasks: TaskRow[]) {
  const complete = tasks.filter((task) => task.status === "done").length;
  const inProgress = tasks.filter((task) => task.status === "in_progress").length;
  const todo = tasks.filter((task) => task.status === "todo").length;
  return [
    { status: "Done", count: complete },
    { status: "In progress", count: inProgress },
    { status: "To do", count: todo },
  ];
}

function buildCourseDifficulty(courses: CourseRow[]) {
  const counts = { easy: 0, medium: 0, hard: 0 };
  for (const course of courses) {
    if (course.difficulty === "easy") counts.easy += 1;
    else if (course.difficulty === "hard") counts.hard += 1;
    else counts.medium += 1;
  }
  return [
    { label: difficultyToLabel("easy"), count: counts.easy },
    { label: difficultyToLabel("medium"), count: counts.medium },
    { label: difficultyToLabel("hard"), count: counts.hard },
  ];
}

function buildBreakdowns(courses: CourseRow[], assessments: AssessmentRow[]) {
  const departmentMap = new Map<string, { sum: number; count: number }>();
  for (const course of courses.filter((course) => course.grade)) {
    const department = course.catalog?.department ?? "Undeclared";
    const points = gradeToPoints(course.grade);
    if (points == null) continue;
    const existing = departmentMap.get(department) ?? { sum: 0, count: 0 };
    existing.sum += points;
    existing.count += 1;
    departmentMap.set(department, existing);
  }

  const departmentPerformance = Array.from(departmentMap.entries())
    .map(([department, row]) => ({ department, average: round(row.sum / row.count, 2), courses: row.count }))
    .sort((a, b) => b.average - a.average);

  const averageCourseGrades = courses
    .filter((course) => course.grade)
    .map((course) => ({
      code: course.catalog?.code ?? `#${course.id}`,
      title: course.catalog?.title ?? "Unknown course",
      average: gradeToPoints(course.grade) ?? 0,
      term: course.term,
    }))
    .sort((a, b) => b.average - a.average);

  const assessmentScores = assessments
    .filter((assessment) => assessment.score != null)
    .map((assessment) => ({
      code: assessment.course?.catalog?.code ?? assessment.name,
      title: assessment.course?.catalog?.title ?? assessment.name,
      score: round((Number(assessment.score) / Number(assessment.max_score)) * 100, 1),
      term: assessment.course?.term ?? "",
    }));

  const mostDifficultCourses = [...averageCourseGrades]
    .sort((a, b) => a.average - b.average)
    .slice(0, 5)
    .map((course) => ({ ...course, difficulty: round(4 - course.average, 2) }));

  const strongestCourses = [...assessmentScores].sort((a, b) => b.score - a.score).slice(0, 5);
  const weakestCourses = [...assessmentScores].sort((a, b) => a.score - b.score).slice(0, 5);

  return {
    departmentPerformance,
    averageCourseGrades,
    mostDifficultCourses,
    strongestCourses,
    weakestCourses,
  };
}

function buildRecommendations(overview: AnalyticsOverview, breakdowns: ReturnType<typeof buildBreakdowns>, tasks: TaskRow[], courses: CourseRow[]): AnalyticsRecommendation[] {
  const recommendations: AnalyticsRecommendation[] = [];

  if (breakdowns.averageCourseGrades.length > 1) {
    const trend = buildGpaTrend(courses);
    if (trend.length >= 2) {
      const last = trend[trend.length - 1]?.gpa ?? 0;
      const previous = trend[trend.length - 2]?.gpa ?? last;
      if (last > previous + 0.15) {
        recommendations.push({ title: "GPA improving", message: "Your latest semester GPA is trending upward. Keep the same course balance and study cadence.", severity: "info" });
      } else if (last + 0.15 < previous) {
        recommendations.push({ title: "GPA declining", message: "Your latest semester GPA dipped compared with the prior term. Reduce overload and review weak courses early.", severity: "warning" });
      }
    }
  }

  if (overview.weeklyWorkload > 45) {
    recommendations.push({ title: "Heavy workload warning", message: "Current weekly workload exceeds 45 hours. Reduce new commitments or rebalance course effort.", severity: "critical" });
  }

  if (courses.filter((course) => course.difficulty === "hard").length >= 3) {
    recommendations.push({ title: "Too many difficult courses", message: "Three or more courses are marked hard. Consider spreading them across more terms.", severity: "warning" });
  }

  const coreCount = courses.filter((course) => {
    const code = course.catalog?.code ?? "";
    return /^(CS|BIO|STAT|MATH|ENG|CHEM|PHYS)\s/i.test(code);
  }).length;
  const electiveCount = courses.length - coreCount;
  if (courses.length > 0 && (coreCount === 0 || electiveCount === 0 || Math.abs(coreCount - electiveCount) >= 3)) {
    recommendations.push({ title: "Balance electives and core courses", message: "Your course mix is skewed toward one category. Balance electives and core requirements across terms.", severity: "info" });
  }

  const backlog = tasks.filter((task) => task.status !== "done").length;
  if (backlog >= 5) {
    recommendations.push({ title: "High task backlog", message: "You have several unfinished tasks. Clear the backlog before adding more commitments.", severity: "warning" });
  }

  const activeCourses = courses.filter((course) => course.status === "in_progress");
  if (activeCourses.length > 0 && overview.semesterHealthScore >= 80 && overview.weeklyWorkload <= 45) {
    recommendations.push({ title: "Strong semester performance", message: "Your current semester looks balanced and sustainable. Keep up the current pace.", severity: "info" });
  }

  if (recommendations.length === 0) {
    recommendations.push({ title: "Balanced academic profile", message: "No major issues detected. Your current load and task balance are within a healthy range.", severity: "info" });
  }

  return recommendations;
}

function computeOverview(user: UserRow | null, courses: CourseRow[], tasks: TaskRow[], assessments: AssessmentRow[]) : AnalyticsOverview {
  const currentGpa = Number(user?.gpa ?? 0);
  const totalCompletedCredits = courses
    .filter((course) => course.status === "completed")
    .reduce((sum, course) => sum + Number(course.credits ?? course.catalog?.credits ?? 0), 0);

  const activeCourses = courses.filter((course) => course.status === "in_progress").length;

  const weeklyWorkload = round(
    courses.filter((course) => course.status === "in_progress").reduce((sum, course) => sum + Number(course.weekly_study_hours ?? 0), 0) +
      tasks.filter((task) => task.status !== "done").reduce((sum, task) => sum + priorityStudyHours(task.priority), 0),
    1,
  );

  const start = new Date();
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const tasksCompletedThisWeek = tasks.filter((task) => {
    if (task.status !== "done") return false;
    if (!task.due_date) return false;
    const due = new Date(task.due_date);
    return due >= start && due < new Date(start.getTime() + 7 * 86400000);
  }).length;

  const completionRate = tasks.length > 0 ? tasks.filter((task) => task.status === "done").length / tasks.length : 0;
  const assessmentAverage = assessments.filter((assessment) => assessment.score != null).length > 0
    ? assessments.filter((assessment) => assessment.score != null).reduce((sum, assessment) => sum + (Number(assessment.score) / Number(assessment.max_score)) * 100, 0) /
      assessments.filter((assessment) => assessment.score != null).length
    : 0;

  const semesterHealthScore = clamp(
    Math.round(
      35 +
        currentGpa * 12 +
        (assessmentAverage / 100) * 20 +
        completionRate * 15 +
        Math.max(0, 18 - Math.abs(totalCompletedCredits - 15)) * 1.2 +
        Math.max(0, 45 - weeklyWorkload) * 0.2,
    ),
    0,
    100,
  );

  return {
    currentGpa,
    totalCompletedCredits,
    activeCourses,
    weeklyWorkload,
    tasksCompletedThisWeek,
    semesterHealthScore,
  };
}

export const getAnalyticsData = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [userRes, coursesRes, tasksRes, assessmentsRes] = await Promise.all([
    supabaseAdmin.from("users").select("id, full_name, gpa, major, year").eq("id", USER_ID).single(),
    supabaseAdmin
      .from("courses")
      .select(
        "id, term, status, grade, credits, difficulty, target_grade, weekly_study_hours, catalog:course_catalog(code, title, credits, department)",
      )
      .eq("user_id", USER_ID)
      .order("term", { ascending: true }),
    supabaseAdmin
      .from("tasks")
      .select(
        "id, title, due_date, priority, status, estimated_minutes, weight, course:courses(id, catalog:course_catalog(code, title))",
      )
      .eq("user_id", USER_ID)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabaseAdmin
      .from("assessments")
      .select(
        "id, name, type, score, max_score, weight, date, course:courses(id, term, catalog:course_catalog(code, title, department))",
      )
      .order("date", { ascending: true }),
  ]);

  const user = userRes.data as UserRow | null;
  const courses = (coursesRes.data ?? []) as CourseRow[];
  const tasks = (tasksRes.data ?? []) as TaskRow[];
  const assessments = ((assessmentsRes.data ?? []) as AssessmentRow[]).filter((assessment) => assessment.course?.id != null);

  const overview = computeOverview(user, courses, tasks, assessments);
  const breakdowns = buildBreakdowns(courses, assessments);

  return {
    user,
    courses,
    tasks,
    assessments,
    overview,
    recommendations: buildRecommendations(overview, breakdowns, tasks, courses),
    charts: {
      gpaTrend: buildGpaTrend(courses),
      creditsPerSemester: buildCreditsPerSemester(courses),
      weeklyWorkload: buildWeeklyWorkload(tasks, courses),
      gradeDistribution: buildGradeDistribution(courses),
      taskCompletion: buildTaskCompletion(tasks),
      courseDifficulty: buildCourseDifficulty(courses),
    },
    breakdowns,
    productivity: {
      tasksCompleted: tasks.filter((task) => task.status === "done").length,
      completionPercentage: tasks.length > 0 ? round((tasks.filter((task) => task.status === "done").length / tasks.length) * 100, 1) : 0,
      upcomingDeadlines: tasks.filter((task) => task.status !== "done").slice(0, 6),
      averageWeeklyStudyHours:
        courses.length > 0
          ? round(courses.reduce((sum, course) => sum + Number(course.weekly_study_hours ?? 0), 0) / courses.length, 1)
          : 0,
    },
  } satisfies AnalyticsData;
});