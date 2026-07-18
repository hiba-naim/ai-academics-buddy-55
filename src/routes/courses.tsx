import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Plus, Pencil, Trash2, Clock, GraduationCap, Target } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  deleteCourse,
  getCoursesPageData,
  saveCourse,
} from "@/lib/courses.functions";

const coursesQuery = queryOptions({
  queryKey: ["courses-page"],
  queryFn: () => getCoursesPageData(),
});

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "My Courses — AI Academic Copilot" },
      { name: "description", content: "Manage courses, grades, and study workload." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(coursesQuery),
  component: CoursesPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-destructive">Failed to load courses: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-6">Not found.</div>,
});

const COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];
const DIFFICULTIES = ["easy", "medium", "hard"];
const STATUSES = ["in_progress", "completed", "planned", "dropped"];

type CourseRow = ReturnType<typeof useSuspenseQuery<typeof coursesQuery>>["data"]["courses"][number];

type FormState = {
  id?: number;
  catalog_id: string;
  instructor_id: string;
  term: string;
  status: string;
  grade: string;
  target_grade: string;
  credits: string;
  difficulty: string;
  weekly_study_hours: string;
  color: string;
  progress: string;
};

const emptyForm: FormState = {
  catalog_id: "",
  instructor_id: "",
  term: "Fall 2025",
  status: "in_progress",
  grade: "",
  target_grade: "A",
  credits: "3",
  difficulty: "medium",
  weekly_study_hours: "5",
  color: COLORS[0],
  progress: "0",
};

function CoursesPage() {
  const { data } = useSuspenseQuery(coursesQuery);
  const qc = useQueryClient();
  const saveFn = useServerFn(saveCourse);
  const deleteFn = useServerFn(deleteCourse);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const saveMutation = useMutation({
    mutationFn: (payload: Parameters<typeof saveFn>[0]) => saveFn(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses-page"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      toast.success(form.id ? "Course updated" : "Course added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses-page"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setDeleteId(null);
      toast.success("Course deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openAdd = () => {
    setForm({ ...emptyForm, catalog_id: String(data.catalog[0]?.id ?? "") });
    setOpen(true);
  };

  const openEdit = (c: CourseRow) => {
    setForm({
      id: c.id,
      catalog_id: String(c.catalog_id),
      instructor_id: c.instructor_id ? String(c.instructor_id) : "",
      term: c.term,
      status: c.status,
      grade: c.grade ?? "",
      target_grade: c.target_grade ?? "",
      credits: String(c.credits ?? c.catalog?.credits ?? 3),
      difficulty: c.difficulty ?? "medium",
      weekly_study_hours: String(c.weekly_study_hours ?? 0),
      color: c.color ?? COLORS[0],
      progress: String(c.progress ?? 0),
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.catalog_id) {
      toast.error("Select a course from the catalog");
      return;
    }
    saveMutation.mutate({
      data: {
        id: form.id,
        catalog_id: Number(form.catalog_id),
        instructor_id: form.instructor_id ? Number(form.instructor_id) : null,
        term: form.term.trim() || "Fall 2025",
        status: form.status,
        grade: form.grade.trim() || null,
        target_grade: form.target_grade.trim() || null,
        credits: form.credits ? Number(form.credits) : null,
        difficulty: form.difficulty,
        weekly_study_hours: Number(form.weekly_study_hours) || 0,
        color: form.color,
        progress: Math.max(0, Math.min(100, Number(form.progress) || 0)),
      },
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" /> My Courses
          </h1>
          <p className="text-muted-foreground mt-1">
            {data.courses.length} course{data.courses.length === 1 ? "" : "s"} tracked
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Add Course
        </Button>
      </div>

      {data.courses.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No courses yet. Click "Add Course" to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.courses.map((c) => (
            <Card
              key={c.id}
              className="overflow-hidden hover:shadow-lg transition-shadow relative"
            >
              <div
                className="absolute top-0 left-0 h-1 w-full"
                style={{ backgroundColor: c.color ?? COLORS[0] }}
              />
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        style={{ backgroundColor: `${c.color}20`, color: c.color }}
                      >
                        {c.catalog?.code}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {c.difficulty}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-lg mt-2 truncate">
                      {c.catalog?.title}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {c.instructor?.full_name ?? "TBA"} · {c.term}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeleteId(c.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <Stat icon={<GraduationCap className="h-3.5 w-3.5" />} label="Credits" value={String(c.credits ?? c.catalog?.credits ?? "—")} />
                  <Stat icon={<Target className="h-3.5 w-3.5" />} label="Grade" value={c.grade || "—"} />
                  <Stat icon={<Target className="h-3.5 w-3.5" />} label="Target" value={c.target_grade || "—"} />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {c.weekly_study_hours ?? 0} hrs/week study time
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{Math.round(c.progress ?? 0)}%</span>
                  </div>
                  <Progress value={c.progress ?? 0} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Course" : "Add Course"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <Field label="Course">
              <Select
                value={form.catalog_id}
                onValueChange={(v) => setForm({ ...form, catalog_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {data.catalog.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.code} — {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Instructor">
              <Select
                value={form.instructor_id || "none"}
                onValueChange={(v) => setForm({ ...form, instructor_id: v === "none" ? "" : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {data.instructors.map((i) => (
                    <SelectItem key={i.id} value={String(i.id)}>{i.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Term">
                <Input value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} />
              </Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Credits">
                <Input type="number" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} />
              </Field>
              <Field label="Difficulty">
                <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Current Grade">
                <Input value={form.grade} placeholder="A, B+, 88%" onChange={(e) => setForm({ ...form, grade: e.target.value })} />
              </Field>
              <Field label="Target Grade">
                <Input value={form.target_grade} onChange={(e) => setForm({ ...form, target_grade: e.target.value })} />
              </Field>
              <Field label="Weekly Study Hours">
                <Input type="number" step="0.5" value={form.weekly_study_hours} onChange={(e) => setForm({ ...form, weekly_study_hours: e.target.value })} />
              </Field>
              <Field label="Progress (%)">
                <Input type="number" min="0" max="100" value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} />
              </Field>
            </div>
            <Field label="Color Tag">
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`h-8 w-8 rounded-full border-2 transition ${form.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the course and any linked tasks or assessments may reference it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="font-semibold mt-0.5">{value}</div>
    </div>
  );
}
