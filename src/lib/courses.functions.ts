import { createServerFn } from "@tanstack/react-start";

const USER_ID = 1;

export const getCoursesPageData = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [coursesRes, catalogRes, instructorsRes] = await Promise.all([
    supabaseAdmin
      .from("courses")
      .select(
        "id, term, status, grade, credits, target_grade, difficulty, weekly_study_hours, color, progress, catalog_id, instructor_id, catalog:course_catalog(code, title, credits), instructor:instructors(full_name)"
      )
      .eq("user_id", USER_ID)
      .order("id", { ascending: true }),
    supabaseAdmin.from("course_catalog").select("id, code, title, credits").order("code"),
    supabaseAdmin.from("instructors").select("id, full_name").order("full_name"),
  ]);
  return {
    courses: coursesRes.data ?? [],
    catalog: catalogRes.data ?? [],
    instructors: instructorsRes.data ?? [],
  };
});

type CoursePayload = {
  id?: number;
  catalog_id: number;
  instructor_id: number | null;
  term: string;
  status: string;
  grade: string | null;
  target_grade: string | null;
  credits: number | null;
  difficulty: string;
  weekly_study_hours: number;
  color: string;
  progress: number;
};

export const saveCourse = createServerFn({ method: "POST" })
  .inputValidator((d: CoursePayload) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    const row = { ...rest, user_id: USER_ID };
    if (id) {
      const { data: updated, error } = await supabaseAdmin
        .from("courses")
        .update(row)
        .eq("id", id)
        .eq("user_id", USER_ID)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated;
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("courses")
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const deleteCourse = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("courses")
      .delete()
      .eq("id", data.id)
      .eq("user_id", USER_ID);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
