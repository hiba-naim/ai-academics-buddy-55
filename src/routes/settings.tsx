import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useServerFn } from "@tanstack/react-start";
import {
  BellRing,
  BookOpen,
  Download,
  GraduationCap,
  LayoutGrid,
  Palette,
  RotateCcw,
  Save,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  academicExportSchema,
  buildAcademicExport,
  DAY_OPTIONS,
  getDefaultSettingsFromUser,
  getSettingsPageData,
  importAcademicData,
  resetDemoData,
  saveSettings,
  SESSION_LENGTH_OPTIONS,
  settingsFormSchema,
  THEME_OPTIONS,
  WORKLOAD_OPTIONS,
  type SettingsFormValues,
  type SettingsUserRow,
} from "@/lib/settings.functions";

const settingsQuery = queryOptions({
  queryKey: ["settings-page"],
  queryFn: () => getSettingsPageData(),
});

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — AI Academic Copilot" },
      { name: "description", content: "Configure your account, preferences, and academic data." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const { data } = useSuspenseQuery(settingsQuery);

  const defaultValues = useMemo(() => getDefaultSettingsFromUser(data.user, data.availableSemesters), [data.availableSemesters, data.user]);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues,
    mode: "onBlur",
  });

  const saveFn = useServerFn(saveSettings);
  const importFn = useServerFn(importAcademicData);
  const resetFn = useServerFn(resetDemoData);

  const watchedDays = form.watch("preferred_study_days");
  const watchedTheme = form.watch("theme");
  const watchedCompactMode = form.watch("compact_mode");
  const watchedAnimationsEnabled = form.watch("animations_enabled");

  const syncUserDefaults = (updatedUser: SettingsUserRow) => {
    const nextValues = getDefaultSettingsFromUser(updatedUser, data.availableSemesters);
    form.reset(nextValues);
    applyAppearance(updatedUser.theme, updatedUser.compact_mode, updatedUser.animations_enabled);
  };

  const saveMutation = useMutation({
    mutationFn: (payload: SettingsFormValues) => saveFn({ data: payload }),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["settings-page"] });
      syncUserDefaults(updatedUser);
      toast.success("Settings saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const importMutation = useMutation({
    mutationFn: (payload: Parameters<typeof importFn>[0]) => importFn(payload),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["settings-page"] });
      syncUserDefaults(updatedUser);
      toast.success("Academic data imported");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetFn({ data: undefined }),
    onSuccess: (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ["settings-page"] });
      syncUserDefaults(updatedUser);
      toast.success("Demo data reset");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleSubmit = form.handleSubmit((values) => saveMutation.mutate(values));

  const handleExport = () => {
    const payload = buildAcademicExport(form.getValues(), data);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "academic-settings-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Academic data exported");
  };

  const openImportDialog = () => fileInputRef.current?.click();

  const handleImportFile = async (file: File | null) => {
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const validated = academicExportSchema.safeParse(parsed);
      if (!validated.success) {
        throw new Error("The selected file is not a valid academic export.");
      }
      importMutation.mutate({ data: validated.data });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to import academic data");
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) => void handleImportFile(event.target.files?.[0] ?? null)}
      />

      <header className="rounded-3xl border bg-card/90 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <Badge className="w-fit rounded-full px-3 py-1" variant="secondary">
              Personal workspace settings
            </Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Settings</h1>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">
                Configure your profile, academic preferences, planner behavior, notifications, and appearance.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={handleExport} className="rounded-xl">
              <Download className="mr-2 h-4 w-4" /> Export academic data
            </Button>
            <Button variant="outline" onClick={openImportDialog} className="rounded-xl">
              <Upload className="mr-2 h-4 w-4" /> Import academic data
            </Button>
            <Button variant="destructive" onClick={() => setResetOpen(true)} className="rounded-xl">
              <RotateCcw className="mr-2 h-4 w-4" /> Reset demo data
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <SettingsSection
            title="Profile"
            description="Keep your account information and academic identity up to date."
          >
            <Field label="Name" error={form.formState.errors.full_name?.message}>
              <Input {...form.register("full_name")} placeholder="Full name" />
            </Field>
            <Field label="Email" error={form.formState.errors.email?.message}>
              <Input {...form.register("email")} type="email" placeholder="you@example.edu" />
            </Field>
            <Field label="University" error={form.formState.errors.university?.message}>
              <Input {...form.register("university")} placeholder="Example University" />
            </Field>
            <Field label="Major" error={form.formState.errors.major?.message}>
              <Input {...form.register("major")} placeholder="Bioinformatics" />
            </Field>
            <Field label="Graduation year" error={form.formState.errors.graduation_year?.message}>
              <Input {...form.register("graduation_year", { valueAsNumber: true })} type="number" min={1900} max={2100} />
            </Field>
          </SettingsSection>

          <SettingsSection
            title="Academic Preferences"
            description="Shape the plan around your goals and study rhythm."
          >
            <Field label="Target GPA" error={form.formState.errors.target_gpa?.message}>
              <Input {...form.register("target_gpa", { valueAsNumber: true })} type="number" min={0} max={4} step="0.01" />
            </Field>
            <Field label="Weekly study goal (hours)" error={form.formState.errors.weekly_study_goal_hours?.message}>
              <Input {...form.register("weekly_study_goal_hours", { valueAsNumber: true })} type="number" min={0} max={120} />
            </Field>
            <Field label="Preferred study days" error={form.formState.errors.preferred_study_days?.message as string | undefined}>
              <ToggleGroup
                type="multiple"
                className="flex flex-wrap justify-start gap-2"
                value={watchedDays}
                onValueChange={(value) => form.setValue("preferred_study_days", value as SettingsFormValues["preferred_study_days"], { shouldDirty: true, shouldValidate: true })}
              >
                {DAY_OPTIONS.map((day) => (
                  <ToggleGroupItem key={day} value={day} aria-label={day} className="rounded-full px-3">
                    {day}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
            <Field label="Preferred study session length" error={form.formState.errors.preferred_study_session_length?.message}>
              <Select
                value={String(form.watch("preferred_study_session_length"))}
                onValueChange={(value) => form.setValue("preferred_study_session_length", Number(value), { shouldDirty: true, shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select length" />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_LENGTH_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option} minutes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Default semester" error={form.formState.errors.default_semester?.message}>
              <Select
                value={form.watch("default_semester")}
                onValueChange={(value) => form.setValue("default_semester", value, { shouldDirty: true, shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a semester" />
                </SelectTrigger>
                <SelectContent>
                  {data.availableSemesters.length > 0 ? (
                    data.availableSemesters.map((semester) => (
                      <SelectItem key={semester} value={semester}>
                        {semester}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="Fall 2026">Fall 2026</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </Field>
          </SettingsSection>

          <SettingsSection
            title="Planner Preferences"
            description="Guide the planner to match your bandwidth and course mix."
          >
            <Field label="Maximum credits per semester" error={form.formState.errors.max_credits_per_semester?.message}>
              <Input {...form.register("max_credits_per_semester", { valueAsNumber: true })} type="number" min={0} max={30} />
            </Field>
            <Field label="Preferred workload" error={form.formState.errors.preferred_workload?.message}>
              <Select
                value={form.watch("preferred_workload")}
                onValueChange={(value) => form.setValue("preferred_workload", value as SettingsFormValues["preferred_workload"], { shouldDirty: true, shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose workload" />
                </SelectTrigger>
                <SelectContent>
                  {WORKLOAD_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option} className="capitalize">
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Maximum difficult courses" error={form.formState.errors.max_difficult_courses?.message}>
              <Input {...form.register("max_difficult_courses", { valueAsNumber: true })} type="number" min={0} max={10} />
            </Field>
            <ToggleRow
              label="Show AI recommendations"
              description="Surface planning recommendations from your current academic data."
              checked={form.watch("show_ai_recommendations")}
              onCheckedChange={(checked) => form.setValue("show_ai_recommendations", checked, { shouldDirty: true })}
            />
            <ToggleRow
              label="Enable planner warnings"
              description="Warn when the schedule gets overloaded or unbalanced."
              checked={form.watch("enable_planner_warnings")}
              onCheckedChange={(checked) => form.setValue("enable_planner_warnings", checked, { shouldDirty: true })}
            />
          </SettingsSection>

          <SettingsSection
            title="Notifications"
            description="Choose which reminders should be surfaced in the workspace."
          >
            <ToggleRow
              label="Assignment reminders"
              description="Remind me about upcoming assignment deadlines."
              checked={form.watch("notify_assignments")}
              onCheckedChange={(checked) => form.setValue("notify_assignments", checked, { shouldDirty: true })}
            />
            <ToggleRow
              label="Upcoming exam reminders"
              description="Surface exam alerts before they appear on the calendar."
              checked={form.watch("notify_exams")}
              onCheckedChange={(checked) => form.setValue("notify_exams", checked, { shouldDirty: true })}
            />
            <ToggleRow
              label="Weekly summary"
              description="Send a weekly progress summary of academic activity."
              checked={form.watch("notify_weekly_summary")}
              onCheckedChange={(checked) => form.setValue("notify_weekly_summary", checked, { shouldDirty: true })}
            />
            <ToggleRow
              label="Registration reminders"
              description="Remind me when registration windows are approaching."
              checked={form.watch("notify_registration")}
              onCheckedChange={(checked) => form.setValue("notify_registration", checked, { shouldDirty: true })}
            />
          </SettingsSection>

          <SettingsSection
            title="Appearance"
            description="Match the workspace to your visual preference. Theme changes are synced to the app shell."
          >
            <Field label="Theme selector" error={form.formState.errors.theme?.message}>
              <ToggleGroup
                type="single"
                className="grid grid-cols-3 gap-2"
                value={watchedTheme}
                onValueChange={(value) => {
                  if (!value) return;
                  form.setValue("theme", value as SettingsFormValues["theme"], { shouldDirty: true, shouldValidate: true });
                }}
              >
                {THEME_OPTIONS.map((option) => (
                  <ToggleGroupItem key={option} value={option} className="rounded-2xl capitalize">
                    {option}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
            <ToggleRow
              label="Compact mode"
              description="Use denser spacing in panels and lists."
              checked={watchedCompactMode}
              onCheckedChange={(checked) => form.setValue("compact_mode", checked, { shouldDirty: true })}
            />
            <ToggleRow
              label="Animations"
              description="Enable motion and transitions across the workspace."
              checked={watchedAnimationsEnabled}
              onCheckedChange={(checked) => form.setValue("animations_enabled", checked, { shouldDirty: true })}
            />
          </SettingsSection>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <p className="mr-auto text-sm text-muted-foreground">
              {form.formState.isDirty ? "Unsaved changes detected." : "All settings are up to date."}
            </p>
            <Button type="submit" className="rounded-xl" disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" /> Save settings
            </Button>
          </div>
        </form>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Card className="border-muted/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Live Snapshot</CardTitle>
              <CardDescription>How the current settings map to your academic workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <SnapshotTile label="Courses tracked" value={String(data.courses.length)} icon={<BookOpen className="h-4 w-4" />} />
                <SnapshotTile label="Active courses" value={String(data.stats.activeCourses)} icon={<GraduationCap className="h-4 w-4" />} />
                <SnapshotTile label="Study days" value={String(watchedDays.length)} icon={<LayoutGrid className="h-4 w-4" />} />
                <SnapshotTile label="Reminder types on" value={String(Number(form.watch("notify_assignments")) + Number(form.watch("notify_exams")) + Number(form.watch("notify_weekly_summary")) + Number(form.watch("notify_registration")))} icon={<BellRing className="h-4 w-4" />} />
              </div>

              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Appearance preview</p>
                    <p className="text-xs text-muted-foreground">Theme: {watchedTheme}</p>
                  </div>
                  <Palette className="h-4 w-4 text-primary" />
                </div>
                <div className={cn("mt-4 rounded-2xl border bg-background p-4 shadow-sm transition-all", watchedCompactMode ? "space-y-2" : "space-y-3", !watchedAnimationsEnabled && "transition-none")}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Planner card</p>
                      <p className="text-xs text-muted-foreground">{form.watch("default_semester")}</p>
                    </div>
                    <Badge variant="secondary" className="rounded-full capitalize">{form.watch("preferred_workload")}</Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span>Target GPA</span>
                    <span className="font-medium">{form.watch("target_gpa").toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Session length</span>
                    <span className="font-medium">{form.watch("preferred_study_session_length")} min</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Weekly goal</span>
                    <span className="font-medium">{form.watch("weekly_study_goal_hours")} hrs</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Data</CardTitle>
              <CardDescription>Export, import, or restore the current demo dataset.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start rounded-xl" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" /> Export academic data
              </Button>
              <Button variant="outline" className="w-full justify-start rounded-xl" onClick={openImportDialog}>
                <Upload className="mr-2 h-4 w-4" /> Import academic data
              </Button>
              <Button variant="destructive" className="w-full justify-start rounded-xl" onClick={() => setResetOpen(true)}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reset demo data
              </Button>
              <p className="text-xs text-muted-foreground">
                Exports include profile settings, courses, tasks, and assessments for the current user.
              </p>
            </CardContent>
          </Card>

          <Card className="border-muted/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Current Profile</CardTitle>
              <CardDescription>Saved values from the database.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <ProfileLine label="Email" value={data.user?.email ?? "—"} />
              <ProfileLine label="University" value={data.user?.university ?? "—"} />
              <ProfileLine label="Major" value={data.user?.major ?? "—"} />
              <ProfileLine label="Graduation year" value={data.user?.graduation_year ? String(data.user.graduation_year) : "—"} />
              <ProfileLine label="Default semester" value={form.watch("default_semester")} />
            </CardContent>
          </Card>
        </aside>
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
            <AlertDialogDescription>
              This restores the seeded demo academic records and resets the saved settings to the baseline values.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetMutation.mutate();
                setResetOpen(false);
              }}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-muted/60 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border bg-muted/20 p-4 md:col-span-2">
      <div className="space-y-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SnapshotTile({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border bg-muted/20 p-4">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold">{value}</p>
      </div>
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</div>
    </div>
  );
}

function ProfileLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/20 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function applyAppearance(theme: string | null, compactMode: boolean, animationsEnabled: boolean) {
  if (typeof window === "undefined") return;

  const nextTheme = theme ?? "system";
  if (nextTheme === "system") {
    localStorage.removeItem("theme");
    document.documentElement.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);
  } else {
    localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  localStorage.setItem("compact-mode", compactMode ? "true" : "false");
  localStorage.setItem("animations-enabled", animationsEnabled ? "true" : "false");
}
