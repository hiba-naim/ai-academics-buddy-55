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
  ListChecks,
  Plus,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  Flag,
  GripVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  deleteTask,
  getTasksPageData,
  saveTask,
  updateTaskStatus,
} from "@/lib/tasks.functions";

const tasksQuery = queryOptions({
  queryKey: ["tasks-page"],
  queryFn: () => getTasksPageData(),
});

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — AI Academic Copilot" },
      { name: "description", content: "Assignments, projects, exams, and deadlines." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tasksQuery),
  component: TasksPage,
  errorComponent: ({ error }) => (
    <div className="p-6 text-destructive">Failed to load tasks: {error.message}</div>
  ),
});

type Task = Awaited<ReturnType<typeof getTasksPageData>>["tasks"][number];
type Course = Awaited<ReturnType<typeof getTasksPageData>>["courses"][number];

const TASK_TYPES = [
  { value: "assignment", label: "Assignment" },
  { value: "project", label: "Project" },
  { value: "quiz", label: "Quiz" },
  { value: "lab", label: "Lab" },
  { value: "midterm", label: "Midterm" },
  { value: "final", label: "Final Exam" },
];

const PRIORITIES = ["low", "medium", "high"];
const STATUSES = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const priorityColor: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  high: "bg-red-500/15 text-red-700 dark:text-red-400",
};

const typeColor: Record<string, string> = {
  assignment: "bg-primary/10 text-primary",
  project: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  quiz: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  lab: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  midterm: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  final: "bg-red-500/15 text-red-700 dark:text-red-400",
};

const emptyForm = (): FormState => ({
  id: undefined,
  title: "",
  description: "",
  course_id: null,
  task_type: "assignment",
  priority: "medium",
  status: "todo",
  due_date: "",
  estimated_minutes: 60,
  weight: 0,
});

type FormState = {
  id?: number;
  title: string;
  description: string;
  course_id: number | null;
  task_type: string;
  priority: string;
  status: string;
  due_date: string;
  estimated_minutes: number;
  weight: number;
};

function courseLabel(c: Course) {
  return `${c.catalog?.code ?? "—"} · ${c.catalog?.title ?? ""}`;
}

