import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/courses")({
  head: () => ({
    meta: [
      { title: "My Courses — AI Academic Copilot" },
      { name: "description", content: "Manage the courses you're enrolled in." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="My Courses"
      description="Track syllabi, materials, and grades for every course."
      icon={BookOpen}
    />
  ),
});
