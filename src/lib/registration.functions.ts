import { createServerFn } from "@tanstack/react-start";

import type { Tables } from "@/integrations/supabase/types";

const USER_ID = 1;
// TODO: Replace the demo user id with authenticated user identity once auth is wired end to end.

export type PlannerTerm = "spring" | "summer" | "fall" | "winter";
export type PlannerPriority = "low" | "medium" | "high";
export type PlannerStatus = "planned" | "registered" | "waitlisted";
export type PlannerDifficulty = "easy" | "medium" | "hard";

export type PlannerSeverity = "info" | "warning" | "critical";

export interface RegistrationPlannerInput {
  semesterId?: number | null;
}

export interface RegistrationSemester extends Tables<"semesters"> {}

export interface RegistrationCatalogCourse extends Tables<"course_catalog"> {}

export interface RegistrationPlanItem extends Tables<"semester_plan_items"> {
  catalog: RegistrationCatalogCourse;
}

export interface RegistrationPlannerSummary {
  totalCredits: number;
  estimatedWeeklyWorkload: number;
  highPriorityCourses: number;
  highDifficultyCourses: number;
  registeredCourses: number;
  waitlistedCourses: number;
  semesterDifficultyScore: number;
  semesterDifficultyLabel: "light" | "balanced" | "heavy";
  semesterHealthScore: number;
  warnings: string[];
}

export interface RegistrationPlannerRecommendation {
  severity: PlannerSeverity;
  title: string;
  message: string;
  actionLabel: string;
}

export interface RegistrationPlannerData {
  semesters: RegistrationSemester[];
  selectedSemester: RegistrationSemester | null;
  planItems: RegistrationPlanItem[];
  catalogCourses: RegistrationCatalogCourse[];
  summary: RegistrationPlannerSummary;
  recommendations: RegistrationPlannerRecommendation[];
}

export interface CreateSemesterInput {
  term: PlannerTerm;
  academicYear: number;
}

export interface AddCourseToSemesterInput {
  semesterId: number;
  catalogId: number;
  priority?: PlannerPriority;
  status?: PlannerStatus;
  difficulty?: PlannerDifficulty;
}

export interface UpdateSemesterPlanItemInput {
  itemId: number;
  priority?: PlannerPriority;
  status?: PlannerStatus;
  difficulty?: PlannerDifficulty;
}

export interface RemoveCourseFromSemesterInput {
  itemId: number;
}

const TERM_ORDER: PlannerTerm[] = ["spring", "summer", "fall", "winter"];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function validateTerm(term: string): PlannerTerm {
  const normalized = normalizeText(term);
  if (!TERM_ORDER.includes(normalized as PlannerTerm)) {
    throw new Error("Invalid term. Expected spring, summer, fall, or winter.");
  }
  return normalized as PlannerTerm;
}

function priorityWorkloadHours(priority: PlannerPriority, credits: number): number {
  const multipliers: Record<PlannerPriority, number> = {
    low: 2,
    medium: 2.5,
    high: 3,
  };
  return credits * multipliers[priority];
}

function difficultyWeight(difficulty: PlannerDifficulty): number {
  const weights: Record<PlannerDifficulty, number> = {
    easy: 1,
    medium: 2,
    hard: 3,
  };
  return weights[difficulty];
}

function selectSemesterById(
  semesters: RegistrationSemester[],
  semesterId?: number | null,
): RegistrationSemester | null {
  if (semesterId == null) {
    return semesters.length > 0 ? semesters[0] : null;
  }

  const match = semesters.find((semester) => semester.id === semesterId);
  if (!match) {
    throw new Error("Invalid semester ID. The requested semester does not exist.");
  }
  return match;
}

function sortSemesters(semesters: RegistrationSemester[]): RegistrationSemester[] {
  return [...semesters].sort((left, right) => {
    if (left.academic_year !== right.academic_year) {
      return left.academic_year - right.academic_year;
    }
    return TERM_ORDER.indexOf(left.term as PlannerTerm) - TERM_ORDER.indexOf(right.term as PlannerTerm);
  });
}

