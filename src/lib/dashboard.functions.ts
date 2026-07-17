import { createServerFn } from "@tanstack/react-start";

const USER_ID = 1;

export const getDashboardData = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [userRes, coursesRes, tasksRes, assessmentsRes] = await Promise.all([
    supabaseAdmin.from("users").select("*").eq("id", USER_ID).single(),
    supabaseAdmin
      .from("courses")
      .select("id, term, status, grade, credits, catalog:course_catalog(code, title, credits), instructor:instructors(full_name)")
      .eq("user_id", USER_ID),
    supabaseAdmin
      .from("tasks")
      .select("id, title, due_date, priority, status, course:courses(catalog:course_catalog(code))")
      .eq("user_id", USER_ID)
      .order("due_date", { ascending: true }),
    supabaseAdmin
      .from("assessments")
      .select("id, name, type, date, score, max_score, weight, course:courses(user_id, catalog:course_catalog(code))")
      .order("date", { ascending: true }),
  ]);

  return {
    user: userRes.data,
    courses: coursesRes.data ?? [],
    tasks: tasksRes.data ?? [],
    assessments: (assessmentsRes.data ?? []).filter((a: any) => a.course?.user_id === USER_ID),
  };
});
