import { createServerFn } from "@tanstack/react-start";

const USER_ID = 1;
// TODO: Replace the demo user id with authenticated user identity once auth is wired end to end.

export type ReviewRatingField = "rating" | "teaching_quality_rating" | "course_difficulty_rating" | "workload_rating";

export interface ReviewCatalogCourse {
  id: number;
  code: string;
  title: string;
  credits: number;
  department: string | null;
}

export interface ReviewInstructorCourse {
  id: number;
  code: string;
  title: string;
  department: string | null;
}

export interface ReviewInstructor {
  id: number;
  full_name: string;
  department: string | null;
  email: string | null;
  bio: string | null;
  average_rating: number;
  review_count: number;
  teaching_quality_rating: number;
  course_difficulty_rating: number;
  workload_rating: number;
}

export interface ReviewRow {
  id: number;
  user_id: number;
  instructor_id: number;
  course_id: number | null;
  rating: number;
  teaching_quality_rating: number;
  course_difficulty_rating: number;
  workload_rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  instructor: {
    id: number;
    full_name: string;
    department: string | null;
  };
  course: ReviewInstructorCourse | null;
}

export interface ReviewsPageData {
  instructors: ReviewInstructor[];
  selectedInstructor: ReviewInstructor | null;
  reviews: ReviewRow[];
  courseOptions: ReviewCatalogCourse[];
  userReview: ReviewRow | null;
}

export interface LoadReviewsInput {
  instructorId?: number | null;
}

export interface SaveReviewInput {
  id?: number;
  instructorId: number;
  courseId?: number | null;
  rating: number;
  teachingQualityRating: number;
  courseDifficultyRating: number;
  workloadRating: number;
  comment?: string | null;
}

export interface DeleteReviewInput {
  id: number;
}

function clampRating(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Rating values must be numbers between 1 and 5.");
  }
  const rounded = Math.round(value);
  if (rounded < 1 || rounded > 5) {
    throw new Error("Rating values must be between 1 and 5.");
  }
  return rounded;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

async function getSupabaseAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function loadInstructors() {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("instructors")
    .select("id, full_name, department, email, bio")
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const { data: reviewRows, error: reviewError } = await supabaseAdmin
    .from("reviews")
    .select("instructor_id, rating, teaching_quality_rating, course_difficulty_rating, workload_rating");

  if (reviewError) {
    throw new Error(reviewError.message);
  }

  const ratingsByInstructor = new Map<number, ReviewRow[]>(
    (reviewRows ?? []).reduce((acc, review: any) => {
      if (!acc.has(review.instructor_id)) {
        acc.set(review.instructor_id, []);
      }
      return acc;
    }, new Map<number, ReviewRow[]>()),
  );

  for (const row of (reviewRows ?? []) as Array<{
    instructor_id: number;
    rating: number;
    teaching_quality_rating: number;
    course_difficulty_rating: number;
    workload_rating: number;
  }>) {
    if (!ratingsByInstructor.has(row.instructor_id)) {
      ratingsByInstructor.set(row.instructor_id, []);
    }
    ratingsByInstructor.get(row.instructor_id)!.push({
      id: 0,
      user_id: 0,
      instructor_id: row.instructor_id,
      course_id: null,
      rating: row.rating,
      teaching_quality_rating: row.teaching_quality_rating,
      course_difficulty_rating: row.course_difficulty_rating,
      workload_rating: row.workload_rating,
      comment: null,
      created_at: "",
      updated_at: "",
      instructor: { id: row.instructor_id, full_name: "", department: null },
      course: null,
    });
  }

  return (data ?? []).map((instructor: any) => {
    const reviews = ratingsByInstructor.get(instructor.id) ?? [];
    const reviewCount = reviews.length;
    const averageRating =
      reviewCount > 0
        ? roundToOneDecimal(reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviewCount)
        : 0;
    const teachingQualityRating =
      reviewCount > 0
        ? roundToOneDecimal(
            reviews.reduce((sum, review) => sum + Number(review.teaching_quality_rating), 0) / reviewCount,
          )
        : 0;
    const courseDifficultyRating =
      reviewCount > 0
        ? roundToOneDecimal(
            reviews.reduce((sum, review) => sum + Number(review.course_difficulty_rating), 0) / reviewCount,
          )
        : 0;
    const workloadRating =
      reviewCount > 0
        ? roundToOneDecimal(reviews.reduce((sum, review) => sum + Number(review.workload_rating), 0) / reviewCount)
        : 0;

    return {
      ...instructor,
      average_rating: averageRating,
      review_count: reviewCount,
      teaching_quality_rating: teachingQualityRating,
      course_difficulty_rating: courseDifficultyRating,
      workload_rating: workloadRating,
    } satisfies ReviewInstructor;
  });
}

