import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
  queryOptions,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LineChart as LineChartIcon,
  Target,
  TrendingUp,
  Calculator,
  GraduationCap,
  Pencil,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getGpaData, updateCourseGrade } from "@/lib/gpa.functions";

const gpaQuery = queryOptions({
  queryKey: ["gpa-page"],
  queryFn: () => getGpaData(),
});

export const Route = createFileRoute("/gpa")({
  head: () => ({
    meta: [
      { title: "GPA Tracker — AI Academic Copilot" },
      { name: "description", content: "Track GPA, project grades, and plan academic goals." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(gpaQuery),
  component: GpaPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-destructive">Failed to load GPA data: {error.message}</div>
  ),
});

const GRADE_POINTS: Record<string, number> = {
  "A+": 4.0, A: 4.0, "A-": 3.7,
  "B+": 3.3, B: 3.0, "B-": 2.7,
  "C+": 2.3, C: 2.0, "C-": 1.7,
  "D+": 1.3, D: 1.0, F: 0.0,
};
const GRADE_OPTIONS = Object.keys(GRADE_POINTS);

const gp = (g?: string | null) => (g && GRADE_POINTS[g] !== undefined ? GRADE_POINTS[g] : null);

function computeGPA(rows: { grade?: string | null; credits: number }[]) {
  let pts = 0;
  let credits = 0;
  for (const r of rows) {
    const p = gp(r.grade);
    if (p === null) continue;
    pts += p * r.credits;
    credits += r.credits;
  }
  return credits > 0 ? pts / credits : 0;
}

function GpaPage() {
  const { data } = useSuspenseQuery(gpaQuery);
  const qc = useQueryClient();
  const updateFn = useServerFn(updateCourseGrade);

  const courses = data.courses.map((c) => ({
    ...c,
    credits: c.credits ?? c.catalog?.credits ?? 3,
  }));

  const currentGPA = useMemo(() => computeGPA(courses.filter((c) => c.grade)), [courses]);
  const targetGPA = useMemo(
    () =>
      computeGPA(
        courses.map((c) => ({ credits: c.credits, grade: c.target_grade ?? c.grade }))
      ),
    [courses]
  );

  const termsSorted = useMemo(() => {
    const map = new Map<string, typeof courses>();
    for (const c of courses) {
      if (!map.has(c.term)) map.set(c.term, []);
      map.get(c.term)!.push(c);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [courses]);

  const currentTerm = termsSorted[termsSorted.length - 1]?.[0] ?? "";
  const semesterGPA = useMemo(() => {
    const rows = courses.filter((c) => c.term === currentTerm && c.grade);
    return computeGPA(rows);
  }, [courses, currentTerm]);

  const termTrend = useMemo(
    () =>
      termsSorted.map(([term, rows]) => ({
        term,
        gpa: Number(computeGPA(rows.filter((r) => r.grade)).toFixed(2)),
      })),
    [termsSorted]
  );

  const courseGpaBreakdown = useMemo(
    () =>
      courses
        .filter((c) => c.grade)
        .map((c) => ({
          code: c.catalog?.code ?? `#${c.id}`,
          gpa: gp(c.grade) ?? 0,
          color: c.color,
        })),
    [courses]
  );

  const [editing, setEditing] = useState<typeof courses[number] | null>(null);
  const [editGrade, setEditGrade] = useState<string>("none");
  const [editTarget, setEditTarget] = useState<string>("none");

  const openEdit = (c: typeof courses[number]) => {
    setEditing(c);
    setEditGrade(c.grade ?? "none");
    setEditTarget(c.target_grade ?? "none");
  };

  const save = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          id: editing!.id,
          grade: editGrade === "none" ? null : editGrade,
          target_grade: editTarget === "none" ? null : editTarget,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gpa-page"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["courses-page"] });
      toast.success("Grade updated");
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <LineChartIcon className="h-7 w-7 text-primary" />
          GPA Tracker
        </h1>
        <p className="text-muted-foreground text-sm">
          Monitor your GPA and forecast the impact of upcoming grades.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<GraduationCap className="h-4 w-4" />}
          label="Current GPA"
          value={currentGPA.toFixed(2)}
          hint="Based on completed grades"
        />
        <StatCard
          icon={<Target className="h-4 w-4" />}
          label="Target GPA"
          value={targetGPA.toFixed(2)}
          hint="If you hit your goal grades"
          accent
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Semester GPA"
          value={semesterGPA.toFixed(2)}
          hint={currentTerm || "—"}
        />
        <StatCard
          icon={<LineChartIcon className="h-4 w-4" />}
          label="Courses graded"
          value={`${courses.filter((c) => c.grade).length}/${courses.length}`}
          hint="Across all terms"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Semester GPA trend</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={termTrend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="term" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 4]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <ReferenceLine y={targetGPA} stroke="hsl(var(--primary))" strokeDasharray="4 4" label={{ value: "Target", fontSize: 10, position: "insideTopRight" }} />
                <Line
                  type="monotone"
                  dataKey="gpa"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Course grade breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseGpaBreakdown}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="code" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 4]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="gpa" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Course GPA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {courses.map((c) => {
            const points = gp(c.grade);
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow"
                style={{ borderLeftColor: c.color, borderLeftWidth: 3 }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{c.catalog?.code}</span>
                    <span className="text-sm text-muted-foreground truncate">
                      {c.catalog?.title}
                    </span>
                    <Badge variant="outline" className="text-xs">{c.credits} cr</Badge>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {c.term}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Grade</div>
                  <div className="font-semibold">{c.grade ?? "—"}</div>
                </div>
                <div className="text-right w-14">
                  <div className="text-xs text-muted-foreground">GP</div>
                  <div className="font-semibold">{points !== null ? points.toFixed(1) : "—"}</div>
                </div>
                <div className="text-right w-14">
                  <div className="text-xs text-muted-foreground">Target</div>
                  <div className="font-semibold text-primary">{c.target_grade ?? "—"}</div>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <GradeCalculator />
        <RemainingGradeCalculator />
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Edit {editing?.catalog?.code}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Current grade</Label>
              <Select value={editGrade} onValueChange={setEditGrade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not graded</SelectItem>
                  {GRADE_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target grade</Label>
              <Select value={editTarget} onValueChange={setEditTarget}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No target</SelectItem>
                  {GRADE_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-primary/40 bg-primary/5" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-3xl font-bold mt-2">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

type CalcRow = { name: string; score: string; weight: string };

function GradeCalculator() {
  const [rows, setRows] = useState<CalcRow[]>([
    { name: "Midterm", score: "85", weight: "30" },
    { name: "Assignments", score: "92", weight: "30" },
    { name: "Final", score: "", weight: "40" },
  ]);

  const totals = useMemo(() => {
    let earned = 0;
    let weightUsed = 0;
    let weightTotal = 0;
    for (const r of rows) {
      const w = Number(r.weight) || 0;
      weightTotal += w;
      const s = Number(r.score);
      if (r.score.trim() && !Number.isNaN(s)) {
        earned += (s / 100) * w;
        weightUsed += w;
      }
    }
    return { earned, weightUsed, weightTotal };
  }, [rows]);

  const update = (i: number, patch: Partial<CalcRow>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" /> Grade Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[1fr_80px_80px_auto] gap-2 text-xs text-muted-foreground">
          <span>Component</span>
          <span>Score %</span>
          <span>Weight %</span>
          <span />
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_80px_80px_auto] gap-2 items-center">
            <Input value={r.name} onChange={(e) => update(i, { name: e.target.value })} />
            <Input type="number" value={r.score} onChange={(e) => update(i, { score: e.target.value })} />
            <Input type="number" value={r.weight} onChange={(e) => update(i, { weight: e.target.value })} />
            <Button variant="ghost" size="sm" onClick={() => setRows((p) => p.filter((_, x) => x !== i))}>
              ×
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRows((p) => [...p, { name: "", score: "", weight: "" }])}
        >
          + Add component
        </Button>
        <div className="pt-3 border-t space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Earned so far</span>
            <span className="font-semibold">{totals.earned.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Weight used</span>
            <span>{totals.weightUsed}% / {totals.weightTotal}%</span>
          </div>
          <div className="flex justify-between text-primary">
            <span>Current course grade</span>
            <span className="font-bold text-lg">
              {totals.weightUsed > 0
                ? ((totals.earned / totals.weightUsed) * 100).toFixed(1) + "%"
                : "—"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RemainingGradeCalculator() {
  const [current, setCurrent] = useState("82");
  const [completed, setCompleted] = useState("60");
  const [target, setTarget] = useState("90");

  const needed = useMemo(() => {
    const c = Number(current);
    const done = Number(completed);
    const t = Number(target);
    const remaining = 100 - done;
    if (remaining <= 0 || Number.isNaN(c) || Number.isNaN(t) || Number.isNaN(done)) return null;
    const earned = (c / 100) * done;
    const needPct = ((t - earned) / remaining) * 100;
    return needPct;
  }, [current, completed, target]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" /> Remaining Grade Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Current %</Label>
            <Input type="number" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div>
            <Label>Weight done %</Label>
            <Input type="number" value={completed} onChange={(e) => setCompleted(e.target.value)} />
          </div>
          <div>
            <Label>Target %</Label>
            <Input type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
        </div>
        <div className="rounded-lg border bg-primary/5 p-4 text-center">
          <div className="text-xs text-muted-foreground">You need to average</div>
          <div className="text-3xl font-bold text-primary">
            {needed === null
              ? "—"
              : needed > 100
              ? "Not achievable"
              : needed < 0
              ? "Already there 🎉"
              : needed.toFixed(1) + "%"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            on the remaining {Math.max(0, 100 - Number(completed) || 0)}% of coursework
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
