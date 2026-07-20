import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarDays,
  Download,
  GraduationCap,
  LineChart as LineChartIcon,
  ListChecks,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getAnalyticsData } from "@/lib/analytics.functions";

const analyticsQuery = queryOptions({
  queryKey: ["analytics"],
  queryFn: () => getAnalyticsData(),
});

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — AI Academic Copilot" },
      { name: "description", content: "Insights into your academic performance and productivity." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(analyticsQuery),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data } = useSuspenseQuery(analyticsQuery);

  const exportSummary = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      overview: data.overview,
      recommendations: data.recommendations,
      productivity: data.productivity,
      departmentPerformance: data.breakdowns.departmentPerformance,
      averageCourseGrades: data.breakdowns.averageCourseGrades,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "academic-analytics-summary.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <header className="rounded-3xl border bg-card/90 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Badge className="w-fit rounded-full px-3 py-1" variant="secondary">
                Academic performance workspace
              </Badge>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                Analytics
              </h1>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                A single view of GPA, workload, tasks, course difficulty, and semester trends using your existing academic data.
              </p>
            </div>
            <Button onClick={exportSummary} className="rounded-xl">
              <Download className="mr-2 h-4 w-4" /> Export report
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <OverviewCard label="Current GPA" value={formatNumber(data.overview.currentGpa, 2)} icon={<GraduationCap className="h-4 w-4" />} />
            <OverviewCard label="Completed credits" value={String(data.overview.totalCompletedCredits)} icon={<BookOpen className="h-4 w-4" />} />
            <OverviewCard label="Active courses" value={String(data.overview.activeCourses)} icon={<Users className="h-4 w-4" />} />
            <OverviewCard label="Weekly workload" value={`${formatNumber(data.overview.weeklyWorkload, 1)} hrs`} icon={<Target className="h-4 w-4" />} />
            <OverviewCard label="Tasks completed this week" value={String(data.overview.tasksCompletedThisWeek)} icon={<ListChecks className="h-4 w-4" />} />
            <HealthOverview score={data.overview.semesterHealthScore} />
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Credits completed per semester" description="Completed credits by term">
          <ChartFrame empty={data.charts.creditsPerSemester.length === 0} emptyTitle="No completed credits yet" emptyDescription="Completed courses will appear here once grades are present.">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.creditsPerSemester}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="term" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip />
                <Bar dataKey="credits" fill="#14b8a6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </ChartCard>

        <ChartCard title="Grade distribution" description="Breakdown of current course grades">
          <ChartFrame empty={data.charts.gradeDistribution.every((entry) => entry.count === 0)} emptyTitle="No grades available" emptyDescription="Grades must be present before the distribution can be shown.">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.charts.gradeDistribution} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3}>
                  {data.charts.gradeDistribution.map((entry, index) => (
                    <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartFrame>
        </ChartCard>

        <ChartCard title="Task completion progress" description="Current task status distribution">
          <ChartFrame empty={data.charts.taskCompletion.every((entry) => entry.count === 0)} emptyTitle="No tasks yet" emptyDescription="Tasks will appear in the completion chart after you add them.">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.taskCompletion} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="status" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={110} />
                <Tooltip />
                <Bar dataKey="count" fill="#14b8a6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </ChartCard>

        <ChartCard title="Course difficulty distribution" description="How your current courses are spread by difficulty">
          <ChartFrame empty={data.charts.courseDifficulty.every((entry) => entry.count === 0)} emptyTitle="No difficulty data" emptyDescription="Difficulty values will be reflected once courses are added to the term.">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.courseDifficulty}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#14b8a6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </ChartCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-muted/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-4 w-4 text-teal-600" /> Academic Insights
            </CardTitle>
            <CardDescription>Rule-based observations derived from GPA, workload, tasks, and course mix.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recommendations.length === 0 ? (
              <EmptyBlock title="No insights yet" description="More academic activity is needed to generate insights." />
            ) : (
              data.recommendations.map((item) => (
                <InsightCard key={`${item.title}-${item.message}`} recommendation={item} />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-muted/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LineChartIcon className="h-4 w-4 text-teal-600" /> Productivity
            </CardTitle>
            <CardDescription>Task completion and study habit summary.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard label="Tasks completed" value={String(data.productivity.tasksCompleted)} icon={<ListChecks className="h-4 w-4" />} />
              <MetricCard label="Completion percentage" value={`${data.productivity.completionPercentage.toFixed(1)}%`} icon={<TrendingUp className="h-4 w-4" />} />
              <MetricCard label="Upcoming deadlines" value={String(data.productivity.upcomingDeadlines.length)} icon={<CalendarDays className="h-4 w-4" />} />
              <MetricCard label="Avg weekly study hours" value={`${formatNumber(data.productivity.averageWeeklyStudyHours, 1)} hrs`} icon={<Target className="h-4 w-4" />} />
            </div>

            <Progress value={data.productivity.completionPercentage} className="h-2" />

            {data.productivity.upcomingDeadlines.length === 0 ? (
              <EmptyBlock title="No upcoming deadlines" description="You are caught up on your current task list." />
            ) : (
              <ScrollArea className="h-56 pr-3">
                <div className="space-y-2">
                  {data.productivity.upcomingDeadlines.map((task) => (
                    <div key={task.id} className="flex items-center justify-between rounded-2xl border bg-muted/20 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.course?.catalog?.code ?? "Personal"} · {task.due_date ? formatDate(task.due_date) : "No deadline"}
                        </p>
                      </div>
                      <Badge variant="secondary" className="rounded-full capitalize">{task.priority}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <PerformanceCard
          title="Department performance"
          subtitle="Average grade points by department"
          emptyTitle="No department data"
          emptyDescription="Graded courses are needed to calculate department averages."
          rows={data.breakdowns.departmentPerformance.map((row, index) => ({
            key: `department-${row.department}-${index}`,
            label: row.department,
            value: `${row.average.toFixed(2)} GPA`,
            meta: `${row.courses} course${row.courses === 1 ? "" : "s"}`,
          }))}
        />

        <PerformanceCard
          title="Average course grades"
          subtitle="Course averages by term"
          emptyTitle="No course grades"
          emptyDescription="Grades will appear once courses are marked complete."
          rows={data.breakdowns.averageCourseGrades.map((row, index) => ({
            key: `average-${row.code}-${row.term}-${index}`,
            label: row.code,
            value: row.average.toFixed(2),
            meta: `${row.title} · ${row.term}`,
          }))}
        />

        <PerformanceCard
          title="Most difficult courses"
          subtitle="Lowest-performing courses by grade average"
          emptyTitle="No difficulty data"
          emptyDescription="Courses need grades before difficulty can be ranked."
          rows={data.breakdowns.mostDifficultCourses.map((row, index) => ({
            key: `difficulty-${row.code}-${row.term}-${index}`,
            label: row.code,
            value: `${row.difficulty.toFixed(2)}`,
            meta: `${row.title} · ${row.term}`,
          }))}
        />

        <PerformanceCard
          title="Strongest and weakest courses"
          subtitle="Assessment-based score comparison"
          emptyTitle="No assessment results"
          emptyDescription="Assessment scores must exist before this comparison can be shown."
          rows={[
            ...data.breakdowns.strongestCourses.slice(0, 3).map((row, index) => ({
              key: `strong-${row.code}-${row.term}-${index}`,
              label: `Strong: ${row.code}`,
              value: `${row.score.toFixed(1)}%`,
              meta: `${row.title} · ${row.term} · strongest`,
            })),
            ...data.breakdowns.weakestCourses.slice(0, 3).map((row, index) => ({
              key: `weak-${row.code}-${row.term}-${index}`,
              label: `Weak: ${row.code}`,
              value: `${row.score.toFixed(1)}%`,
              meta: `${row.title} · ${row.term} · weakest`,
            })),
          ]}
        />
      </section>
    </div>
  );
}

function OverviewCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="border-muted/60 shadow-sm">
      <CardContent className="flex h-full items-center justify-between gap-3 pt-6">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-100 text-teal-600">{icon}</div>
      </CardContent>
    </Card>
  );
}

function HealthOverview({ score }: { score: number }) {
  const tone = score >= 80 ? "emerald" : score >= 60 ? "amber" : "rose";
  const textClass = tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-rose-700";
  return (
    <Card className="border-muted/60 shadow-sm">
      <CardContent className="flex h-full items-center gap-4 pt-6">
        <div
          className={cn(
            "grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 font-semibold",
            textClass,
          )}
        >
          {score}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Semester health score</p>
          <div className="mt-1 text-lg font-semibold">{score >= 80 ? "Strong" : score >= 60 ? "Mixed" : "At risk"}</div>
          <Progress value={score} className="mt-3 h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="border-muted/60 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-80">{children}</CardContent>
    </Card>
  );
}

function ChartFrame({
  empty,
  emptyTitle,
  emptyDescription,
  children,
}: {
  empty: boolean;
  emptyTitle: string;
  emptyDescription: string;
  children: React.ReactNode;
}) {
  if (empty) {
    return <EmptyBlock title={emptyTitle} description={emptyDescription} />;
  }
  return <div className="h-full">{children}</div>;
}

function EmptyBlock({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full min-h-56 items-center justify-center rounded-2xl border border-dashed bg-muted/20 p-6 text-center">
      <div className="max-w-sm">
        <p className="font-medium">{title}</p>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function InsightCard({ recommendation }: { recommendation: { title: string; message: string; severity: "info" | "warning" | "critical" } }) {
  const toneClass =
    recommendation.severity === "critical"
      ? "border-rose-500/30 bg-rose-500/5 text-rose-700"
      : recommendation.severity === "warning"
        ? "border-amber-500/30 bg-amber-500/5 text-amber-700"
        : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700";
  return (
    <div className={cn("rounded-2xl border p-4 shadow-sm", toneClass)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">{recommendation.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{recommendation.message}</p>
        </div>
        <Badge variant={recommendation.severity === "critical" ? "destructive" : recommendation.severity === "warning" ? "secondary" : "default"} className="rounded-full capitalize">
          {recommendation.severity}
        </Badge>
      </div>
    </div>
  );
}

function PerformanceCard({
  title,
  subtitle,
  rows,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  subtitle: string;
  rows: { key: string; label: string; value: string; meta: string }[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <Card className="border-muted/60 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyBlock title={emptyTitle} description={emptyDescription} />
        ) : (
          <ScrollArea className="h-72 pr-3">
            <div className="space-y-2">
              {rows.map((row, index) => (
                <div key={`${title}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/20 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.meta}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="border-muted/60 shadow-sm">
      <CardContent className="flex items-center justify-between gap-3 pt-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-100 text-teal-600">{icon}</div>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatNumber(value: number, digits: number) {
  return value.toFixed(digits);
}

const PIE_COLORS = ["#0f766e", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4"];