import { createServerFn } from "@tanstack/react-start";

const USER_ID = 1;

export const getTasksPageData = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [tasksRes, coursesRes] = await Promise.all([
    supabaseAdmin
      .from("tasks")
      .select(
        "id, title, description, due_date, priority, status, course_id, task_type, estimated_minutes, weight, course:courses(id, catalog:course_catalog(code, title), color)"
      )
      .eq("user_id", USER_ID)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabaseAdmin
      .from("courses")
      .select("id, color, catalog:course_catalog(code, title)")
      .eq("user_id", USER_ID)
      .order("id"),
  ]);
  return { tasks: tasksRes.data ?? [], courses: coursesRes.data ?? [] };
});

type TaskPayload = {
  id?: number;
  title: string;
  description: string | null;
  course_id: number | null;
  task_type: string;
  priority: string;
  status: string;
  due_date: string | null;
  estimated_minutes: number;
  weight: number;
};

export const saveTask = createServerFn({ method: "POST" })
  .inputValidator((d: TaskPayload) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    const row = { ...rest, user_id: USER_ID };
    if (id) {
      const { data: updated, error } = await supabaseAdmin
        .from("tasks")
        .update(row)
        .eq("id", id)
        .eq("user_id", USER_ID)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated;
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("tasks")
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const updateTaskStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number; status: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tasks")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("user_id", USER_ID);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .inputValidator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("tasks")
      .delete()
      .eq("id", data.id)
      .eq("user_id", USER_ID);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