function buildSummary(planItems: RegistrationPlanItem[]): RegistrationPlannerSummary {
  const totalCredits = planItems.reduce((sum, item) => sum + Number(item.catalog?.credits ?? 0), 0);

  const estimatedWeeklyWorkload = planItems.reduce((sum, item) => {
    const credits = Number(item.catalog?.credits ?? 0);
    return sum + priorityWorkloadHours(item.priority as PlannerPriority, credits);
  }, 0);

  const highPriorityCourses = planItems.filter((item) => item.priority === "high").length;
  const highDifficultyCourses = planItems.filter((item) => item.difficulty === "hard").length;
  const registeredCourses = planItems.filter((item) => item.status === "registered").length;
  const waitlistedCourses = planItems.filter((item) => item.status === "waitlisted").length;

  const difficultyScore =
    totalCredits > 0
      ? planItems.reduce((sum, item) => {
          const credits = Number(item.catalog?.credits ?? 0);
          return sum + credits * difficultyWeight(item.difficulty as PlannerDifficulty);
        }, 0) / totalCredits
      : 0;

  const semesterDifficultyLabel: RegistrationPlannerSummary["semesterDifficultyLabel"] =
    difficultyScore === 0
      ? "light"
      : difficultyScore < 1.75
        ? "light"
        : difficultyScore < 2.4
          ? "balanced"
          : "heavy";

  const creditsOver = Math.max(0, totalCredits - 18);
  const creditsUnder = Math.max(0, 12 - totalCredits);
  const workloadOver = Math.max(0, estimatedWeeklyWorkload - 45);
  const highPriorityPenalty = Math.max(0, highPriorityCourses - 2);

  const semesterHealthScore = clamp(
    Math.round(
      100 -
        creditsOver * 12 -
        creditsUnder * 8 -
        workloadOver * 2 -
        highPriorityPenalty * 10 -
        waitlistedCourses * 8,
    ),
    0,
    100,
  );

  const warnings: string[] = [];
  if (totalCredits > 18) warnings.push("Total credits exceed 18.");
  if (totalCredits < 12) warnings.push("Total credits are below 12.");
  if (estimatedWeeklyWorkload > 45) warnings.push("Estimated weekly workload exceeds 45 hours.");
  if (highPriorityCourses >= 3) warnings.push("Three or more courses are marked high priority.");
  if (highDifficultyCourses >= 3) warnings.push("Three or more courses are marked high difficulty.");
  if (waitlistedCourses > 0) warnings.push("The plan contains waitlisted courses.");

  return {
    totalCredits,
    estimatedWeeklyWorkload: Number(estimatedWeeklyWorkload.toFixed(1)),
    highPriorityCourses,
    highDifficultyCourses,
    registeredCourses,
    waitlistedCourses,
    semesterDifficultyScore: Number(difficultyScore.toFixed(2)),
    semesterDifficultyLabel,
    semesterHealthScore,
    warnings,
  };
}

function buildRecommendations(summary: RegistrationPlannerSummary): RegistrationPlannerRecommendation[] {
  const recommendations: RegistrationPlannerRecommendation[] = [];

  if (summary.totalCredits > 18) {
    recommendations.push({
      severity: "critical",
      title: "Credit load is too high",
      message: "This semester is above the 18-credit threshold. Remove or defer at least one course.",
      actionLabel: "Reduce credits",
    });
  }

  if (summary.totalCredits < 12) {
    recommendations.push({
      severity: "warning",
      title: "Credit load is light",
      message: "This semester is below 12 credits. Consider adding another course if it fits your degree plan.",
      actionLabel: "Add a course",
    });
  }

  if (summary.estimatedWeeklyWorkload > 45) {
    recommendations.push({
      severity: "warning",
      title: "Workload is heavy",
      message: "Estimated weekly workload is above 45 hours. Rebalance by lowering the priority of one or more courses.",
      actionLabel: "Rebalance workload",
    });
  }

  if (summary.highPriorityCourses >= 3) {
    recommendations.push({
      severity: "warning",
      title: "Too many high-priority courses",
      message: "Three or more courses are marked high priority. Lower one to medium priority to spread the load.",
      actionLabel: "Adjust priorities",
    });
  }

  if (summary.highDifficultyCourses >= 3) {
    recommendations.push({
      severity: "warning",
      title: "Difficulty concentration is high",
      message: "Three or more courses are marked high difficulty. Consider balancing the term with an easier option.",
      actionLabel: "Balance difficulty",
    });
  }

  if (summary.waitlistedCourses > 0) {
    recommendations.push({
      severity: "warning",
      title: "Waitlisted courses need backup plans",
      message: "At least one course is waitlisted. Add an alternate course so the semester still works if the waitlist does not clear.",
      actionLabel: "Add backup",
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      severity: "info",
      title: "Plan looks balanced",
      message: "The current semester plan is within the basic load limits and does not trigger any planner warnings.",
      actionLabel: "Keep planning",
    });
  }

  return recommendations;
}

async function loadSemesters() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("semesters")
    .select("id, user_id, term, academic_year, created_at, updated_at")
    .eq("user_id", USER_ID)
    .order("academic_year", { ascending: true })
    .order("term", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as RegistrationSemester[];
}

async function loadCatalogCourses() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("course_catalog")
    .select("id, code, title, description, credits, department, created_at, updated_at")
    .order("code", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as RegistrationCatalogCourse[];
}

async function loadPlanItems(semesterId: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("semester_plan_items")
    .select(
      "id, user_id, semester_id, catalog_id, priority, status, difficulty, created_at, updated_at, catalog:course_catalog(id, code, title, description, credits, department, created_at, updated_at)",
    )
    .eq("user_id", USER_ID)
    .eq("semester_id", semesterId)
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as RegistrationPlanItem[];
}

async function requireSemester(semesterId: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("semesters")
    .select("id, user_id, term, academic_year, created_at, updated_at")
    .eq("id", semesterId)
    .eq("user_id", USER_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Invalid semester ID. The requested semester does not exist.");
  }

  return data as RegistrationSemester;
}

