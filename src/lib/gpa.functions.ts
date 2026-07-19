import { createServerFn } from "@tanstack/react-start";

const USER_ID = 1;

export const getGpaData = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [userRes, coursesRes, assessmentsRes] = await Promise.all([
    supabaseAdmin.from("users").select("id, full_name, gpa").eq("id", USER_ID).single(),
    supabaseAdmin
      .from("courses")
      .select(
        "id, term, status, grade, target_grade, credits, color, catalog:course_catalog(code, title, credits)"
      )
      .eq("user_id", USER_ID)
      .order("term"),
    supabaseAdmin
      .from("assessments")
      .select("id, course_id, name, type, score, max_score, weight, date, course:courses(user_id)")
      .order("date"),
  ]);
  return {
    user: userRes.data,
    courses: coursesRes.data ?? [],
    assessments: (assessmentsRes.data ?? []).filter((a: any) => a.course?.user_id === USER_ID),
  };
});

export const updateCourseGrade = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number; grade: string | null; target_grade?: string | null }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch = { grade: data.grade, target_grade: data.target_grade ?? null };
    const { error } = await supabaseAdmin
      .from("courses")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", USER_ID);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
