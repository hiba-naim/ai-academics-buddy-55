import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import {
  Target,
  TrendingUp,
  Activity,
  BookOpen,
  CheckCircle2,
  Circle,
  Clock,
  CalendarDays,
  GraduationCap,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getDashboardData } from "@/lib/dashboard.functions";

const TARGET_GPA = 3.30;

const dashboardQuery = queryOptions({
  queryKey: ["dashboard"],
  queryFn: () => getDashboardData(),
});

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — AI Academic Copilot" },
      { name: "description", content: "Your academic overview at a glance." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQuery),
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-destructive">Failed to load dashboard: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6">Not found.</div>,
  component: DashboardPage,
});

type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

function DashboardPage() {
  const { data } = useSuspenseQuery(dashboardQuery);
  const d = data as DashboardData;

  const currentGpa = 2.61;
  const activeCourses = d.courses.filter((c: any) => c.status === "in_progress");
  const now = new Date();
  const in14 = new Date(now.getTime() + 14 * 86400000);

  const upcomingTasks = d.tasks
    .filter((t: any) => t.due_date && new Date(t.due_date) >= now && t.status !== "done")
    .slice(0, 6);

  const todayStr = now.toISOString().slice(0, 10);
  const todaysTasks = d.tasks.filter(
    (t: any) => t.due_date && t.due_date.slice(0, 10) === todayStr,
  );

  const upcomingExams = d.assessments.filter(
    (a: any) =>
      a.date &&
      new Date(a.date) >= now &&
      ["midterm", "final", "exam", "quiz"].includes(a.type),
  );

  // Semester health: average of active-term assessment scores (%)
  const activeCourseIds = new Set(activeCourses.map((c: any) => c.id));
  const termAssessments = d.assessments.filter((a: any) =>
    d.courses.find((c: any) => activeCourseIds.has(c.id) && c.id === (a as any).course?.id),
  );
  // Fallback: use all assessments belonging to active courses via join field course.catalog.code match
  const activeCourseCodes = new Set(
    activeCourses.map((c: any) => c.catalog?.code).filter(Boolean),
  );
  const activeAssessments = d.assessments.filter((a: any) =>
    activeCourseCodes.has(a.course?.catalog?.code),
  );
  const scored = activeAssessments.filter((a: any) => a.score != null);
  const avgPct =
    scored.length > 0
      ? scored.reduce((s: number, a: any) => s + (Number(a.score) / Number(a.max_score)) * 100, 0) /
        scored.length
      : 0;
  const health = Math.round(avgPct);
  void termAssessments;
  void in14;

  // Weekly study hours (realistic demo data)
const weekly = [
  { day: "Mon", hours: 2.5 },
  { day: "Tue", hours: 3 },
  { day: "Wed", hours: 1.5 },
  { day: "Thu", hours: 4 },
  { day: "Fri", hours: 2 },
  { day: "Sat", hours: 5 },
  { day: "Sun", hours: 3 },
];

  // Course performance: avg % per active course
  const performance = activeCourses.map((c: any) => {
    const items = d.assessments.filter(
      (a: any) => a.course?.catalog?.code === c.catalog?.code && a.score != null,
    );
    const avg =
      items.length > 0
        ? items.reduce(
            (s: number, a: any) => s + (Number(a.score) / Number(a.max_score)) * 100,
            0,
          ) / items.length
        : 0;
    return { code: c.catalog?.code ?? "—", score: Math.round(avg) };
  });

  const priorityColor = (p: string) =>
    p === "high"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : p === "medium"
        ? "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400"
        : "bg-muted text-muted-foreground";

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {d.user?.full_name?.split(" ")[0] ?? "Student"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here's your academic snapshot for today.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<GraduationCap className="h-4 w-4" />}
          label="Current GPA"
          value={currentGpa.toFixed(2)}
          hint={`${d.user?.major ?? ""} · Year ${d.user?.year ?? "—"}`}
        />
        <SummaryCard
          icon={<Target className="h-4 w-4" />}
          label="Target GPA"
          value={TARGET_GPA.toFixed(2)}
          hint={`${(TARGET_GPA - currentGpa).toFixed(2)} to goal`}
        />
        <Card className="rounded-xl shadow-sm transition hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Semester Health
            </CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{health}%</div>
            <Progress value={health} className="mt-2 h-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              Avg across {activeAssessments.length} active assessments
            </p>
          </CardContent>
        </Card>
        <SummaryCard
          icon={<BookOpen className="h-4 w-4" />}
          label="Active Courses"
          value={String(activeCourses.length)}
          hint={activeCourses.map((c: any) => c.catalog?.code).join(" · ") || "None"}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-primary" /> Weekly Study Hours
            </CardTitle>
            <CardDescription>Estimated hours per day this week</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
  type="monotone"
  dataKey="hours"
  stroke="#22c55e"
  strokeWidth={3}
  dot={{ r: 5, fill: "#22c55e" }}
  activeDot={{ r: 7, fill: "#16a34a" }}
/>
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" /> Course Performance
            </CardTitle>
            <CardDescription>Average score in active courses</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px]">
            {performance.length === 0 ? (
              <EmptyState label="No graded assessments yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performance}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="code" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar
  dataKey="score"
  fill="#10b981"
  radius={[8, 8, 0, 0]}
/>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lists row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="rounded-xl shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" /> Upcoming Deadlines
            </CardTitle>
            <CardDescription>Tasks due soon</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingTasks.length === 0 ? (
              <EmptyState label="You're all caught up 🎉" />
            ) : (
              upcomingTasks.map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border bg-card/50 px-3 py-2 transition hover:bg-accent/40"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {t.status === "in_progress" ? (
                      <Clock className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.course?.catalog?.code ?? "Personal"} ·{" "}
                        {new Date(t.due_date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={priorityColor(t.priority)}>
                    {t.priority}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-primary" /> Today's Tasks
            </CardTitle>
            <CardDescription>
              {todaysTasks.length} due today
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {todaysTasks.length === 0 ? (
              <EmptyState label="Nothing due today" />
            ) : (
              todaysTasks.map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 rounded-lg border bg-card/50 px-3 py-2"
                >
                  <Circle className="h-4 w-4 text-primary" />
                  <span className="truncate text-sm">{t.title}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4 text-primary" /> Upcoming Exams
          </CardTitle>
          <CardDescription>Scheduled assessments ahead</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingExams.length === 0 ? (
            <EmptyState label="No exams scheduled" />
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingExams.map((a: any) => (
                <div
                  key={a.id}
                  className="rounded-lg border bg-card/50 p-3 transition hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-primary">
                      {a.course?.catalog?.code}
                    </span>
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {a.type}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(a.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="rounded-xl shadow-sm transition hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <span className="text-primary">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {hint ? <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[100px] items-center justify-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
