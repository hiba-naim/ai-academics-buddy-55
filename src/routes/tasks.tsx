import { createFileRoute } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — AI Academic Copilot" },
      { name: "description", content: "Assignments, deadlines, and to-dos." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="Tasks"
      description="Stay on top of assignments, exams, and personal to-dos."
      icon={ListChecks}
    />
  ),
});
