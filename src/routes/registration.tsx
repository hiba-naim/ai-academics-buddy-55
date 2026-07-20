import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CircleAlert,
  GraduationCap,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Workflow,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  addCourseToSemester,
  createSemester,
  getRegistrationPlannerData,
  removeCourseFromSemester,
  updateSemesterPlanItem,
  type AddCourseToSemesterInput,
  type CreateSemesterInput,
  type PlannerPriority,
  type PlannerStatus,
  type RegistrationCatalogCourse,
  type RegistrationPlanItem,
  type RegistrationPlannerRecommendation,
  type RegistrationPlannerSummary,
  type RegistrationSemester,
  type UpdateSemesterPlanItemInput,
} from "@/lib/registration.functions";
import { useServerFn } from "@tanstack/react-start";

const plannerQuery = (semesterId?: number) =>
  queryOptions({
    queryKey: ["registration-planner", semesterId ?? "default"],
    queryFn: () => getRegistrationPlannerData({ data: { semesterId } }),
  });

export const Route = createFileRoute("/registration")({
  head: () => ({
    meta: [
      { title: "Registration Planner — AI Academic Copilot" },
      { name: "description", content: "Plan next term's course registration." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(plannerQuery()),
  component: RegistrationPlannerPage,
});

function RegistrationPlannerPage() {
  const queryClient = useQueryClient();
  const [selectedSemesterId, setSelectedSemesterId] = useState<number | undefined>(undefined);

  const { data } = useSuspenseQuery(plannerQuery(selectedSemesterId));

  useEffect(() => {
    if (selectedSemesterId === undefined && data.selectedSemester?.id != null) {
      setSelectedSemesterId(data.selectedSemester.id);
    }
  }, [data.selectedSemester?.id, selectedSemesterId]);

  const selectedSemester = data.selectedSemester;
  const hasSelectedSemester = selectedSemester != null;
  const plannedCatalogIds = useMemo(
    () => new Set(data.planItems.map((item) => item.catalog_id)),
    [data.planItems],
  );

  const createSemesterFn = useServerFn(createSemester);
  const addCourseFn = useServerFn(addCourseToSemester);
  const updateItemFn = useServerFn(updateSemesterPlanItem);
  const removeItemFn = useServerFn(removeCourseFromSemester);

  const createSemesterMutation = useMutation({
    mutationFn: (payload: CreateSemesterInput) => createSemesterFn({ data: payload }),
    onSuccess: (semester: RegistrationSemester) => {
      setSelectedSemesterId(semester.id);
      queryClient.invalidateQueries({ queryKey: ["registration-planner"] });
    },
  });

  const addCourseMutation = useMutation({
    mutationFn: (payload: AddCourseToSemesterInput) => addCourseFn({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registration-planner"] });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: (payload: UpdateSemesterPlanItemInput) => updateItemFn({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registration-planner"] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: number) => removeItemFn({ data: { itemId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registration-planner"] });
    },
  });

  const availableCourses = data.catalogCourses;
  const recommendations = data.recommendations;

  const handleAddCourse = (catalogId: number) => {
    if (!selectedSemester?.id) return;
    addCourseMutation.mutate({ semesterId: selectedSemester.id, catalogId });
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <header className="rounded-3xl border bg-card/90 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Badge className="w-fit rounded-full px-3 py-1" variant="secondary">
              Academic planning workspace
            </Badge>
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  Registration Planner
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                  Build a balanced semester plan, watch workload risk, and keep your academic load under control.
                </p>
              </div>
              <SemesterSelector
                semesters={data.semesters}
                selectedSemesterId={selectedSemester?.id}
                onSelectSemester={setSelectedSemesterId}
                onCreateSemester={(payload) => createSemesterMutation.mutate(payload)}
              />
            </div>
          </div>

          <PlannerSummaryCards summary={data.summary} />
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr_0.9fr]">
        <CourseCatalogBrowser
          courses={availableCourses}
          plannedCatalogIds={plannedCatalogIds}
          hasSemester={hasSelectedSemester}
          onAddCourse={handleAddCourse}
          isAdding={addCourseMutation.isPending}
        />

        <PlannedSemesterPanel
          selectedSemester={selectedSemester}
          planItems={data.planItems}
          onRemove={(itemId) => removeItemMutation.mutate(itemId)}
          onPriorityChange={(payload) => updateItemMutation.mutate(payload)}
          onStatusChange={(payload) => updateItemMutation.mutate(payload)}
          isUpdating={updateItemMutation.isPending}
          isRemoving={removeItemMutation.isPending}
        />

        <AdvisorPanel
          recommendations={recommendations}
          summary={data.summary}
          hasSemester={hasSelectedSemester}
        />
      </div>
    </div>
  );
}

function SemesterSelector({
  semesters,
  selectedSemesterId,
  onSelectSemester,
  onCreateSemester,
}: {
  semesters: RegistrationSemester[];
  selectedSemesterId?: number;
  onSelectSemester: (semesterId?: number) => void;
  onCreateSemester: (payload: CreateSemesterInput) => void;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState<CreateSemesterInput["term"]>("fall");
  const [academicYear, setAcademicYear] = useState(String(new Date().getFullYear()));

  const currentLabel =
    semesters.find((semester) => semester.id === selectedSemesterId)?.term ??
    (semesters.length === 0 ? "No semesters yet" : "Select a semester");

  const submit = () => {
    const year = Number(academicYear);
    if (!Number.isInteger(year) || year < 2000) return;
    onCreateSemester({ term, academicYear: year });
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-3 sm:min-w-70 sm:items-end">
      <div className="w-full sm:w-70">
        <Label className="mb-2 block text-xs uppercase tracking-wide text-muted-foreground">
          Semester
        </Label>
        <Select
          value={selectedSemesterId != null ? String(selectedSemesterId) : ""}
          onValueChange={(value) => onSelectSemester(Number(value))}
        >
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder={currentLabel} />
          </SelectTrigger>
          <SelectContent>
            {semesters.length === 0 ? (
              <SelectItem value="__empty" disabled>
                No semesters available
              </SelectItem>
            ) : (
              semesters.map((semester) => (
                <SelectItem key={semester.id} value={String(semester.id)}>
                  {formatSemesterLabel(semester)}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> New semester
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create semester</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="term">Term</Label>
              <Select value={term} onValueChange={(value) => setTerm(value as CreateSemesterInput["term"])}>
                <SelectTrigger id="term">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spring">Spring</SelectItem>
                  <SelectItem value="summer">Summer</SelectItem>
                  <SelectItem value="fall">Fall</SelectItem>
                  <SelectItem value="winter">Winter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="academic-year">Academic year</Label>
              <Input
                id="academic-year"
                type="number"
                min={2000}
                value={academicYear}
                onChange={(event) => setAcademicYear(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>Create semester</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlannerSummaryCards({ summary }: { summary: RegistrationPlannerSummary }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard
        label="Total Credits"
        value={String(summary.totalCredits)}
        hint={summary.totalCredits > 18 ? "Above recommended load" : "Within planning range"}
        icon={<GraduationCap className="h-4 w-4" />}
        accent={summary.totalCredits > 18}
      />
      <StatCard
        label="Weekly Workload"
        value={`${summary.estimatedWeeklyWorkload.toFixed(1)} hrs`}
        hint={summary.estimatedWeeklyWorkload > 45 ? "High workload warning" : "Estimated from priority"}
        icon={<Workflow className="h-4 w-4" />}
      />
      <HealthScoreCard summary={summary} />
    </div>
  );
}

function HealthScoreCard({ summary }: { summary: RegistrationPlannerSummary }) {
  const score = summary.semesterHealthScore;
  const tone = score >= 80 ? "emerald" : score >= 60 ? "amber" : "rose";
  const barClass =
    tone === "emerald"
      ? "from-emerald-500 to-emerald-400"
      : tone === "amber"
        ? "from-amber-500 to-yellow-400"
        : "from-rose-500 to-red-500";

  return (
    <Card className="border-muted/60 shadow-sm">
      <CardContent className="flex h-full items-center gap-4 pt-6">
        <CircularScore score={score} tone={tone} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Semester Health Score</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-semibold tracking-tight">{score}</span>
            <Badge variant="secondary" className={cn("rounded-full capitalize", tone === "emerald" && "bg-emerald-500/10 text-emerald-700", tone === "amber" && "bg-amber-500/10 text-amber-700", tone === "rose" && "bg-rose-500/10 text-rose-700")}>
              {summary.semesterDifficultyLabel}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {summary.warnings.length > 0
              ? `${summary.warnings.length} active warning${summary.warnings.length === 1 ? "" : "s"}`
              : "Balanced load"}
          </p>
          <Progress value={score} className="mt-3 h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

function CircularScore({ score, tone }: { score: number; tone: "emerald" | "amber" | "rose" }) {
  const color =
    tone === "emerald" ? "#10b981" : tone === "amber" ? "#f59e0b" : "#f43f5e";

  return (
    <div className="relative grid h-24 w-24 shrink-0 place-items-center">
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: `conic-gradient(${color} ${score}%, hsl(var(--muted)) 0)` }}
      />
      <div className="absolute inset-1.5 rounded-full bg-background shadow-inner" />
      <div className="relative z-10 text-center">
        <div className="text-2xl font-semibold">{score}</div>
        <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">health</div>
      </div>
    </div>
  );
}

function CourseCatalogBrowser({
  courses,
  plannedCatalogIds,
  hasSemester,
  onAddCourse,
  isAdding,
}: {
  courses: RegistrationCatalogCourse[];
  plannedCatalogIds: Set<number>;
  hasSemester: boolean;
  onAddCourse: (catalogId: number) => void;
  isAdding: boolean;
}) {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");

  const departments = useMemo(
    () => ["all", ...new Set(courses.map((course) => course.department).filter(Boolean) as string[])],
    [courses],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesDepartment = department === "all" || course.department === department;
      const matchesSearch =
        query.length === 0 ||
        [course.code, course.title, course.department, course.description]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query));
      return matchesDepartment && matchesSearch;
    });
  }, [courses, department, search]);

  return (
    <Card className="flex min-h-155 flex-col border-muted/60 shadow-sm">
      <CardHeader className="space-y-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-4 w-4 text-primary" /> Course Catalog
          </CardTitle>
          <CardDescription>Browse available courses and add them to the selected semester.</CardDescription>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search code, title, department..."
              className="pl-9"
            />
          </div>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger>
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((value) => (
                <SelectItem key={value} value={value}>
                  {value === "all" ? "All departments" : value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        <ScrollArea className="h-115 pr-3">
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <EmptyPanel
                title="No courses match your filters"
                description="Try clearing search or switching the department filter."
              />
            ) : (
              filtered.map((course) => (
                <div
                  key={course.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm transition hover:border-primary/30 hover:shadow-md"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="rounded-full">
                        {course.code}
                      </Badge>
                      <Badge variant="outline" className="rounded-full">
                        {course.credits} cr
                      </Badge>
                    </div>
                    <h3 className="line-clamp-1 font-medium">{course.title}</h3>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {course.department ?? "General Studies"}
                      {course.description ? ` · ${course.description}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onAddCourse(course.id)}
                    disabled={!hasSemester || plannedCatalogIds.has(course.id) || isAdding}
                    className="shrink-0 rounded-xl"
                  >
                    {plannedCatalogIds.has(course.id) ? "Added" : "Add"}
                    <Plus className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function PlannedSemesterPanel({
  selectedSemester,
  planItems,
  onPriorityChange,
  onStatusChange,
  onRemove,
  isUpdating,
  isRemoving,
}: {
  selectedSemester: RegistrationSemester | null;
  planItems: RegistrationPlanItem[];
  onPriorityChange: (payload: UpdateSemesterPlanItemInput) => void;
  onStatusChange: (payload: UpdateSemesterPlanItemInput) => void;
  onRemove: (itemId: number) => void;
  isUpdating: boolean;
  isRemoving: boolean;
}) {
  return (
    <Card className="flex min-h-155 flex-col border-muted/60 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ArrowRight className="h-4 w-4 text-primary" /> My Semester Plan
        </CardTitle>
        <CardDescription>
          {selectedSemester ? formatSemesterLabel(selectedSemester) : "Create a semester to start planning."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        <ScrollArea className="h-133 pr-3">
          <div className="space-y-3">
            {!selectedSemester ? (
              <EmptyPanel
                title="No semester selected"
                description="Create or choose a semester to see your planned courses here."
              />
            ) : planItems.length === 0 ? (
              <EmptyPanel
                title="Your plan is empty"
                description="Add courses from the catalog to build a balanced semester."
              />
            ) : (
              planItems.map((item) => (
                <PlannedCourseCard
                  key={item.id}
                  item={item}
                  onPriorityChange={(priority) =>
                    onPriorityChange({ itemId: item.id, priority })
                  }
                  onStatusChange={(status) => onStatusChange({ itemId: item.id, status })}
                  onRemove={() => onRemove(item.id)}
                  isUpdating={isUpdating}
                  isRemoving={isRemoving}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function PlannedCourseCard({
  item,
  onPriorityChange,
  onStatusChange,
  onRemove,
  isUpdating,
  isRemoving,
}: {
  item: RegistrationPlanItem;
  onPriorityChange: (priority: PlannerPriority) => void;
  onStatusChange: (status: PlannerStatus) => void;
  onRemove: () => void;
  isUpdating: boolean;
  isRemoving: boolean;
}) {
  const difficultyTone =
    item.difficulty === "hard"
      ? "destructive"
      : item.difficulty === "medium"
        ? "secondary"
        : "default";

  return (
    <Card className="overflow-hidden border-muted/60 shadow-sm transition hover:border-primary/30 hover:shadow-md">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full">
                {item.catalog.code}
              </Badge>
              <Badge variant={difficultyTone} className="rounded-full capitalize">
                {item.difficulty} difficulty
              </Badge>
            </div>
            <h3 className="line-clamp-1 font-medium">{item.catalog.title}</h3>
            <p className="text-sm text-muted-foreground">{item.catalog.department ?? "General Studies"}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onRemove} disabled={isRemoving}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Priority</Label>
            <Select
              value={item.priority}
              onValueChange={(value) => onPriorityChange(value as PlannerPriority)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Status</Label>
            <Select
              value={item.status}
              onValueChange={(value) => onStatusChange(value as PlannerStatus)}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="registered">Registered</SelectItem>
                <SelectItem value="waitlisted">Waitlisted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-muted/35 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Credits</span>
          <span className="font-medium">{item.catalog.credits}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function AdvisorPanel({
  recommendations,
  summary,
  hasSemester,
}: {
  recommendations: RegistrationPlannerRecommendation[];
  summary: RegistrationPlannerSummary;
  hasSemester: boolean;
}) {
  return (
    <Card className="flex min-h-155 flex-col border-muted/60 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-4 w-4 text-primary" /> AI Academic Advisor
        </CardTitle>
        <CardDescription>
          Rule-based guidance based on the current semester plan.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        <div className="space-y-3">
          {!hasSemester ? (
            <EmptyPanel
              title="No semester selected"
              description="Create or choose a semester to see workload and balance recommendations."
            />
          ) : (
            recommendations.map((recommendation, index) => (
              <RecommendationCard key={`${recommendation.title}-${index}`} recommendation={recommendation} />
            ))
          )}
        </div>

        <div className="mt-5 rounded-2xl border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BadgeCheck className="h-4 w-4 text-primary" /> Quick plan snapshot
          </div>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Total credits</span>
              <span className="font-medium text-foreground">{summary.totalCredits}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Workload</span>
              <span className="font-medium text-foreground">{summary.estimatedWeeklyWorkload.toFixed(1)} hrs</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Registered / waitlisted</span>
              <span className="font-medium text-foreground">
                {summary.registeredCourses} / {summary.waitlistedCourses}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>High priority / high difficulty</span>
              <span className="font-medium text-foreground">
                {summary.highPriorityCourses} / {summary.highDifficultyCourses}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationCard({ recommendation }: { recommendation: RegistrationPlannerRecommendation }) {
  const tone =
    recommendation.severity === "critical"
      ? "destructive"
      : recommendation.severity === "warning"
        ? "secondary"
        : "default";

  const icon =
    recommendation.severity === "critical" ? (
      <AlertTriangle className="h-4 w-4" />
    ) : recommendation.severity === "warning" ? (
      <CircleAlert className="h-4 w-4" />
    ) : (
      <Sparkles className="h-4 w-4" />
    );

  return (
    <Card className="border-muted/60 shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Badge variant={tone} className="rounded-full">
              {icon}
              <span className="ml-1 capitalize">{recommendation.severity}</span>
            </Badge>
            <h3 className="line-clamp-1 font-medium">{recommendation.title}</h3>
          </div>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{recommendation.message}</p>
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
          <span>{recommendation.actionLabel}</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className={cn("border-muted/60 shadow-sm", accent && "border-emerald-500/40 bg-emerald-500/5") }>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-45 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 p-6 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function formatSemesterLabel(semester: RegistrationSemester) {
  return `${semester.term.charAt(0).toUpperCase()}${semester.term.slice(1)} ${semester.academic_year}`;
}
