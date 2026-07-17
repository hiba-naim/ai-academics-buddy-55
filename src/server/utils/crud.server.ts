// Server-only CRUD helpers backed by the admin client (bypasses RLS).
// Import dynamically inside server route handlers only.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export type TableName =
  | "users"
  | "instructors"
  | "course_catalog"
  | "courses"
  | "tasks"
  | "assessments"
  | "reviews";

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

export async function listRows(table: TableName, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

  let query = supabaseAdmin.from(table).select("*").range(offset, offset + limit - 1);

  // Optional exact-match filters via ?filter[col]=value
  for (const [key, value] of url.searchParams.entries()) {
    const match = key.match(/^filter\[(.+)\]$/);
    if (match) query = query.eq(match[1], value);
  }

  const orderBy = url.searchParams.get("order") ?? "id";
  const ascending = url.searchParams.get("dir") !== "desc";
  query = query.order(orderBy, { ascending });

  const { data, error } = await query;
  if (error) return json({ error: error.message }, 500);
  return json({ data });
}

export async function createRow(table: TableName, request: Request): Promise<Response> {
  const body = await readBody(request);
  if (Object.keys(body).length === 0) return json({ error: "Empty body" }, 400);
  const { data, error } = await supabaseAdmin.from(table).insert(body).select().single();
  if (error) return json({ error: error.message }, 400);
  return json({ data }, 201);
}

export async function getRow(table: TableName, rawId: string): Promise<Response> {
  const id = parseId(rawId);
  if (id === null) return json({ error: "Invalid id" }, 400);
  const { data, error } = await supabaseAdmin.from(table).select("*").eq("id", id).maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!data) return json({ error: "Not found" }, 404);
  return json({ data });
}

export async function updateRow(
  table: TableName,
  rawId: string,
  request: Request,
): Promise<Response> {
  const id = parseId(rawId);
  if (id === null) return json({ error: "Invalid id" }, 400);
  const body = await readBody(request);
  if (Object.keys(body).length === 0) return json({ error: "Empty body" }, 400);
  const { data, error } = await supabaseAdmin
    .from(table)
    .update(body)
    .eq("id", id)
    .select()
    .single();
  if (error) return json({ error: error.message }, 400);
  return json({ data });
}

export async function deleteRow(table: TableName, rawId: string): Promise<Response> {
  const id = parseId(rawId);
  if (id === null) return json({ error: "Invalid id" }, 400);
  const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
  if (error) return json({ error: error.message }, 400);
  return new Response(null, { status: 204 });
}