function formatDue(d: string | null) {
  if (!d) return "No deadline";
  const date = new Date(d);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TasksPage() {
  const { data } = useSuspenseQuery(tasksQuery);
  const qc = useQueryClient();
  const saveFn = useServerFn(saveTask);
  const deleteFn = useServerFn(deleteTask);
  const statusFn = useServerFn(updateTaskStatus);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [confirmDelete, setConfirmDelete] = useState<Task | null>(null);

  const save = useMutation({
    mutationFn: (payload: FormState) =>
      saveFn({
        data: {
          id: payload.id,
          title: payload.title.trim(),
          description: payload.description.trim() || null,
          course_id: payload.course_id,
          task_type: payload.task_type,
          priority: payload.priority,
          status: payload.status,
          due_date: payload.due_date ? new Date(payload.due_date).toISOString() : null,
          estimated_minutes: Number(payload.estimated_minutes) || 0,
          weight: Number(payload.weight) || 0,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks-page"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(form.id ? "Task updated" : "Task created");
      setOpen(false);
      setForm(emptyForm());
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: number) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks-page"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Task deleted");
      setConfirmDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      statusFn({ data: { id, status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks-page"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openNew = () => {
    setForm(emptyForm());
    setOpen(true);
  };

  const openEdit = (t: Task) => {
    setForm({
      id: t.id,
      title: t.title,
      description: t.description ?? "",
      course_id: t.course_id ?? null,
      task_type: t.task_type,
      priority: t.priority,
      status: t.status,
      due_date: t.due_date ? t.due_date.slice(0, 16) : "",
      estimated_minutes: t.estimated_minutes ?? 60,
      weight: Number(t.weight ?? 0),
    });
    setOpen(true);
  };

  const grouped = useMemo(() => {
    const byStatus: Record<string, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const t of data.tasks) {
      (byStatus[t.status] ??= []).push(t);
    }
    return byStatus;
  }, [data.tasks]);

  const now = Date.now();
  const upcoming = useMemo(
    () =>
      data.tasks
        .filter((t) => t.status !== "done" && t.due_date && new Date(t.due_date).getTime() >= now - 86400000)
        .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()),
    [data.tasks, now]
  );

  const calendarGroups = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of [...data.tasks].sort((a, b) => {
      const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return ad - bd;
    })) {
      const key = t.due_date
        ? new Date(t.due_date).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })
        : "Unscheduled";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries());
  }, [data.tasks]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <ListChecks className="h-7 w-7 text-primary" />
            Tasks
          </h1>
          <p className="text-muted-foreground text-sm">
            Assignments, projects, quizzes, labs, midterms, and finals.
          </p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="h-4 w-4" /> New Task
        </Button>
      </div>

      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <div className="grid gap-4 md:grid-cols-3">
            {STATUSES.map((col) => (
              <Card key={col.value} className="bg-muted/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>{col.label}</span>
                    <Badge variant="secondary">{grouped[col.value]?.length ?? 0}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(grouped[col.value] ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No tasks</p>
                  )}
                  {(grouped[col.value] ?? []).map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onEdit={() => openEdit(t)}
                      onDelete={() => setConfirmDelete(t)}
                      onStatus={(s) => setStatus.mutate({ id: t.id, status: s })}
                    />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming deadlines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcoming.length === 0 && (
                <p className="text-sm text-muted-foreground">Nothing on the horizon 🎉</p>
              )}
              {upcoming.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  onEdit={() => openEdit(t)}
                  onDelete={() => setConfirmDelete(t)}
                  onStatus={(s) => setStatus.mutate({ id: t.id, status: s })}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Calendar view</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {calendarGroups.map(([day, items]) => (
                <div key={day}>
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarIcon className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">{day}</h3>
                    <span className="text-xs text-muted-foreground">
                      · {items.length} task{items.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                    {items.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        onEdit={() => openEdit(t)}
                        onDelete={() => setConfirmDelete(t)}
                        onStatus={(s) => setStatus.mutate({ id: t.id, status: s })}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit task" : "New task"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Sequence alignment lab report"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Course</Label>
                <Select
                  value={form.course_id ? String(form.course_id) : "none"}
                  onValueChange={(v) =>
                    setForm({ ...form, course_id: v === "none" ? null : Number(v) })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No course</SelectItem>
                    {data.courses.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {courseLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={form.task_type}
                  onValueChange={(v) => setForm({ ...form, task_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Deadline</Label>
                <Input
                  type="datetime-local"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Est. minutes</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.estimated_minutes}
                  onChange={(e) =>
                    setForm({ ...form, estimated_minutes: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <Label>Weight (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => save.mutate(form)}
              disabled={!form.title.trim() || save.isPending}
            >
              {form.id ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.title}" will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && remove.mutate(confirmDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog>{null}</Dialog>
    </div>
  );
}

function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatus,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (s: string) => void;
}) {
  const color = task.course?.color ?? "hsl(var(--primary))";
  return (
    <div
      className="rounded-lg border bg-card p-3 shadow-sm hover:shadow-md transition-shadow group"
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm leading-snug break-words">{task.title}</p>
          {task.course?.catalog?.code && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {task.course.catalog.code}
            </p>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2">
        <Badge className={cn("capitalize", typeColor[task.task_type])} variant="secondary">
          {task.task_type}
        </Badge>
        <Badge className={cn("capitalize", priorityColor[task.priority])} variant="secondary">
          <Flag className="h-3 w-3 mr-1" />
          {task.priority}
        </Badge>
        {task.weight > 0 && (
          <Badge variant="outline">{task.weight}%</Badge>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
        <span className="flex items-center gap-1">
          <CalendarIcon className="h-3 w-3" />
          {formatDue(task.due_date)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {task.estimated_minutes}m
        </span>
      </div>
      <div className="mt-2">
        <Select value={task.status} onValueChange={onStatus}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                <span className="flex items-center gap-1.5">
                  <GripVertical className="h-3 w-3" />
                  {s.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onEdit,
  onDelete,
  onStatus,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (s: string) => void;
}) {
  const color = task.course?.color ?? "hsl(var(--primary))";
  const done = task.status === "done";
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow",
        done && "opacity-60"
      )}
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("font-medium text-sm", done && "line-through")}>
            {task.title}
          </span>
          <Badge className={cn("capitalize text-xs", typeColor[task.task_type])} variant="secondary">
            {task.task_type}
          </Badge>
          <Badge className={cn("capitalize text-xs", priorityColor[task.priority])} variant="secondary">
            {task.priority}
          </Badge>
          {task.course?.catalog?.code && (
            <span className="text-xs text-muted-foreground">
              · {task.course.catalog.code}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            {formatDue(task.due_date)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {task.estimated_minutes}m
          </span>
          {task.weight > 0 && <span>{task.weight}%</span>}
        </div>
      </div>
      <Select value={task.status} onValueChange={onStatus}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value} className="text-xs">
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