async function loadCourseOptions() {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("course_catalog")
    .select("id, code, title, credits, department")
    .order("code", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ReviewCatalogCourse[];
}

async function loadReviewsForInstructor(instructorId: number) {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("reviews")
    .select(
      "id, user_id, instructor_id, course_id, rating, teaching_quality_rating, course_difficulty_rating, workload_rating, comment, created_at, updated_at, instructor:instructors(id, full_name, department), course:courses(id, catalog:course_catalog(code, title, department))",
    )
    .eq("instructor_id", instructorId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ReviewRow[];
}

async function loadUserReview(instructorId: number) {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("reviews")
    .select(
      "id, user_id, instructor_id, course_id, rating, teaching_quality_rating, course_difficulty_rating, workload_rating, comment, created_at, updated_at, instructor:instructors(id, full_name, department), course:courses(id, catalog:course_catalog(code, title, department))",
    )
    .eq("instructor_id", instructorId)
    .eq("user_id", USER_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as ReviewRow | null;
}

async function requireInstructor(instructorId: number) {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("instructors")
    .select("id, full_name, department, email, bio")
    .eq("id", instructorId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Selected instructor could not be found.");
  }

  return data;
}

async function requireCourse(courseId: number) {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("course_catalog")
    .select("id, code, title, credits, department")
    .eq("id", courseId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Selected course could not be found.");
  }

  return data as ReviewCatalogCourse;
}

export const getInstructorReviewsData = createServerFn({ method: "GET" })
  .inputValidator((input: LoadReviewsInput | undefined) => input ?? {})
  .handler(async ({ data }) => {
    const instructors = await loadInstructors();
    const courseOptions = await loadCourseOptions();

    const selectedInstructor =
      data.instructorId != null
        ? instructors.find((instructor) => instructor.id === data.instructorId) ?? null
        : instructors[0] ?? null;

    const reviews = selectedInstructor ? await loadReviewsForInstructor(selectedInstructor.id) : [];
    const userReview = selectedInstructor ? await loadUserReview(selectedInstructor.id) : null;

    return {
      instructors,
      selectedInstructor,
      reviews,
      courseOptions,
      userReview,
    } satisfies ReviewsPageData;
  });

export const saveReview = createServerFn({ method: "POST" })
  .inputValidator((input: SaveReviewInput) => input)
  .handler(async ({ data }) => {
    const instructor = await requireInstructor(data.instructorId);
    const rating = clampRating(data.rating);
    const teachingQualityRating = clampRating(data.teachingQualityRating);
    const courseDifficultyRating = clampRating(data.courseDifficultyRating);
    const workloadRating = clampRating(data.workloadRating);

    const supabaseAdmin = await getSupabaseAdmin();
    const courseId = data.courseId ?? null;
    if (courseId != null) {
      await requireCourse(courseId);
    }

    const payload = {
      instructor_id: instructor.id,
      course_id: courseId,
      rating,
      teaching_quality_rating: teachingQualityRating,
      course_difficulty_rating: courseDifficultyRating,
      workload_rating: workloadRating,
      comment: data.comment?.trim() ? data.comment.trim() : null,
      user_id: USER_ID,
    };

    if (data.id != null) {
      const { data: updated, error } = await supabaseAdmin
        .from("reviews")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", USER_ID)
        .select(
          "id, user_id, instructor_id, course_id, rating, teaching_quality_rating, course_difficulty_rating, workload_rating, comment, created_at, updated_at, instructor:instructors(id, full_name, department), course:courses(id, catalog:course_catalog(code, title, department))",
        )
        .single();

      if (error || !updated) {
        throw new Error(error?.message ?? "Failed to update review.");
      }

      return updated as ReviewRow;
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("reviews")
      .insert(payload)
      .select(
        "id, user_id, instructor_id, course_id, rating, teaching_quality_rating, course_difficulty_rating, workload_rating, comment, created_at, updated_at, instructor:instructors(id, full_name, department), course:courses(id, catalog:course_catalog(code, title, department))",
      )
      .single();

    if (error || !inserted) {
      throw new Error(error?.message ?? "Failed to save review.");
    }

    return inserted as ReviewRow;
  });

export const deleteReview = createServerFn({ method: "POST" })
  .inputValidator((input: DeleteReviewInput) => input)
  .handler(async ({ data }) => {
    const supabaseAdmin = await getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from("reviews")
      .delete()
      .eq("id", data.id)
      .eq("user_id", USER_ID);

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  });