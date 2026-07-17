import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { PagePlaceholder } from "@/components/page-placeholder";

export const Route = createFileRoute("/registration")({
  head: () => ({
    meta: [
      { title: "Registration Planner — AI Academic Copilot" },
      { name: "description", content: "Plan next term's course registration." },
    ],
  }),
  component: () => (
    <PagePlaceholder
      title="Registration Planner"
      description="Draft schedules, check prerequisites, and plan your term."
      icon={CalendarClock}
    />
  ),
});
