import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Edit3,
  Filter,
  GraduationCap,
  MessageSquareText,
  Search,
  Star,
  Trash2,
  Users,
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  deleteReview,
  getInstructorReviewsData,
  saveReview,
  type DeleteReviewInput,
  type ReviewInstructor,
  type ReviewRow,
  type ReviewsPageData,
  type SaveReviewInput,
} from "@/lib/reviews.functions";
import { useServerFn } from "@tanstack/react-start";

const reviewsQuery = (instructorId?: number) =>
  queryOptions({
    queryKey: ["reviews-page", instructorId ?? "default"],
    queryFn: () => getInstructorReviewsData({ data: { instructorId } }),
  });

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Instructor Reviews — AI Academic Copilot" },
      { name: "description", content: "Browse and share instructor feedback." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(reviewsQuery()),
  component: ReviewsPage,
});

function ReviewsPage() {
  const queryClient = useQueryClient();
  const [selectedInstructorId, setSelectedInstructorId] = useState<number | undefined>(undefined);
  const { data } = useSuspenseQuery(reviewsQuery(selectedInstructorId));

  const selectedInstructor = data.selectedInstructor;
  const [courseFilter, setCourseFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (selectedInstructorId === undefined && selectedInstructor?.id != null) {
      setSelectedInstructorId(selectedInstructor.id);
    }
  }, [selectedInstructor?.id, selectedInstructorId]);

  const reviewCount = data.instructors.reduce((sum, instructor) => sum + instructor.review_count, 0);
  const avgRating = data.instructors.length
    ? data.instructors.reduce((sum, instructor) => sum + instructor.average_rating, 0) / data.instructors.length
    : 0;
  const avgRatingRounded = Math.round(avgRating * 10) / 10;

  const departments = useMemo(
    () => ["all", ...new Set(data.instructors.map((instructor) => instructor.department).filter(Boolean) as string[])],
    [data.instructors],
  );

  const filteredInstructors = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.instructors.filter((instructor) => {
      const matchesDepartment =
        courseFilter === "all" || instructor.department === courseFilter;
      const matchesSearch =
        query.length === 0 ||
        [instructor.full_name, instructor.department]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query));
      return matchesDepartment && matchesSearch;
    });
  }, [courseFilter, data.instructors, search]);

  const filteredReviews = useMemo(() => {
    if (!selectedInstructor) return [];
    return data.reviews.filter((review) => {
      if (courseFilter === "all") return true;
      return review.course?.id != null ? String(review.course.id) === courseFilter : false;
    });
  }, [courseFilter, data.reviews, selectedInstructor]);

  const courseFilterOptions = useMemo(
    () => [
      { value: "all", label: "All courses" },
      ...Array.from(
        new Map(
          data.reviews
            .filter((review) => review.course)
            .map((review) => [String(review.course!.id), `${review.course!.code} — ${review.course!.title}`]),
        ).entries(),
      ).map(([value, label]) => ({ value, label })),
    ],
    [data.reviews],
  );

  const saveFn = useServerFn(saveReview);
  const deleteFn = useServerFn(deleteReview);

  const saveMutation = useMutation({
    mutationFn: (payload: SaveReviewInput) => saveFn({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews-page"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: DeleteReviewInput) => deleteFn({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews-page"] });
    },
  });

  const openReviewForInstructor = (instructor: ReviewInstructor) => {
    setSelectedInstructorId(instructor.id);
    setCourseFilter("all");
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <header className="rounded-3xl border bg-card/90 p-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge className="w-fit rounded-full px-3 py-1" variant="secondary">
                Student feedback workspace
              </Badge>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                Instructor Reviews
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                Browse instructors, compare course feedback, and contribute your own review history.
              </p>
            </div>
            <HeaderStats avgRating={avgRatingRounded} reviewCount={reviewCount} instructorCount={data.instructors.length} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Instructors" value={String(data.instructors.length)} icon={<Users className="h-4 w-4" />} />
            <MetricCard label="Average rating" value={avgRatingRounded ? avgRatingRounded.toFixed(1) : "—"} icon={<Star className="h-4 w-4" />} />
            <MetricCard label="Total reviews" value={String(reviewCount)} icon={<MessageSquareText className="h-4 w-4" />} />
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr_0.9fr]">
        <InstructorDirectory
          instructors={filteredInstructors}
          search={search}
          onSearch={setSearch}
          departments={departments}
          department={courseFilter}
          onDepartmentChange={setCourseFilter}
          selectedInstructorId={selectedInstructor?.id}
          onSelectInstructor={setSelectedInstructorId}
          onOpenReview={openReviewForInstructor}
        />

        <InstructorDetail
          selectedInstructor={selectedInstructor}
          reviews={filteredReviews}
          courseFilter={courseFilter}
          courseFilterOptions={courseFilterOptions}
          onCourseFilterChange={setCourseFilter}
          onOpenReview={openReviewForInstructor}
          userReview={data.userReview}
          saveMutation={saveMutation}
          deleteMutation={deleteMutation}
          allCourses={data.courseOptions}
          reviewCount={reviewCount}
          hasInstructors={data.instructors.length > 0}
        />

        <AdvisorPanel instructor={selectedInstructor} reviews={filteredReviews} />
      </div>
    </div>
  );
}