async function requireCatalogCourse(catalogId: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("course_catalog")
    .select("id, code, title, description, credits, department, created_at, updated_at")
    .eq("id", catalogId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Missing course catalog record. The selected course could not be found.");
  }

  return data as RegistrationCatalogCourse;
}

async function requirePlanItem(itemId: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("semester_plan_items")
    .select(
      "id, user_id, semester_id, catalog_id, priority, status, difficulty, created_at, updated_at, catalog:course_catalog(id, code, title, description, credits, department, created_at, updated_at)",
    )
    .eq("id", itemId)
    .eq("user_id", USER_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Missing planned course record. The requested item could not be found.");
  }

  return data as RegistrationPlanItem;
}

export const getRegistrationPlannerData = createServerFn({ method: "GET" })
  .inputValidator((input: RegistrationPlannerInput | undefined) => input ?? {})
  .handler(async ({ data }) => {
    const semesters = sortSemesters(await loadSemesters());
    const selectedSemester = selectSemesterById(semesters, data.semesterId);
    const catalogCourses = await loadCatalogCourses();

    const planItems = selectedSemester ? await loadPlanItems(selectedSemester.id) : [];
    const summary = buildSummary(planItems);

    return {
      semesters,
      selectedSemester,
      planItems,
      catalogCourses,
      summary,
      recommendations: buildRecommendations(summary),
    } satisfies RegistrationPlannerData;
  });

export const createSemester = createServerFn({ method: "POST" })
  .inputValidator((input: CreateSemesterInput) => input)
  .handler(async ({ data }) => {
    const term = validateTerm(data.term);
    if (!Number.isInteger(data.academicYear) || data.academicYear < 2000) {
      throw new Error("Invalid academic year. Expected a four-digit year of 2000 or later.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("semesters")
      .select("id")
      .eq("user_id", USER_ID)
      .eq("term", term)
      .eq("academic_year", data.academicYear)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing) {
      throw new Error("Duplicate semester. A semester for that term and year already exists.");
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("semesters")
      .insert({
        user_id: USER_ID,
        term,
        academic_year: data.academicYear,
      })
      .select("id, user_id, term, academic_year, created_at, updated_at")
      .single();

    if (error || !inserted) {
      throw new Error(error?.message ?? "Failed to create semester.");
    }

    return inserted as RegistrationSemester;
  });

export const addCourseToSemester = createServerFn({ method: "POST" })
  .inputValidator((input: AddCourseToSemesterInput) => input)
  .handler(async ({ data }) => {
    const semester = await requireSemester(data.semesterId);
    const catalogCourse = await requireCatalogCourse(data.catalogId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("semester_plan_items")
      .select("id")
      .eq("user_id", USER_ID)
      .eq("semester_id", semester.id)
      .eq("catalog_id", catalogCourse.id)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing) {
      throw new Error("Duplicate course. This course is already planned for the selected semester.");
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("semester_plan_items")
      .insert({
        user_id: USER_ID,
        semester_id: semester.id,
        catalog_id: catalogCourse.id,
        priority: data.priority ?? "medium",
        status: data.status ?? "planned",
        difficulty: data.difficulty ?? "medium",
      })
      .select(
        "id, user_id, semester_id, catalog_id, priority, status, difficulty, created_at, updated_at, catalog:course_catalog(id, code, title, description, credits, department, created_at, updated_at)",
      )
      .single();

    if (error || !inserted) {
      throw new Error(error?.message ?? "Failed to add course to semester.");
    }

    return inserted as RegistrationPlanItem;
  });

export const updateSemesterPlanItem = createServerFn({ method: "POST" })
  .inputValidator((input: UpdateSemesterPlanItemInput) => input)
  .handler(async ({ data }) => {
    if (!Number.isInteger(data.itemId) || data.itemId <= 0) {
      throw new Error("Invalid planned course ID.");
    }

    const patch: Partial<Pick<RegistrationPlanItem, "priority" | "status" | "difficulty">> = {};
    if (data.priority) patch.priority = data.priority;
    if (data.status) patch.status = data.status;
    if (data.difficulty) patch.difficulty = data.difficulty;

    if (Object.keys(patch).length === 0) {
      throw new Error("No updates were provided for the planned course.");
    }

    await requirePlanItem(data.itemId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin
      .from("semester_plan_items")
      .update(patch)
      .eq("id", data.itemId)
      .eq("user_id", USER_ID)
      .select(
        "id, user_id, semester_id, catalog_id, priority, status, difficulty, created_at, updated_at, catalog:course_catalog(id, code, title, description, credits, department, created_at, updated_at)",
      )
      .single();

    if (error || !updated) {
      throw new Error(error?.message ?? "Failed to update planned course.");
    }

    return updated as RegistrationPlanItem;
  });

export const removeCourseFromSemester = createServerFn({ method: "POST" })
  .inputValidator((input: RemoveCourseFromSemesterInput) => input)
  .handler(async ({ data }) => {
    if (!Number.isInteger(data.itemId) || data.itemId <= 0) {
      throw new Error("Invalid planned course ID.");
    }

    await requirePlanItem(data.itemId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("semester_plan_items")
      .delete()
      .eq("id", data.itemId)
      .eq("user_id", USER_ID);

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  });