function HeaderStats({ avgRating, reviewCount, instructorCount }: { avgRating: number; reviewCount: number; instructorCount: number }) {
  return (
    <Card className="border-muted/60 shadow-sm md:min-w-[320px]">
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <GraduationCap className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Overall review statistics</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-2xl font-semibold tracking-tight">
              {avgRating ? avgRating.toFixed(1) : "—"}
            </span>
            <Badge variant="secondary" className="rounded-full">
              {instructorCount} instructors
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{reviewCount} total reviews</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InstructorDirectory({
  instructors,
  search,
  onSearch,
  departments,
  department,
  onDepartmentChange,
  selectedInstructorId,
  onSelectInstructor,
  onOpenReview,
}: {
  instructors: ReviewInstructor[];
  search: string;
  onSearch: (value: string) => void;
  departments: string[];
  department: string;
  onDepartmentChange: (value: string) => void;
  selectedInstructorId?: number;
  onSelectInstructor: (value?: number) => void;
  onOpenReview: (instructor: ReviewInstructor) => void;
}) {
  return (
    <Card className="flex min-h-175 flex-col border-muted/60 shadow-sm">
      <CardHeader className="space-y-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-4 w-4 text-primary" /> Instructor Directory
          </CardTitle>
          <CardDescription>Search by name or department to explore instructors.</CardDescription>
        </div>
        <div className="grid gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search instructors..."
              className="pl-9"
            />
          </div>
          <Select value={department} onValueChange={onDepartmentChange}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by department" />
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
        <ScrollArea className="h-135 pr-3">
          <div className="space-y-3">
            {instructors.length === 0 ? (
              <EmptyState
                icon={<Users className="h-5 w-5" />}
                title="No instructors found"
                description="Try adjusting search or department filters."
              />
            ) : (
              instructors.map((instructor) => (
                <button
                  key={instructor.id}
                  onClick={() => onSelectInstructor(instructor.id)}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left shadow-sm transition hover:border-primary/30 hover:shadow-md",
                    selectedInstructorId === instructor.id
                      ? "border-primary/40 bg-primary/5"
                      : "bg-card",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="rounded-full">
                          {instructor.department ?? "General"}
                        </Badge>
                        <Badge variant="outline" className="rounded-full">
                          {instructor.review_count} reviews
                        </Badge>
                      </div>
                      <h3 className="truncate font-medium">{instructor.full_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Avg rating {instructor.average_rating ? instructor.average_rating.toFixed(1) : "—"}
                      </p>
                    </div>
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-muted text-sm font-semibold">
                      {instructor.average_rating ? instructor.average_rating.toFixed(1) : "—"}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-0 text-primary"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenReview(instructor);
                      }}
                    >
                      Write review <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function InstructorDetail({
  selectedInstructor,
  reviews,
  courseFilter,
  courseFilterOptions,
  onCourseFilterChange,
  onOpenReview,
  userReview,
  saveMutation,
  deleteMutation,
  allCourses,
  reviewCount,
  hasInstructors,
}: {
  selectedInstructor: ReviewInstructor | null;
  reviews: ReviewRow[];
  courseFilter: string;
  courseFilterOptions: { value: string; label: string }[];
  onCourseFilterChange: (value: string) => void;
  onOpenReview: (instructor: ReviewInstructor) => void;
  userReview: ReviewRow | null;
  saveMutation: ReturnType<typeof useMutation>;
  deleteMutation: ReturnType<typeof useMutation>;
  allCourses: Array<{ id: number; code: string; title: string; credits: number; department: string | null }>;
  reviewCount: number;
  hasInstructors: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewRow | null>(null);

  const openCreate = () => {
    setEditingReview(null);
    setDialogOpen(true);
  };

  const openEdit = (review: ReviewRow) => {
    setEditingReview(review);
    setDialogOpen(true);
  };

  return (
    <Card className="flex min-h-175 flex-col border-muted/60 shadow-sm">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">
              {selectedInstructor ? selectedInstructor.full_name : "Selected Instructor"}
            </CardTitle>
            <CardDescription>
              {selectedInstructor
                ? selectedInstructor.department ?? "No department listed"
                : "Choose an instructor to see ratings and reviews."}
            </CardDescription>
          </div>
          <Button onClick={openCreate} disabled={!selectedInstructor} className="rounded-xl">
            Write review
          </Button>
        </div>

        {selectedInstructor ? (
          <div className="grid gap-3 md:grid-cols-3">
            <DetailMetric label="Average rating" value={selectedInstructor.average_rating ? selectedInstructor.average_rating.toFixed(1) : "—"} />
            <DetailMetric label="Teaching quality" value={selectedInstructor.teaching_quality_rating ? selectedInstructor.teaching_quality_rating.toFixed(1) : "—"} />
            <DetailMetric label="Workload" value={selectedInstructor.workload_rating ? selectedInstructor.workload_rating.toFixed(1) : "—"} />
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        {!selectedInstructor ? (
          <EmptyState
            icon={<BookOpen className="h-5 w-5" />}
            title="No instructor selected"
            description={hasInstructors ? "Pick an instructor from the directory to explore reviews." : "No instructor records are available."}
          />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Card className="border-muted/60 bg-muted/20 shadow-none">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Course difficulty</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xl font-semibold">
                      {selectedInstructor.course_difficulty_rating
                        ? selectedInstructor.course_difficulty_rating.toFixed(1)
                        : "—"}
                    </span>
                    <Badge variant="secondary" className="rounded-full">
                      1 = easiest, 5 = hardest
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-muted/60 bg-muted/20 shadow-none">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Review coverage</p>
                  <div className="mt-2 text-xl font-semibold">{selectedInstructor.review_count} reviews</div>
                  <Progress value={Math.min(100, selectedInstructor.review_count * 20)} className="mt-3 h-2" />
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4 text-primary" /> Course filter
              </div>
              <Select value={courseFilter} onValueChange={onCourseFilterChange}>
                <SelectTrigger className="md:w-[320px]">
                  <SelectValue placeholder="Filter reviews by course" />
                </SelectTrigger>
                <SelectContent>
                  {courseFilterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {reviews.length === 0 ? (
                <EmptyState
                  icon={<MessageSquareText className="h-5 w-5" />}
                  title="No reviews yet"
                  description="Be the first to share feedback for this instructor."
                />
              ) : (
                reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    isOwnReview={review.user_id === 1}
                    onEdit={() => openEdit(review)}
                    onDelete={() => deleteMutation.mutate({ id: review.id })}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>

      <ReviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        instructor={selectedInstructor}
        review={editingReview ?? userReview}
        allCourses={allCourses}
        onSubmit={(payload) => {
          saveMutation.mutate(payload);
          setDialogOpen(false);
        }}
      />
    </Card>
  );
}

function ReviewCard({
  review,
  isOwnReview,
  onEdit,
  onDelete,
}: {
  review: ReviewRow;
  isOwnReview: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="border-muted/60 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full">
                {review.course ? `${review.course.code}` : "General"}
              </Badge>
              {isOwnReview ? <Badge className="rounded-full">Your review</Badge> : null}
            </div>
            <div className="flex items-center gap-1 text-amber-500">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className={cn("h-4 w-4", index < review.rating ? "fill-current" : "opacity-25")} />
              ))}
            </div>
          </div>
          {isOwnReview ? (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onDelete}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ) : null}
        </div>

        <p className="text-sm leading-6 text-muted-foreground">
          {review.comment?.trim() ? review.comment : "No written comment provided."}
        </p>

        <div className="grid gap-2 md:grid-cols-4">
          <ReviewMiniStat label="Teaching" value={review.teaching_quality_rating} />
          <ReviewMiniStat label="Difficulty" value={review.course_difficulty_rating} />
          <ReviewMiniStat label="Workload" value={review.workload_rating} />
          <ReviewMiniStat label="Overall" value={review.rating} />
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewDialog({
  open,
  onOpenChange,
  instructor,
  review,
  allCourses,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  instructor: ReviewInstructor | null;
  review: ReviewRow | null;
  allCourses: Array<{ id: number; code: string; title: string; credits: number; department: string | null }>;
  onSubmit: (payload: SaveReviewInput) => void;
}) {
  const [courseId, setCourseId] = useState<string>(review?.course_id ? String(review.course_id) : "none");
  const [rating, setRating] = useState(review?.rating ?? 5);
  const [teaching, setTeaching] = useState(review?.teaching_quality_rating ?? 5);
  const [difficulty, setDifficulty] = useState(review?.course_difficulty_rating ?? 3);
  const [workload, setWorkload] = useState(review?.workload_rating ?? 3);
  const [comment, setComment] = useState(review?.comment ?? "");

  const isValid = instructor != null && rating >= 1 && teaching >= 1 && difficulty >= 1 && workload >= 1;

  const submit = () => {
    if (!instructor || !isValid) return;
    onSubmit({
      id: review?.id,
      instructorId: instructor.id,
      courseId: courseId === "none" ? null : Number(courseId),
      rating,
      teachingQualityRating: teaching,
      courseDifficultyRating: difficulty,
      workloadRating: workload,
      comment,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{review ? "Edit your review" : "Write a review"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Instructor</Label>
            <Input value={instructor?.full_name ?? "Select an instructor"} disabled />
          </div>
          <div className="grid gap-2">
            <Label>Optional course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="No course selected" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No course</SelectItem>
                {allCourses.map((course) => (
                  <SelectItem key={course.id} value={String(course.id)}>
                    {course.code} — {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <RatingRow label="Overall rating" value={rating} onChange={setRating} />
          <RatingRow label="Teaching quality" value={teaching} onChange={setTeaching} />
          <RatingRow label="Course difficulty" value={difficulty} onChange={setDifficulty} />
          <RatingRow label="Workload" value={workload} onChange={setWorkload} />

          <div className="grid gap-2">
            <Label>Comment</Label>
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Share what was helpful, challenging, or notable about the course..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!isValid}>
            Submit review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-sm text-muted-foreground">{value}/5</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

function ReviewMiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/30 p-3 text-center">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value.toFixed(1)}</div>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-muted/60 bg-muted/20 shadow-none">
      <CardContent className="pt-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-2 text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function AdvisorPanel({
  instructor,
  reviews,
}: {
  instructor: ReviewInstructor | null;
  reviews: ReviewRow[];
}) {
  const balance = instructor
    ? instructor.average_rating >= 4
      ? { label: "Strong feedback", tone: "emerald" as const }
      : instructor.average_rating >= 3
        ? { label: "Mixed feedback", tone: "amber" as const }
        : { label: "Review carefully", tone: "rose" as const }
    : { label: "No instructor selected", tone: "slate" as const };

  return (
    <Card className="flex min-h-175 flex-col border-muted/60 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <SparklesIcon className="h-4 w-4 text-primary" /> AI Academic Advisor
        </CardTitle>
        <CardDescription>Quick reading of the current instructor feedback.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 pt-0">
        <Card className="border-muted/60 shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Advisor note</p>
                <div className="mt-1 text-lg font-semibold">{balance.label}</div>
              </div>
              <Badge
                variant={balance.tone === "emerald" ? "default" : balance.tone === "amber" ? "secondary" : "destructive"}
                className="rounded-full"
              >
                {instructor ? `${instructor.review_count} reviews` : "No data"}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {instructor
                ? `Average overall rating is ${instructor.average_rating ? instructor.average_rating.toFixed(1) : "—"}. Use the review list to compare course-specific feedback.`
                : "Select an instructor to see an academic summary."}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {instructor ? (
            reviews.slice(0, 3).map((review) => (
              <Card key={review.id} className="border-muted/60 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{review.course?.code ?? "General feedback"}</div>
                      <div className="text-sm text-muted-foreground">
                        {review.course?.title ?? "No course linked"}
                      </div>
                    </div>
                    <Badge variant="outline" className="rounded-full">
                      {review.rating}/5
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <EmptyState
              icon={<Star className="h-5 w-5" />}
              title="No instructor selected"
              description="Choose an instructor to surface review trends and recommendations."
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="border-muted/60 shadow-sm">
      <CardContent className="flex items-center justify-between gap-3 pt-6">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="mt-1 text-2xl font-semibold">{value}</div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-45 flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 p-6 text-center">
      {icon ? <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">{icon}</div> : null}
      <p className="font-medium">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
      <path d="M5 3l.9 2.7L9 6.6l-2.1.7L6.2 10 5.5 7.3 3 6.6l2.5-.9L5 3z" />
      <path d="M19 14l.9 2.7L23 17.6l-2.1.7-.7 2.7-.7-2.7-2.5-.9 2.5-.9.8-2.7z" />
    </svg>
  );
}
